import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const KelolaLandingPage = ({ role }) => {
  const [activeTab, setActiveTab] = useState('hero');
  const [isLoading, setIsLoading] = useState(true);
  const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  
  const [heroData, setHeroData] = useState({ id: '', title: '', description: '', image_url: '' });
  const [footerData, setFooterData] = useState({ id: '', about_text: '', email: '', phone: '', address: '', copyright: '', Website_link: '', instagram_link: '' });
  const [featuresData, setFeaturesData] = useState([]);
  const [stepSectionsData, setStepSectionsData] = useState([]);

  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [featureForm, setFeatureForm] = useState({ id: null, icon: 'card', title_front: '', desc_front: '', title_back: '', desc_back: '' });

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState({ id: null, title: '' });

  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [stepForm, setStepForm] = useState({ id: null, section_id: null, step_number: 1, title: '', description: '' });

  const fetchLandingData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/landing`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Gagal memuat data');
      const data = await response.json();
      
      if (data.hero) {
        setHeroData({
          id: data.hero.id || '',
          title: data.hero.title || '',
          description: data.hero.description || '',
          image_url: data.hero.image_url || ''
        });
      }
      
      if (data.footer) {
        setFooterData({
          id: data.footer.id || '',
          about_text: data.footer.about_text || '',
          email: data.footer.email || '',
          phone: data.footer.phone || '',
          address: data.footer.address || '',
          copyright: data.footer.copyright || '',
          Website_link: data.footer.Website_link || '',
          instagram_link: data.footer.instagram_link || ''
        });
      }
      
      if (data.features) setFeaturesData(data.features);
      if (data.step_sections) setStepSectionsData(data.step_sections);
      
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLandingData();
  }, []);

  const showAlert = (title, message, type = 'success') => {
    setCustomAlert({ isOpen: true, title, message, type });
    if (type === 'success') {
      setTimeout(() => setCustomAlert(prev => ({ ...prev, isOpen: false })), 2500);
    }
  };

  const requestConfirm = (title, message, onConfirmCallback) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm: onConfirmCallback });
  };

  const handleHeroChange = (e) => setHeroData({ ...heroData, [e.target.name]: e.target.value });
  const handleFooterChange = (e) => setFooterData({ ...footerData, [e.target.name]: e.target.value });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showAlert('Format Tidak Sesuai', 'File yang Anda pilih bukan gambar.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setHeroData(prev => ({ ...prev, image_url: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveHero = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/landing/hero`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heroData)
      });
      if (response.ok) {
        showAlert('Pembaruan Disimpan', 'Header berhasil diperbarui.', 'success');
        fetchLandingData();
      } else {
        showAlert('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan Header.', 'error');
      }
    } catch (error) {
      showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
    }
  };

  const handleSaveFooter = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/landing/footer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(footerData)
      });
      if (response.ok) {
        showAlert('Pembaruan Disimpan', 'Footer berhasil diperbarui.', 'success');
        fetchLandingData();
      } else {
        showAlert('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan Footer.', 'error');
      }
    } catch (error) {
      showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
    }
  };

  const openFeatureModal = (feature = null) => {
    if (feature) {
      setFeatureForm({
        id: feature.id,
        icon: feature.icon || 'card',
        title_front: feature.title_front || '',
        desc_front: feature.desc_front || '',
        title_back: feature.title_back || '',
        desc_back: feature.desc_back || ''
      });
    } else {
      setFeatureForm({ id: null, icon: 'card', title_front: '', desc_front: '', title_back: '', desc_back: '' });
    }
    setIsFeatureModalOpen(true);
  };

  const saveFeature = async (e) => {
    e.preventDefault();
    const isEdit = featureForm.id !== null;
    const url = isEdit ? `${API_URL}/api/landing/features/${featureForm.id}` : `${API_URL}/api/landing/features`;
    try {
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featureForm)
      });
      if (response.ok) {
        setIsFeatureModalOpen(false);
        showAlert('Fitur Disimpan', 'Data fitur berhasil disimpan.', 'success');
        fetchLandingData();
      } else {
        showAlert('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan fitur.', 'error');
      }
    } catch (error) {
      showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
    }
  };

  const deleteFeature = (id) => {
    requestConfirm('Hapus Fitur', 'Apakah Anda yakin ingin menghapus fitur ini? Data yang dihapus tidak dapat dikembalikan.', async () => {
      try {
        const response = await fetch(`${API_URL}/api/landing/features/${id}`, { method: 'DELETE' });
        if (response.ok) {
          showAlert('Fitur Dihapus', 'Data fitur berhasil dihapus.', 'success');
          fetchLandingData();
        }
      } catch (error) {
        showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
      }
    });
  };

  const openSectionModal = (section = null) => {
    if (section) {
      setSectionForm({ id: section.id, title: section.title || '' });
    } else {
      setSectionForm({ id: null, title: '' });
    }
    setIsSectionModalOpen(true);
  };

  const saveSection = async (e) => {
    e.preventDefault();
    const isEdit = sectionForm.id !== null;
    const url = isEdit ? `${API_URL}/api/landing/step-sections/${sectionForm.id}` : `${API_URL}/api/landing/step-sections`;
    try {
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sectionForm.title })
      });
      if (response.ok) {
        setIsSectionModalOpen(false);
        showAlert('Kategori Disimpan', 'Kategori panduan berhasil disimpan.', 'success');
        fetchLandingData();
      }
    } catch (error) {
      showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
    }
  };

  const deleteSection = (id) => {
    requestConfirm('Hapus Kategori', 'Menghapus kategori ini juga akan menghapus semua langkah di dalamnya. Apakah Anda yakin ingin melanjutkan?', async () => {
      try {
        const response = await fetch(`${API_URL}/api/landing/step-sections/${id}`, { method: 'DELETE' });
        if (response.ok) {
          showAlert('Kategori Dihapus', 'Kategori dan langkahnya berhasil dihapus.', 'success');
          fetchLandingData();
        }
      } catch (error) {
        showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
      }
    });
  };

  const openStepModal = (sectionId, step = null) => {
    if (step) {
      setStepForm({
        id: step.id,
        section_id: sectionId,
        step_number: step.step_number || 1,
        title: step.title || '',
        description: step.description || ''
      });
    } else {
      const targetSection = stepSectionsData.find(s => s.id === sectionId);
      const nextNum = targetSection && targetSection.steps ? targetSection.steps.length + 1 : 1;
      setStepForm({ id: null, section_id: sectionId, step_number: nextNum, title: '', description: '' });
    }
    setIsStepModalOpen(true);
  };

  const saveStep = async (e) => {
    e.preventDefault();
    const isEdit = stepForm.id !== null;
    const url = isEdit ? `${API_URL}/api/landing/steps/${stepForm.id}` : `${API_URL}/api/landing/steps`;
    try {
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: parseInt(stepForm.section_id),
          step_number: parseInt(stepForm.step_number),
          title: stepForm.title,
          description: stepForm.description
        })
      });
      if (response.ok) {
        setIsStepModalOpen(false);
        showAlert('Langkah Disimpan', 'Langkah panduan berhasil disimpan.', 'success');
        fetchLandingData();
      }
    } catch (error) {
      showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
    }
  };

  const deleteStep = (id) => {
    requestConfirm('Hapus Langkah', 'Apakah Anda yakin ingin menghapus langkah ini?', async () => {
      try {
        const response = await fetch(`${API_URL}/api/landing/steps/${id}`, { method: 'DELETE' });
        if (response.ok) {
          showAlert('Langkah Dihapus', 'Langkah berhasil dihapus.', 'success');
          fetchLandingData();
        }
      } catch (error) {
        showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
      }
    });
  };

  if (role !== 'superadmin') return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[rgb(var(--theme-600))] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-[popIn_0.4s_ease-out] flex flex-col gap-6 font-sans">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pengaturan Landing Page</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola konten teks, fitur, dan panduan yang tampil pada halaman utama publik.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors overflow-hidden">
        
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-800 scrollbar-hide">
          <button onClick={() => setActiveTab('hero')} className={`px-8 py-5 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'hero' ? 'border-[rgb(var(--theme-600))] text-[rgb(var(--theme-600))] bg-gray-50/50 dark:bg-gray-800/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Bagian Header</button>
          <button onClick={() => setActiveTab('features')} className={`px-8 py-5 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'features' ? 'border-[rgb(var(--theme-600))] text-[rgb(var(--theme-600))] bg-gray-50/50 dark:bg-gray-800/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Fitur Utama</button>
          <button onClick={() => setActiveTab('steps')} className={`px-8 py-5 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'steps' ? 'border-[rgb(var(--theme-600))] text-[rgb(var(--theme-600))] bg-gray-50/50 dark:bg-gray-800/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Panduan Pengguna</button>
          <button onClick={() => setActiveTab('footer')} className={`px-8 py-5 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'footer' ? 'border-[rgb(var(--theme-600))] text-[rgb(var(--theme-600))] bg-gray-50/50 dark:bg-gray-800/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Informasi Footer</button>
        </div>

        <div className="p-8">
          {activeTab === 'hero' && (
            <form onSubmit={handleSaveHero} className="space-y-6 animate-fade-in-up">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Judul Utama (Headline)</label>
                <input required type="text" name="title" value={heroData.title} onChange={handleHeroChange} className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all font-medium text-lg" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Teks Deskripsi</label>
                <textarea required name="description" value={heroData.description} onChange={handleHeroChange} rows="4" className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all resize-none leading-relaxed"></textarea>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Gambar Ilustrasi (URL atau Unggah)</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-4">
                    <input type="text" name="image_url" value={heroData.image_url} onChange={handleHeroChange} placeholder="Masukkan URL gambar..." className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                    <div className="relative group">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className="flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-all text-gray-600 dark:text-gray-400 font-medium">
                        <span>Pilih File dari Perangkat</span>
                      </div>
                    </div>
                  </div>
                  {heroData.image_url && (
                    <div className="w-full md:w-64 h-36 shrink-0 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden relative group bg-gray-100 dark:bg-gray-900">
                      <img src={heroData.image_url} alt="Preview Hero" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => setHeroData({...heroData, image_url: ''})} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-600 transition-colors shadow-lg">Hapus</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="px-8 py-3 rounded-xl font-bold bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white shadow-lg shadow-[rgba(var(--theme-600),0.3)] transition-all">Simpan Header</button>
              </div>
            </form>
          )}

          {activeTab === 'features' && (
            <div className="animate-fade-in-up space-y-6">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Daftar Fitur Kartu</h3>
                </div>
                <button onClick={() => openFeatureModal()} className="px-5 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white shadow-md transition-all">Tambah Fitur</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {featuresData.map((feat, index) => (
                  <div key={feat.id || index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4 mb-6">
                      <div>
                        <span className="text-xs font-bold text-[rgb(var(--theme-600))] uppercase tracking-wider">Sisi Depan</span>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{feat.title_front}</h4>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openFeatureModal(feat)} className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg">Edit</button>
                      <button onClick={() => deleteFeature(feat.id)} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'footer' && (
            <form onSubmit={handleSaveFooter} className="space-y-6 animate-fade-in-up">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Teks Tentang (About)</label>
                <textarea required name="about_text" value={footerData.about_text} onChange={handleFooterChange} rows="3" className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all resize-none"></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Email Kontak</label>
                  <input type="email" name="email" value={footerData.email} onChange={handleFooterChange} className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nomor Telepon</label>
                  <input type="text" name="phone" value={footerData.phone} onChange={handleFooterChange} className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Alamat Kantor</label>
                <input type="text" name="address" value={footerData.address} onChange={handleFooterChange} className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Link Website</label>
                  <input type="text" name="Website_link" value={footerData.Website_link || ''} onChange={handleFooterChange} placeholder="https://Website.com/..." className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Link Instagram</label>
                  <input type="text" name="instagram_link" value={footerData.instagram_link || ''} onChange={handleFooterChange} placeholder="https://instagram.com/..." className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Teks Hak Cipta (Copyright)</label>
                <input type="text" name="copyright" value={footerData.copyright} onChange={handleFooterChange} className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="px-8 py-3 rounded-xl font-bold bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white shadow-lg transition-all">Simpan Footer</button>
              </div>
            </form>
          )}

          {activeTab === 'steps' && (
            <div className="animate-fade-in-up space-y-8">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pengaturan Kategori Panduan</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pisahkan panduan menjadi beberapa kategori Tab</p>
                </div>
                <button onClick={() => openSectionModal()} className="px-5 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white shadow-md transition-all">Tambah Kategori Baru</button>
              </div>

              <div className="space-y-8">
                {stepSectionsData.map((section) => (
                  <div key={section.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                    
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <h4 className="text-xl font-black text-gray-900 dark:text-white">{section.title}</h4>
                      <div className="flex gap-2">
                        <button onClick={() => openStepModal(section.id)} className="px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 rounded-lg">
                          + Tambah Langkah
                        </button>
                        <button onClick={() => openSectionModal(section)} className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 rounded-lg">
                          Edit Judul
                        </button>
                        <button onClick={() => deleteSection(section.id)} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 rounded-lg">
                          Hapus Kategori
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {!section.steps || section.steps.length === 0 ? (
                        <p className="text-center text-gray-400 dark:text-gray-500 py-4">Belum ada langkah di kategori ini.</p>
                      ) : (
                        section.steps.map((step) => (
                          <div key={step.id} className="flex items-center gap-6 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-5">
                            <div className="w-12 h-12 shrink-0 bg-[rgb(var(--theme-100))] dark:bg-[rgba(var(--theme-900),0.3)] text-[rgb(var(--theme-600))] font-black text-xl rounded-full flex items-center justify-center">
                              {step.step_number}
                            </div>
                            <div className="flex-1">
                              <h5 className="text-lg font-bold text-gray-900 dark:text-white">{step.title}</h5>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{step.description}</p>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <button onClick={() => openStepModal(section.id, step)} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 rounded-lg transition-colors">Edit</button>
                              <button onClick={() => deleteStep(step.id)} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 rounded-lg transition-colors">Hapus</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {isFeatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsFeatureModalOpen(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-3xl shadow-2xl z-10 overflow-hidden animate-[popIn_0.3s_ease-out] flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{featureForm.id ? 'Edit Fitur' : 'Tambah Fitur Baru'}</h3>
              <button onClick={() => setIsFeatureModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-8 overflow-y-auto">
              <form id="featureForm" onSubmit={saveFeature} className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                  <h4 className="font-bold text-[rgb(var(--theme-600))]">Sisi Depan (Tampilan Awal)</h4>
                  <input required type="text" placeholder="Judul Sisi Depan" value={featureForm.title_front} onChange={(e) => setFeatureForm({...featureForm, title_front: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:border-[rgb(var(--theme-500))]" />
                  <textarea required placeholder="Deskripsi Sisi Depan" value={featureForm.desc_front} onChange={(e) => setFeatureForm({...featureForm, desc_front: e.target.value})} rows="2" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:border-[rgb(var(--theme-500))] resize-none"></textarea>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                  <h4 className="font-bold text-emerald-500">Sisi Belakang (Setelah di-Hover/Flip)</h4>
                  <input required type="text" placeholder="Judul Sisi Belakang" value={featureForm.title_back} onChange={(e) => setFeatureForm({...featureForm, title_back: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:border-[rgb(var(--theme-500))]" />
                  <textarea required placeholder="Deskripsi Sisi Belakang" value={featureForm.desc_back} onChange={(e) => setFeatureForm({...featureForm, desc_back: e.target.value})} rows="3" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:border-[rgb(var(--theme-500))] resize-none"></textarea>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 shrink-0 flex justify-end gap-3 bg-white dark:bg-gray-900">
              <button type="button" onClick={() => setIsFeatureModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">Batal</button>
              <button form="featureForm" type="submit" className="px-8 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white hover:bg-[rgb(var(--theme-700))]">Simpan Fitur</button>
            </div>
          </div>
        </div>
      )}

      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsSectionModalOpen(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl z-10 overflow-hidden animate-[popIn_0.3s_ease-out]">
            <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{sectionForm.id ? 'Edit Kategori' : 'Tambah Kategori Panduan'}</h3>
              <button onClick={() => setIsSectionModalOpen(false)} className="text-gray-400 hover:text-gray-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={saveSection} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nama Tab/Kategori</label>
                <input required type="text" value={sectionForm.title} onChange={(e) => setSectionForm({...sectionForm, title: e.target.value})} className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 outline-none font-bold text-lg" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsSectionModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">Batal</button>
                <button type="submit" className="px-8 py-3 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white hover:bg-[rgb(var(--theme-700))]">Simpan Kategori</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsStepModalOpen(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-xl shadow-2xl z-10 overflow-hidden animate-[popIn_0.3s_ease-out]">
            <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{stepForm.id ? 'Edit Langkah' : 'Tambah Langkah Baru'}</h3>
              <button onClick={() => setIsStepModalOpen(false)} className="text-gray-400 hover:text-gray-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={saveStep} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Urutan Langkah Ke-</label>
                <input required type="number" min="1" value={stepForm.step_number} onChange={(e) => setStepForm({...stepForm, step_number: parseInt(e.target.value)})} className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 outline-none font-bold text-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Deskripsi Singkat</label>
                <input required type="text" value={stepForm.title} onChange={(e) => setStepForm({...stepForm, title: e.target.value})} className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 outline-none font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Deskripsi Detail</label>
                <textarea value={stepForm.description || ''} onChange={(e) => setStepForm({...stepForm, description: e.target.value})} rows="3" className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 outline-none resize-none"></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsStepModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">Batal</button>
                <button type="submit" className="px-8 py-3 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white hover:bg-[rgb(var(--theme-700))]">Simpan Langkah</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}></div>
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-2xl z-10 overflow-hidden text-center animate-[popIn_0.2s_ease-out]">
            <div className="p-6 flex justify-center relative bg-gradient-to-br from-red-400 to-red-600">
              <div className="absolute inset-0 bg-white/20 transform -skew-y-12"></div>
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl relative z-10">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Batal</button>
                <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ ...confirmDialog, isOpen: false }); }} className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">Lanjutkan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {customAlert.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setCustomAlert(prev => ({...prev, isOpen: false}))}></div>
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-2xl z-10 overflow-hidden text-center animate-[popIn_0.2s_ease-out]">
            <div className={`p-6 flex justify-center relative ${customAlert.type === 'error' ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
              <div className="absolute inset-0 bg-white/20 transform -skew-y-12"></div>
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl relative z-10">
                {customAlert.type === 'error' ? (
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
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

export default KelolaLandingPage;