from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pymysql
import google.generativeai as genai
import os
import uuid
import json
import traceback

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'w3bAdm2025!@#',
    'database': 'ocr_test',
    'cursorclass': pymysql.cursors.DictCursor
}

GOOGLE_API_KEY = "AIzaSyABiWZdS8nFVtAMMJZu7wa23PEZUUWiCWg" 
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

class FinalData(BaseModel):
    comparison_id: str
    final_no_faktur: str
    final_no_invoice: str
    final_customer: str
    final_alamat: str
    final_tanggal: str
    final_dpp: str
    final_ppn: str
    status: str

def get_db_connection():
    return pymysql.connect(**DB_CONFIG)

# FUNGSI BARU: Menyimpan data dari memori (bytes) ke hardisk
def save_bytes_to_disk(filename: str, content_bytes: bytes) -> str:
    file_ext = filename.split('.')[-1]
    safe_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content_bytes)
        
    return f"uploads/{safe_filename}"

@app.post("/api/compare")
async def compare_invoices(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    db = get_db_connection()
    cursor = db.cursor()
    
    try:
        # 1. BACA FILE KE DALAM MEMORI (RAM) TANPA MENYIMPAN KE HARDISK
        file1_bytes = await file1.read()
        file2_bytes = await file2.read()
        
        # 2. SIAPKAN DATA UNTUK DIKIRIM LANGSUNG KE GEMINI (INLINE DATA)
        gemini_file_1 = {
            "mime_type": file1.content_type,
            "data": file1_bytes
        }
        gemini_file_2 = {
            "mime_type": file2.content_type,
            "data": file2_bytes
        }
        
        prompt = """
        Anda adalah seorang auditor pajak.
        Ekstrak data dari Dokumen 1 (Faktur Pajak) dan Dokumen 2 (Invoice).
        INSTRUKSI PENTING:
        1. STANDARISASI TANGGAL: Ubah semua tanggal yang ditemukan menjadi format DD-MM-YYYY secara konsisten (contoh: "05-03-2020").
        2. KEMBALIKAN HANYA JSON VALID: Jangan gunakan awalan markdown ```json atau teks penjelasan apa pun.
        
        Gunakan struktur baku persis seperti ini:
        {
            "doc1": {
                "no_faktur": "nomor faktur pajak di dokumen 1",
                "no_invoice": "nomor invoice jika ada disebut di dokumen 1",
                "customer": "nama customer dokumen 1",
                "alamat": "alamat dokumen 1",
                "tanggal": "tanggal dokumen 1 (wajib DD-MM-YYYY)",
                "dpp": "nominal dpp dokumen 1",
                "ppn": "nominal ppn dokumen 1"
            },
            "doc2": {
                "no_faktur": "nomor faktur pajak jika ada disebut di dokumen 2",
                "no_invoice": "nomor invoice di dokumen 2",
                "customer": "nama customer dokumen 2",
                "alamat": "alamat dokumen 2",
                "tanggal": "tanggal dokumen 2 (wajib DD-MM-YYYY)",
                "dpp": "nominal dpp dokumen 2",
                "ppn": "nominal ppn dokumen 2"
            }
        }
        Jika data tidak ditemukan di dokumen, isi dengan string kosong "".
        """
        
        # 3. PANGGIL AI (Gambar dikirim bersamaan dengan text prompt, jadi sangat cepat!)
        response = model.generate_content([prompt, gemini_file_1, gemini_file_2])
        ai_result_text = response.text.strip()
        
        # Bersihkan format markdown jika ada
        if ai_result_text.startswith("```json"):
            ai_result_text = ai_result_text[7:-3].strip()
        elif ai_result_text.startswith("```"):
            ai_result_text = ai_result_text[3:-3].strip()

        # Uji coba konversi ke JSON (Akan memicu error jika AI gagal merespons dengan benar)
        extracted_json = json.loads(ai_result_text)
        
        # --- JIKA KITA SAMPAI DI BARIS INI, ARTINYA AI BERHASIL 100% ---
        
        # 4. BARULAH KITA SIMPAN FILE FISIK KE SERVER KARENA DATA SUDAH VALID
        path1 = save_bytes_to_disk(file1.filename, file1_bytes)
        path2 = save_bytes_to_disk(file2.filename, file2_bytes)
        
        # 5. SIMPAN KE DATABASE MYSQL
        doc_id_1 = str(uuid.uuid4())
        doc_id_2 = str(uuid.uuid4())
        comp_id = str(uuid.uuid4())
        
        query_doc = """
            INSERT INTO documents (doc_id, file_name, file_path, file_type) 
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(query_doc, (doc_id_1, file1.filename, path1, file1.content_type))
        cursor.execute(query_doc, (doc_id_2, file2.filename, path2, file2.content_type))
        
        query_comp = """
            INSERT INTO comparisons (comparison_id, doc_id_1, doc_id_2, ai_summary, status, is_saved) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query_comp, (comp_id, doc_id_1, doc_id_2, json.dumps(extracted_json), 'Pending', False))
        db.commit()

        return {
            "status": "success",
            "comparison_id": comp_id,
            "extracted_data": extracted_json
        }

    except Exception as e:
        # Jika AI gagal, MySQL batal simpan, dan gambar otomatis terbuang dari RAM!
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        cursor.close()
        db.close()

@app.get("/api/history")
async def get_history():
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute("""
            SELECT comparison_id, final_no_faktur, final_customer, final_tanggal, final_dpp, final_ppn, status 
            FROM comparisons 
            WHERE is_saved = TRUE 
            ORDER BY created_at DESC
        """)
        results = cursor.fetchall()
        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

@app.get("/api/comparison/{comp_id}")
async def get_comparison_detail(comp_id: str):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        query = """
            SELECT c.comparison_id, c.ai_summary, c.status,
                   c.final_no_faktur, c.final_no_invoice, c.final_customer, c.final_alamat, c.final_tanggal, c.final_dpp, c.final_ppn,
                   d1.file_path as path1, d1.file_type as type1,
                   d2.file_path as path2, d2.file_type as type2
            FROM comparisons c
            JOIN documents d1 ON c.doc_id_1 = d1.doc_id
            JOIN documents d2 ON c.doc_id_2 = d2.doc_id
            WHERE c.comparison_id = %s
        """
        cursor.execute(query, (comp_id,))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Data tidak ditemukan")

        ai_summary = result['ai_summary']
        if isinstance(ai_summary, str):
            ai_summary = json.loads(ai_summary)

        url1 = f"/ocr_backend/{result['path1'].replace(chr(92), '/')}"
        url2 = f"/ocr_backend/{result['path2'].replace(chr(92), '/')}"
            
        return {
            "status": "success",
            "data": {
                "comparison_id": result['comparison_id'],
                "audit_status": result['status'],
                "final_data": {
                    "no_faktur": result['final_no_faktur'],
                    "no_invoice": result['final_no_invoice'],
                    "customer": result['final_customer'],
                    "alamat": result['final_alamat'],
                    "tanggal": result['final_tanggal'],
                    "dpp": result['final_dpp'],
                    "ppn": result['final_ppn'],
                },
                "ai_summary": ai_summary,
                "files": { "url1": url1, "type1": result['type1'], "url2": url2, "type2": result['type2'] }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

@app.post("/api/save")
async def save_final_data(data: FinalData):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        query = """
            UPDATE comparisons 
            SET final_no_faktur = %s, final_no_invoice = %s, final_customer = %s, final_alamat = %s, final_tanggal = %s, 
                final_dpp = %s, final_ppn = %s, status = %s, is_saved = TRUE
            WHERE comparison_id = %s
        """
        cursor.execute(query, (
            data.final_no_faktur, data.final_no_invoice, data.final_customer, data.final_alamat, data.final_tanggal, 
            data.final_dpp, data.final_ppn, data.status, data.comparison_id
        ))
        db.commit()
        return {"status": "success", "message": f"Data berhasil disimpan sebagai {data.status}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

@app.delete("/api/comparison/{comp_id}")
async def delete_comparison(comp_id: str):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT doc_id_1, doc_id_2 FROM comparisons WHERE comparison_id = %s", (comp_id,))
        comp_record = cursor.fetchone()
        
        if not comp_record:
            raise HTTPException(status_code=404, detail="Data perbandingan tidak ditemukan")
            
        doc_ids = [comp_record['doc_id_1'], comp_record['doc_id_2']]

        format_strings = ','.join(['%s'] * len(doc_ids))
        cursor.execute(f"SELECT file_path FROM documents WHERE doc_id IN ({format_strings})", tuple(doc_ids))
        docs = cursor.fetchall()
        
        for doc in docs:
            absolute_file_path = os.path.join(BASE_DIR, doc['file_path'])
            if os.path.exists(absolute_file_path):
                os.remove(absolute_file_path)

        cursor.execute("DELETE FROM comparisons WHERE comparison_id = %s", (comp_id,))
        cursor.execute(f"DELETE FROM documents WHERE doc_id IN ({format_strings})", tuple(doc_ids))
        
        db.commit()
        return {"status": "success", "message": "Data dan file fisik berhasil dihapus sepenuhnya"}
        
    except Exception as e:
        db.rollback()
        print("Error Deleting:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()