import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const ScanQR = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('camera');
  const [cardData, setCardData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'error' });
  const [isLoading, setIsLoading] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const fetchMemberData = async (qrText) => {
    setIsLoading(true);
    try {
      const cleanQR = encodeURIComponent(qrText.trim());
      const response = await fetch(`${API_URL}/api/scan?qr=${cleanQR}`);
      if (!response.ok) {
        throw new Error('Barcoded atau kartu tidak ada');
      }
      const data = await response.json();
      setCardData(data);
      setIsModalOpen(true);
    } catch (err) {
      showCustomAlert('Pemindaian Gagal', 'Barcoded atau kartu tidak ada', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'camera') {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length) {
            setCameras(devices);
            if (!selectedCameraId) {
              const backCamera = devices.find(
                (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('belakang')
              );
              setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
            }
          }
        })
        .catch(() => {
          setCameraError('Gagal mengakses daftar kamera. Pastikan izin diberikan.');
        });
    }
  }, [activeTab]);

  useEffect(() => {
    let scanner;
    let startPromise;
    let isMounted = true;

    if (activeTab === 'camera' && selectedCameraId && !isModalOpen && !isLoading) {
      scanner = new Html5Qrcode("reader-camera");
      
      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      startPromise = scanner.start(
        selectedCameraId,
        config,
        (decodedText) => {
          if (isMounted) {
            if (scanner && startPromise) {
              scanner.stop().catch(() => {});
            }
            fetchMemberData(decodedText);
          }
        },
        () => {}
      ).catch(() => {
        if (isMounted) {
          setCameraError('Kamera gagal dimuat. Pastikan izin diberikan dan menggunakan koneksi aman (HTTPS/Localhost).');
        }
      });
    }
    
    return () => {
      isMounted = false;
      if (scanner && startPromise) {
        startPromise.then(() => {
          scanner.stop().then(() => scanner.clear()).catch(() => {});
        }).catch(() => {});
      }
    };
  }, [activeTab, selectedCameraId, isModalOpen, isLoading]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("reader-file");
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      fetchMemberData(decodedText);
    } catch (err) {
      showCustomAlert('Pemindaian Gagal', 'Barcoded atau kartu tidak ada', 'error');
    }
    
    event.target.value = '';
  };

  const showCustomAlert = (title, message, type) => {
    setCustomAlert({ isOpen: true, title, message, type });
    if (type === 'success') {
      setTimeout(() => {
        setCustomAlert(prev => ({ ...prev, isOpen: false }));
      }, 3000);
    }
  };

  const closeAlert = () => {
    setCustomAlert(prev => ({ ...prev, isOpen: false }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCardData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-4 font-sans relative">
      
      <div className="animate-fade-in-up w-full max-w-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2.5rem] border border-white/50 dark:border-gray-700/50 shadow-2xl overflow-hidden transition-colors relative">
        
        <button 
          onClick={() => onNavigate('landing')}
          className="absolute top-6 left-6 p-3 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-[rgb(var(--theme-600))] hover:bg-blue-50 dark:hover:bg-gray-700 transition-all z-20 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="p-8 pt-12 text-center border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-gradient-to-tr from-[rgb(var(--theme-100))] to-[rgb(var(--theme-200))] dark:from-[rgba(var(--theme-900),0.5)] dark:to-[rgba(var(--theme-800),0.5)] text-[rgb(var(--theme-600))] dark:text-[rgb(var(--theme-400))] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner transform rotate-3">
            <svg className="w-8 h-8 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pemindai Jiaf</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 px-4">Arahkan kamera ke QR kotak, atau unggah gambar dari perangkat Anda.</p>
        </div>

        <div className="flex p-2 bg-gray-50 dark:bg-gray-800/80 mx-8 mt-8 mb-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-inner">
          <button 
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'camera' ? 'bg-white dark:bg-gray-700 text-[rgb(var(--theme-600))] shadow-md transform scale-[1.02]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Kamera
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'bg-white dark:bg-gray-700 text-[rgb(var(--theme-600))] shadow-md transform scale-[1.02]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Unggah
          </button>
        </div>

        <div className="px-8 pb-8 relative">
          
          <div className={`${activeTab === 'camera' ? 'block' : 'hidden'} animate-fade-in`}>
            
            {cameras.length > 0 && (
              <div className="mb-4 relative z-20">
                <select 
                  value={selectedCameraId} 
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full p-3 pl-4 pr-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium focus:ring-2 focus:ring-[rgb(var(--theme-500))] focus:border-transparent outline-none appearance-none transition-all shadow-sm"
                >
                  {cameras.map((camera, index) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || `Kamera ${index + 1}`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            )}

            <div className="relative bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl aspect-square w-full flex items-center justify-center border-[6px] border-gray-100 dark:border-gray-800">
              {cameraError ? (
                <div className="text-center p-6 text-red-400 z-20">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p className="text-sm font-medium">{cameraError}</p>
                </div>
              ) : null}
              
              <div id="reader-camera" className="absolute inset-0 w-full h-full object-cover"></div>
              
              {!cameraError && !isModalOpen && !isLoading && selectedCameraId && (
                <div className="absolute inset-0 border-[32px] border-black/50 z-10 pointer-events-none backdrop-blur-[1px]">
                  <div className="w-full h-full border border-white/20 rounded-xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[rgb(var(--theme-400))] -mt-[2px] -ml-[2px] rounded-tl-xl shadow-[0_0_10px_rgb(var(--theme-400))]"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[rgb(var(--theme-400))] -mt-[2px] -mr-[2px] rounded-tr-xl shadow-[0_0_10px_rgb(var(--theme-400))]"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[rgb(var(--theme-400))] -mb-[2px] -ml-[2px] rounded-bl-xl shadow-[0_0_10px_rgb(var(--theme-400))]"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[rgb(var(--theme-400))] -mb-[2px] -mr-[2px] rounded-br-xl shadow-[0_0_10px_rgb(var(--theme-400))]"></div>
                    <div className="w-full h-0.5 bg-[rgb(var(--theme-400))] shadow-[0_0_15px_rgb(var(--theme-400))] absolute top-1/2 animate-[scan_2.5s_ease-in-out_infinite]"></div>
                  </div>
                </div>
              )}
              
              {isLoading && (
                <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <p className="text-white mt-4 font-medium">Memverifikasi Data...</p>
                </div>
              )}
            </div>
          </div>

          <div className={`${activeTab === 'upload' ? 'block' : 'hidden'} animate-fade-in`}>
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-[2rem] bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer relative group aspect-square w-full">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-[rgb(var(--theme-500))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-gray-900 dark:text-white font-extrabold text-lg text-center">Tarik gambar ke sini</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center">atau klik untuk memilih file</p>
            </div>
          </div>
        </div>
      </div>

      <div id="reader-file" className="hidden"></div>

      {isModalOpen && cardData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md animate-backdrop-fade" onClick={closeModal}></div>
          <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-modal-pop perspective-[1500px]">
            
            <div className="w-full h-56 bg-gradient-to-br from-indigo-600 via-purple-600 to-emerald-500 rounded-2xl p-6 relative overflow-hidden card-3d border border-white/20">
              <div className="absolute inset-0 card-shine"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5"></div>
              
              <div className="relative h-full flex flex-col justify-between z-10 text-white drop-shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">Member Card</p>
                    <p className="text-sm font-mono mt-1 text-white/90">{cardData.nomor}</p>
                    <p className="text-xs font-semibold mt-1 px-2 py-0.5 inline-block bg-white/20 rounded-md uppercase tracking-wider">{cardData.role}</p>
                  </div>
                  <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Nama Anggota</p>
                  <p className="text-xl font-bold uppercase tracking-wide truncate">{cardData.nama}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4 w-full">
              <button 
                onClick={closeModal} 
                className="flex-1 px-4 py-3.5 rounded-xl font-bold text-gray-700 bg-white hover:bg-gray-100 transition-colors shadow-lg"
              >
                Tutup
              </button>
              <button 
                onClick={closeModal} 
                className="flex-1 px-4 py-3.5 rounded-xl font-bold text-white shadow-xl shadow-indigo-500/30 transition-all bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                Scan Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {customAlert.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-backdrop-fade" onClick={closeAlert}></div>
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-2xl z-10 overflow-hidden text-center border border-gray-100 dark:border-gray-800 relative animate-modal-pop">
            
            <div className={`p-6 flex justify-center relative overflow-hidden ${customAlert.type === 'error' ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
              <div className="absolute inset-0 bg-white/20 transform -skew-y-12"></div>
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl relative z-10 animate-bounce-soft">
                {customAlert.type === 'error' ? (
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                )}
              </div>
            </div>

            <div className="p-8">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{customAlert.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">{customAlert.message}</p>
              
              <button 
                onClick={closeAlert} 
                className="w-full px-4 py-3.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0%, 100% { transform: translateY(-100px); }
          50% { transform: translateY(100px); }
        }
        @keyframes modalPop {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes backdropFade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceSoft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float3d {
          0% { transform: translateY(0px) rotateX(15deg) rotateY(-15deg); box-shadow: 15px 15px 30px rgba(0,0,0,0.3); }
          50% { transform: translateY(-20px) rotateX(25deg) rotateY(5deg); box-shadow: 25px 25px 40px rgba(0,0,0,0.2); }
          100% { transform: translateY(0px) rotateX(15deg) rotateY(-15deg); box-shadow: 15px 15px 30px rgba(0,0,0,0.3); }
        }
        @keyframes shine {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .animate-modal-pop {
          animation: modalPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-backdrop-fade {
          animation: backdropFade 0.4s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: backdropFade 0.3s ease-out forwards;
        }
        .animate-bounce-soft {
          animation: bounceSoft 2s ease-in-out infinite;
        }
        .card-3d {
          animation: float3d 5s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        .card-shine {
          background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.3) 25%, transparent 30%);
          background-size: 200% 200%;
          animation: shine 4s linear infinite;
        }
        .perspective-\\[1500px\\] {
          perspective: 1500px;
        }
        #reader-camera video {
          object-fit: cover !important;
          border-radius: 1.5rem !important;
          position: absolute !important;
          top: 0; left: 0; width: 100%; height: 100%;
        }
      `}} />
    </div>
  );
};

export default ScanQR;