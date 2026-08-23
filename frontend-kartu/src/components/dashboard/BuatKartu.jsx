import { useState, useRef, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const CardPreview = ({ isFlipped, onFlip, bgImage, region, nik, namaLengkap, fotoProfil, signature }) => {
  const displayBg = getImageUrl(bgImage) || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80';
  const displayNik = nik ? nik.replace('JIAF-', '').replace(/(.{4})/g, '$1 ').trim() : '0000 0000 0000 0000';
  const displayNama = namaLengkap || 'NAMA LENGKAP';
  const displayRegion = region || 'NASIONAL';
  const displayQrData = `JIAF-${nik ? nik.replace('JIAF-', '') : 'EMPTY'}`;
  const displayTtd = getImageUrl(signature);
  const displayProfile = getImageUrl(fotoProfil);

  return (
    <div className="relative w-full max-w-[450px] aspect-[1.586/1] perspective-[1500px] group cursor-pointer mx-auto" onClick={onFlip}>
      <div className={`relative w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.4,0.0,0.2,1)] [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>

        <div className="absolute inset-0 w-full h-full rounded-[1.5rem] shadow-xl overflow-hidden [backface-visibility:hidden] border border-white/20">
          <img src={displayBg} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0" />
          <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/90 via-gray-900/40 to-transparent z-10"></div>

          <div className="relative z-20 w-full h-full p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h1 className="text-white font-black tracking-widest text-xl drop-shadow-md">JIAF</h1>
              </div>
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-bold text-xs tracking-widest uppercase border border-white/20 shadow-sm">{displayRegion}</span>
            </div>

            <div className="flex gap-5 items-end">
              <div className="w-24 h-28 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-inner flex items-center justify-center overflow-hidden">
                {displayProfile ? (
                  <img src={displayProfile} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                )}
              </div>

              <div className="flex-1 pb-1">
                <p className="text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">Nomor Induk Anggota</p>
                <p className="text-white font-mono text-xl tracking-[0.15em] drop-shadow-md mb-3">{displayNik}</p>

                <p className="text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">Nama Lengkap</p>
                <p className="text-white font-black text-lg drop-shadow-md uppercase truncate tracking-wide">{displayNama}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 w-full h-full rounded-[1.5rem] shadow-xl overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-gray-50 to-gray-200 border border-gray-300">
          <div className="w-full h-12 bg-gray-900 mt-6 shadow-md"></div>
          <div className="p-6 flex gap-6 h-[calc(100%-4rem)]">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Ketentuan Penggunaan</h4>
                <p className="text-[9px] text-gray-600 leading-relaxed text-justify">
                  1. Kartu ini adalah properti resmi JIAF Digital.<br/>
                  2. Tidak dapat dipindahtangankan kepada pihak lain.<br/>
                  3. Harap dikembalikan kepada manajemen jika ditemukan atau masa berlaku habis.
                </p>
              </div>
              {displayTtd && (
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Tanda Tangan Resmi</p>
                  <div className="bg-white/50 rounded p-1 inline-block">
                    <img src={displayTtd} alt="TTD" className="h-8 object-contain mix-blend-multiply" />
                  </div>
                </div>
              )}
            </div>

            <div className="w-28 flex flex-col items-center justify-center shrink-0">
              <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${displayQrData}&margin=0`} alt="QR" className="w-full aspect-square" />
              </div>
              <p className="text-[8px] text-gray-500 mt-2 font-bold uppercase tracking-widest text-center">Scan QR Code</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const BuatKartu = ({ role, adminRegion, permissions = {} }) => {
  const [fetchedMenuAccess, setFetchedMenuAccess] = useState(null);

  let activeRole = role;
  let currentRegion = adminRegion;
  
  if (!activeRole || activeRole === 'undefined') {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        activeRole = parsedUser.role_akun || parsedUser.role;
        if (!currentRegion) {
          currentRegion = parsedUser.region || parsedUser.regional_id || parsedUser.region_id || '';
        }
      }
    } catch (e) {}
  }

  const isSuperAdmin = activeRole === 'superadmin';
  const isUser = activeRole === 'user';
  const parseBool = (val) => val === true || val === 1 || val === '1' || val === 'true';

  let activePerms = [];
  if (Array.isArray(permissions)) {
    activePerms = permissions;
  } else if (permissions?.buat_kartu?.permissions) {
    activePerms = permissions.buat_kartu.permissions;
  } else if (permissions?.permissions) {
    activePerms = permissions.permissions;
  } else if (fetchedMenuAccess) {
    activePerms = fetchedMenuAccess;
  }

  // LOGIKA BARU: Mengecek hak akses SECARA SPESIFIK per region (untuk CRUD sesuai centang)
  const checkCardPerms = (targetRegion) => {
    if (isSuperAdmin) return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
    if (isUser) return { canRead: true, canCreate: false, canUpdate: true, canDelete: false };

    let perms = { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
    
    // Apakah region target ini berbeda dari region admin? (Lintas wilayah)
    const isCross = (targetRegion && currentRegion && targetRegion.toLowerCase() !== currentRegion.toLowerCase());

    activePerms.forEach(p => {
      const isCrossRow = parseBool(p.can_view_cross_region);
      let allowed = [];
      try {
        allowed = typeof p.allowed_cross_regions === 'string' ? JSON.parse(p.allowed_cross_regions) : (p.allowed_cross_regions || []);
      } catch(e) {}

      if (!isCross) {
        // Aturan untuk wilayah SENDIRI (isCrossRow = false ATAU "Semua" diizinkan)
        if (!isCrossRow || allowed.includes('Semua')) {
          if (parseBool(p.can_read)) perms.canRead = true;
          if (parseBool(p.can_create)) perms.canCreate = true;
          if (parseBool(p.can_update)) perms.canUpdate = true;
          if (parseBool(p.can_delete)) perms.canDelete = true;
        }
      } else {
        // Aturan untuk LINTAS WILAYAH (isCrossRow = true DAN region target dicentang)
        if (isCrossRow && (allowed.includes('Semua') || allowed.includes(targetRegion))) {
          if (parseBool(p.can_read)) perms.canRead = true;
          if (parseBool(p.can_create)) perms.canCreate = true;
          if (parseBool(p.can_update)) perms.canUpdate = true;
          if (parseBool(p.can_delete)) perms.canDelete = true;
        }
      }
    });

    return perms;
  };

  // Flag Utama untuk UI
  let globalCanRead = isSuperAdmin || isUser;
  let globalCanCreate = isSuperAdmin;
  let globalCanUpdate = isSuperAdmin || isUser;
  let globalCanDelete = isSuperAdmin;
  let tempCanCrossRegion = isSuperAdmin;
  let computedCrossRegions = [];

  if (!isSuperAdmin && !isUser) {
    activePerms.forEach(p => {
      if (!p) return;
      if (parseBool(p.can_read)) globalCanRead = true;
      if (parseBool(p.can_create)) globalCanCreate = true;
      if (parseBool(p.can_update)) globalCanUpdate = true;
      if (parseBool(p.can_delete)) globalCanDelete = true;
      
      if (parseBool(p.can_view_cross_region)) {
        tempCanCrossRegion = true;
        try {
          const parsed = typeof p.allowed_cross_regions === 'string' ? JSON.parse(p.allowed_cross_regions) : (p.allowed_cross_regions || []);
          if (Array.isArray(parsed)) {
            computedCrossRegions = [...new Set([...computedCrossRegions, ...parsed])];
          }
        } catch (e) {}
      }
    });
  }

  const [currentUserId, setCurrentUserId] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [cards, setCards] = useState([]);
  const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    user_id: '',
    nik: '',
    nama_lengkap: '',
    region: '',
    foto_profil: '',
    template_id: ''
  });

  const defaultBg = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80';
  const [bgImage, setBgImage] = useState('');
  const [signature, setSignature] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTab, setActiveTab] = useState(globalCanRead ? 'list' : (globalCanCreate ? 'create' : ''));
  const [flippedCards, setFlippedCards] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isLoading) {
      if (globalCanRead && activeTab === '') {
        setActiveTab('list');
      } else if (!globalCanRead && globalCanCreate && activeTab === 'list') {
        setActiveTab('create');
      }
    }
  }, [globalCanRead, globalCanCreate, isLoading]);

  const generateNIK = () => {
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  };

  const showAlert = (title, message, type = 'success') => {
    setCustomAlert({ isOpen: true, title, message, type });
    if (type === 'success') {
      setTimeout(() => setCustomAlert(prev => ({ ...prev, isOpen: false })), 2500);
    }
  };

  const triggerConfirm = (title, message, type, onConfirm) => {
    setConfirmDialog({ isOpen: true, title, message, type, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });
  };

  const handleConfirmAction = async () => {
    if (confirmDialog.onConfirm) {
      const action = confirmDialog.onConfirm;
      closeConfirm(); 
      await action();
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData(prev => ({ ...prev, user_id: isUser ? currentUserId : '', nik: generateNIK(), template_id: '' }));
    setBgImage('');
    clearSignature();
  };

  const cancelEdit = () => {
    resetForm();
    if (globalCanRead) setActiveTab('list');
  };

  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      setIsLoading(true);
      try {
        let userId = currentUserId;
        if (!userId) {
          const stored = localStorage.getItem('user');
          if (stored) {
            const parsed = JSON.parse(stored);
            userId = parsed.id;
            setCurrentUserId(userId);
          }
        }

        // Jika hak akses dari props null (refresh page), fetch sendiri ke database
        let currentPerms = [...activePerms];
        if (currentPerms.length === 0 && activeRole === 'admin_regional') {
          try {
            const permRes = await fetch(`${API_URL}/api/menus/user-access?role=${activeRole}&regional_id=${encodeURIComponent(currentRegion || '')}`);
            if (permRes.ok) {
              const data = await permRes.json();
              if (data && data['buat_kartu']) {
                currentPerms = data['buat_kartu'].permissions || [];
                if (isMounted) setFetchedMenuAccess(currentPerms);
              }
            }
          } catch (e) {}
        }

        // Kalkulasi ulang Cross Region dari permission yang didapat
        let dynCrossRegion = isSuperAdmin;
        let dynComputedCross = [];
        if (!isSuperAdmin && !isUser) {
          currentPerms.forEach(p => {
            if (parseBool(p.can_view_cross_region)) {
              dynCrossRegion = true;
              try {
                const parsed = typeof p.allowed_cross_regions === 'string' ? JSON.parse(p.allowed_cross_regions) : (p.allowed_cross_regions || []);
                if (Array.isArray(parsed)) {
                  dynComputedCross = [...new Set([...dynComputedCross, ...parsed])];
                }
              } catch (e) {}
            }
          });
        }

        const promises = [];
        let crossRegions = dynCrossRegion ? dynComputedCross : [];

        let cardsUrl = `${API_URL}/api/cards?role=${activeRole}&user_id=${userId}&region_id=${encodeURIComponent(currentRegion || '')}`;
        if (crossRegions.length > 0) {
          crossRegions.forEach(cr => {
            if (cr) cardsUrl += `&cross_regions[]=${encodeURIComponent(cr)}`;
          });
        }
        promises.push(fetch(cardsUrl).then(res => res.ok ? res.json() : []).then(data => {
            if (isMounted) setCards(data || []);
        }).catch(() => {}));

        if (activeRole !== 'user') {
          let usersUrl = `${API_URL}/api/cards/eligible-users?role=${activeRole}&region_id=${encodeURIComponent(currentRegion || '')}`;
          if (crossRegions.length > 0) {
            crossRegions.forEach(cr => {
              if (cr) usersUrl += `&cross_regions[]=${encodeURIComponent(cr)}`;
            });
          }
          promises.push(fetch(usersUrl).then(res => res.ok ? res.json() : []).then(data => {
              if (isMounted) setUsersList(data || []);
          }).catch(() => {}));
        }

        promises.push(fetch(`${API_URL}/api/cards/templates`).then(res => res.ok ? res.json() : []).then(data => {
            if (isMounted) setTemplates(data || []);
        }).catch(() => {}));

        await Promise.all(promises);

      } catch (error) {
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (activeRole && activeRole !== 'undefined') {
      initializeData();
    }

    return () => { isMounted = false; };
  }, [activeRole, adminRegion, currentUserId, JSON.stringify(permissions || {})]);

  useEffect(() => {
    if (!isLoading && (activeTab === 'create' || activeRole === 'user')) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, [activeTab, activeRole, isLoading, editId]);

  const isEditingOwnCard = editId && formData.user_id == currentUserId;
  let showBackgroundEdit = false;
  let showSignatureEdit = false;

  if (!editId) {
    if (isSuperAdmin) {
      showBackgroundEdit = true;
      showSignatureEdit = true;
    } else if (activeRole === 'admin_regional') {
      showBackgroundEdit = true;
      showSignatureEdit = false; 
    } else if (isUser) {
      showBackgroundEdit = false;
      showSignatureEdit = true;
    }
  } else {
    if (isSuperAdmin) {
      showBackgroundEdit = true;
      showSignatureEdit = true;
    } else if (activeRole === 'admin_regional') {
      if (isEditingOwnCard) {
        showBackgroundEdit = true;
        showSignatureEdit = true;
      } else {
        // Cek permission per kartu (Apakah kartu ini boleh diedit oleh admin?)
        const cardPerms = checkCardPerms(formData.region);
        if (cardPerms.canUpdate) {
          showBackgroundEdit = true;
          showSignatureEdit = false;
        }
      }
    } else if (isUser) {
      showBackgroundEdit = false;
      showSignatureEdit = true;
    }
  }

  const handleUserSelect = (e) => {
    const selectedId = parseInt(e.target.value);
    const user = usersList.find(u => u.id === selectedId);
    if (user) {
      setFormData(prev => ({
        ...prev,
        user_id: user.id,
        nik: generateNIK(),
        nama_lengkap: user.nama_lengkap || user.username,
        region: user.region || 'Nasional',
        foto_profil: user.foto_profil || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, user_id: '', nik: '', nama_lengkap: '', region: '', foto_profil: '' }));
    }
  };

  const handleTemplateSelect = (e) => {
    const templateId = e.target.value;
    setFormData(prev => ({ ...prev, template_id: templateId }));

    if (templateId) {
      const selected = templates.find(t => t.id === parseInt(templateId));
      if (selected) setBgImage(selected.file_background);
    } else {
      setBgImage('');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBgImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (r > 200 && g > 200 && b > 200) {
            data[i + 3] = 0; 
          } else {
            data[i] = 0; 
            data[i + 1] = 0;
            data[i + 2] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        const processedUrl = canvas.toDataURL('image/png');
        setSignature(processedUrl);

        if (canvasRef.current) {
          const vCtx = canvasRef.current.getContext('2d');
          vCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          const dImg = new Image();
          dImg.onload = () => {
            vCtx.drawImage(dImg, 0, 0, canvasRef.current.width, canvasRef.current.height);
          };
          dImg.src = processedUrl;
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignature(canvas.toDataURL('image/png'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id) {
      showAlert('Peringatan', 'Pilih pengguna terlebih dahulu.', 'warning');
      return;
    }

    const payload = {
      ...formData,
      user_id: parseInt(formData.user_id),
      kode_qr: `JIAF-${formData.nik}`
    };

    if (showBackgroundEdit) {
      payload.template_id = formData.template_id ? parseInt(formData.template_id) : null;
      payload.file_background = bgImage || '';
    }
    if (showSignatureEdit) {
      payload.file_ttd = signature || '';
    }

    const url = editId ? `${API_URL}/api/cards/${editId}` : `${API_URL}/api/cards/create`;
    const method = editId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        showAlert('Berhasil', editId ? 'Kartu berhasil diperbarui.' : 'Kartu anggota telah diterbitkan.', 'success');
        clearSignature();

        const cardsRes = await fetch(`${API_URL}/api/cards?role=${activeRole}&user_id=${currentUserId}&region_id=${encodeURIComponent(currentRegion || '')}`);
        if (cardsRes.ok) {
          const cardsData = await cardsRes.json();
          setCards(cardsData || []);
        }

        if (globalCanRead && activeRole !== 'user') {
          setActiveTab('list');
          resetForm();
        } else if (activeRole === 'user') {
          setActiveTab('list');
        }
      } else {
        const errData = await response.json();
        showAlert('Gagal', errData.error || 'Periksa kembali data Anda.', 'error');
      }
    } catch (error) {
      showAlert('Error', 'Terjadi kesalahan pada server.', 'error');
    }
  };

  const handleEditCard = (card) => {
    setEditId(card.id);
    setFormData({
      user_id: card.user_id,
      nik: card.kode_qr.replace('JIAF-', ''),
      nama_lengkap: card.nama_lengkap,
      region: card.region,
      foto_profil: card.foto_profil,
      template_id: card.template_id || ''
    });
    setBgImage(card.custom_bg || card.template_bg || '');
    setSignature(card.file_ttd || '');
    setActiveTab('create');
    window.scrollTo(0, 0);
  };

  const handleDeleteCard = (id) => {
    triggerConfirm('Hapus Kartu', 'Yakin ingin menghapus kartu ini? Data tidak dapat dikembalikan.', 'danger', async () => {
      try {
        const response = await fetch(`${API_URL}/api/cards/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setCards(prev => prev.filter(c => c.id !== id));
          showAlert('Berhasil', 'Kartu telah dihapus.', 'success');
        }
      } catch (error) {}
    });
  };

  const handleToggleCardStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'aktif' ? 'tidak_aktif' : 'aktif';
    const actionType = newStatus === 'aktif' ? 'success' : 'warning';

    triggerConfirm('Ubah Status Kartu', `Ubah status kartu menjadi ${newStatus === 'aktif' ? 'Aktif' : 'Tidak Aktif'}?`, actionType, async () => {
      try {
        const response = await fetch(`${API_URL}/api/cards/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
          setCards(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
          showAlert('Berhasil', 'Status kartu berhasil diperbarui.', 'success');
        }
      } catch (error) {}
    });
  };

  const toggleCardFlip = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!activeRole || activeRole === 'undefined') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[rgb(var(--theme-600))] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Hanya izinkan form buat kartu untuk pengguna dari region yang memang punya izin Create
  const availableUsersForCreation = usersList.filter(u => checkCardPerms(u.region || 'Nasional').canCreate);

  return (
    <div className="animate-[popIn_0.4s_ease-out] font-sans pb-10 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Manajemen Kartu</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola dan terbitkan kartu anggota digital.</p>
        </div>
      </div>

      {(globalCanRead || globalCanCreate) && (
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-8">
          {globalCanRead && (
            <button onClick={() => { resetForm(); setActiveTab('list'); }} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'list' ? 'border-[rgb(var(--theme-600))] text-[rgb(var(--theme-600))]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              {activeRole === 'user' ? 'Kartu Saya' : 'Daftar Kartu'}
            </button>
          )}
          {globalCanCreate && (
            <button onClick={() => { resetForm(); setActiveTab('create'); }} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'create' ? 'border-[rgb(var(--theme-600))] text-[rgb(var(--theme-600))]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              Buat Kartu Baru
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[rgb(var(--theme-600))] rounded-full animate-spin"></div>
        </div>
      ) : (!globalCanRead && !globalCanCreate && !globalCanUpdate && !globalCanDelete) ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px]">
          <svg className="w-16 h-16 text-red-300 dark:text-red-900/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Ditolak</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">Anda tidak memiliki izin untuk melihat modul ini.</p>
        </div>
      ) : activeTab === 'list' && globalCanRead ? (
        activeRole === 'user' && cards.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Kartu Anggota Anda</h2>
            <CardPreview 
              isFlipped={isFlipped} 
              onFlip={() => setIsFlipped(!isFlipped)}
              bgImage={cards[0].template_bg || cards[0].custom_bg || cards[0].file_background || defaultBg} 
              region={cards[0].region} 
              nik={cards[0].kode_qr} 
              namaLengkap={cards[0].nama_lengkap} 
              fotoProfil={cards[0].foto_profil} 
              signature={cards[0].file_ttd} 
            />
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-8 text-center max-w-xs font-medium">Render 3D Aktif. Klik area kartu untuk membalik visualisasi.</p>
            {globalCanUpdate && (
              <button onClick={() => handleEditCard(cards[0])} className="mt-8 px-8 py-3 bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white font-bold rounded-xl shadow-md transition-colors">
                Beri Tanda Tangan / Edit Kartu
              </button>
            )}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px]">
            <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Daftar Kartu Kosong</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">Belum ada kartu yang diterbitkan.</p>
            {globalCanCreate && (
              <button onClick={() => { resetForm(); setActiveTab('create'); }} className="mt-6 px-6 py-2.5 bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white font-bold rounded-xl shadow-md transition-colors">Terbitkan Kartu Pertama</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-8">
            {cards.map(card => {
              // Cek hak akses SECARA SPESIFIK untuk wilayah kartu ini
              const cardPerms = checkCardPerms(card.region);

              return (
                <div key={card.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm flex flex-col items-center gap-4 transition-all hover:shadow-md">
                  <div className="w-full flex justify-between items-center mb-2 px-2">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${card.status === 'aktif' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'}`}>
                      {card.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                    <div className="flex gap-2">
                      {cardPerms.canUpdate && (
                        <button onClick={() => handleEditCard(card)} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors" title="Edit Kartu">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {cardPerms.canUpdate && activeRole !== 'user' && (
                        <button onClick={() => handleToggleCardStatus(card.id, card.status)} className="p-2 text-amber-500 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors" title="Ubah Status">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      )}
                      {cardPerms.canDelete && (
                        <button onClick={() => handleDeleteCard(card.id)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors" title="Hapus Kartu">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <CardPreview 
                    isFlipped={flippedCards[card.id] || false} 
                    onFlip={() => toggleCardFlip(card.id)}
                    bgImage={card.template_bg || card.custom_bg || card.file_background} 
                    region={card.region} 
                    nik={card.kode_qr} 
                    namaLengkap={card.nama_lengkap} 
                    fotoProfil={card.foto_profil} 
                    signature={card.file_ttd} 
                  />

                  <p className="text-xs text-gray-400 font-medium w-full text-center mt-2">
                    Diterbitkan pada {new Date(card.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              );
            })}
          </div>
        )
      ) : (activeTab === 'create' || editId) && (globalCanCreate || globalCanUpdate) ? (
        <div className="flex flex-col xl:flex-row gap-8">
          <div className="w-full xl:w-5/12">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {activeRole === 'user' ? 'Konfirmasi Tanda Tangan' : editId ? 'Perbarui Data Kartu' : 'Formulir Pembuatan'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {activeRole !== 'user' && !editId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Pengguna</label>
                    <select onChange={handleUserSelect} value={formData.user_id} className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all">
                      <option value="">-- Pilih Pengguna --</option>
                      {availableUsersForCreation.length === 0 && <option value="" disabled>-- Anda Tidak Punya Akses Tambah di Wilayah Manapun --</option>}
                      {availableUsersForCreation.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nama_lengkap || u.username} - {u.region || 'Nasional'} ({u.role_akun || u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pengguna (Edit)</label>
                    <input type="text" value={formData.nama_lengkap} readOnly className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed font-bold" />
                  </div>
                )}

                {!editId && activeRole === 'user' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                    <input type="text" value={formData.nama_lengkap} readOnly className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed font-bold" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor Induk / NIK</label>
                    <input type="text" value={formData.nik} readOnly className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wilayah / Region</label>
                    <input type="text" value={formData.region} readOnly className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed" />
                  </div>
                </div>

                {!editId && activeRole !== 'user' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                    <input type="text" value={formData.nama_lengkap} readOnly className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed font-bold" />
                  </div>
                )}

                {showBackgroundEdit && (
                  <>
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Template Sistem</label>
                      <select onChange={handleTemplateSelect} value={formData.template_id} className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all">
                        <option value="">Gunakan Background Kustom</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.nama_template}</option>
                        ))}
                      </select>
                    </div>

                    {!formData.template_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Background Kustom</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white" />
                      </div>
                    )}
                  </>
                )}

                {showSignatureEdit && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanda Tangan Digital</label>
                      <label className="text-xs text-[rgb(var(--theme-600))] cursor-pointer font-bold hover:underline">
                        Upload Gambar TTD
                        <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                      </label>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white relative">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        className="w-full h-[150px] cursor-crosshair touch-none"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={clearSignature} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Hapus TTD</button>
                      <button type="button" onClick={saveSignature} className="px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">Kunci Tanda Tangan</button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  {editId && (
                    <button type="button" onClick={cancelEdit} className="w-1/3 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all active:scale-[0.98]">
                      Batal
                    </button>
                  )}
                  <button type="submit" disabled={!formData.user_id} className={`${editId ? 'w-2/3' : 'w-full'} bg-[rgb(var(--theme-600))] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[rgba(var(--theme-600),0.3)] hover:bg-[rgb(var(--theme-700))] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}>
                    {editId ? 'Perbarui Kartu' : 'Simpan & Terbitkan Kartu'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="w-full xl:w-7/12 flex flex-col items-center">
            <div className="mb-8 flex gap-3 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-full border border-gray-200 dark:border-gray-800">
              <button type="button" onClick={() => setIsFlipped(false)} className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${!isFlipped ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Tampak Depan</button>
              <button type="button" onClick={() => setIsFlipped(true)} className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${isFlipped ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Tampak Belakang</button>
            </div>

            <CardPreview 
              isFlipped={isFlipped} 
              onFlip={() => setIsFlipped(!isFlipped)}
              bgImage={bgImage || defaultBg} 
              region={formData.region} 
              nik={formData.nik} 
              namaLengkap={formData.nama_lengkap} 
              fotoProfil={formData.foto_profil} 
              signature={signature} 
            />

            <p className="text-gray-400 dark:text-gray-500 text-xs mt-8 text-center max-w-xs font-medium">Render 3D Aktif. Klik area kartu untuk membalik visualisasi.</p>
          </div>
        </div>
      ) : null}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={closeConfirm}></div>
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-2xl z-10 overflow-hidden text-center animate-[popIn_0.2s_ease-out] p-8">
            <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${confirmDialog.type === 'danger' ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : confirmDialog.type === 'success' ? 'bg-emerald-100 text-emerald-500 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-500 dark:bg-amber-900/30'}`}>
              {confirmDialog.type === 'danger' ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              ) : confirmDialog.type === 'success' ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{confirmDialog.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={closeConfirm} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
              <button onClick={handleConfirmAction} className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${confirmDialog.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : confirmDialog.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'}`}>Konfirmasi</button>
            </div>
          </div>
        </div>
      )}

      {customAlert.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setCustomAlert(prev => ({...prev, isOpen: false}))}></div>
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-2xl z-10 overflow-hidden text-center animate-[popIn_0.2s_ease-out]">
            <div className={`p-6 flex justify-center relative ${customAlert.type === 'error' ? 'bg-gradient-to-br from-red-400 to-red-600' : customAlert.type === 'success' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'}`}>
              <div className="absolute inset-0 bg-white/20 transform -skew-y-12"></div>
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl relative z-10">
                {customAlert.type === 'error' ? (
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : customAlert.type === 'success' ? (
                  <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                )}
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{customAlert.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{customAlert.message}</p>
              <button onClick={() => setCustomAlert(prev => ({...prev, isOpen: false}))} className="w-full px-4 py-3.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BuatKartu;