// Profile.jsx
import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Profile = ({ onNavigate }) => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
    foto_profil: ''
  });
  const [passwordData, setPasswordData] = useState({
    password_lama: '',
    password_baru: '',
    konfirmasi_password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setFormData({
        nama_lengkap: parsedUser.nama_lengkap || '',
        email: parsedUser.email || '',
        foto_profil: parsedUser.foto_profil || ''
      });
    } else {
      onNavigate('auth');
    }
  }, [onNavigate]);

  const showAlert = (title, message, type = 'success') => {
    setCustomAlert({ isOpen: true, title, message, type });
    if (type === 'success') {
      setTimeout(() => setCustomAlert(prev => ({ ...prev, isOpen: false })), 2500);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showAlert('Format Tidak Sesuai', 'File yang Anda pilih bukan gambar.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, foto_profil: reader.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, foto_profil: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.password_baru && passwordData.password_baru !== passwordData.konfirmasi_password) {
      showAlert('Password Tidak Cocok', 'Konfirmasi password baru tidak sama dengan password baru.', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      const payload = {
        nama_lengkap: formData.nama_lengkap,
        email: formData.email,
        foto_profil: formData.foto_profil
      };

      if (passwordData.password_lama && passwordData.password_baru) {
        payload.password_lama = passwordData.password_lama;
        payload.password_baru = passwordData.password_baru;
      }

      const response = await fetch(`${API_URL}/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        const updatedUser = data.user || { ...user, ...formData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setPasswordData({ password_lama: '', password_baru: '', konfirmasi_password: '' });
        
        window.dispatchEvent(new Event('userUpdated'));
        
        showAlert('Berhasil', 'Profil Anda berhasil diperbarui.', 'success');
      } else {
        showAlert('Gagal Menyimpan', data.error || 'Terjadi kesalahan saat memperbarui profil.', 'error');
      }
    } catch (error) {
      showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const getInitials = (name) => {
    return name ? name.substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <div className="animate-[popIn_0.4s_ease-out] flex flex-col gap-6 font-sans pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Profil Saya</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola informasi pribadi dan pengaturan keamanan akun Anda.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8">
          <div className="flex flex-col xl:flex-row gap-10">
            
            <div className="w-full xl:w-1/3 flex flex-col items-center space-y-6">
              <div className="relative group w-48 h-48 rounded-full border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                {formData.foto_profil ? (
                  <img src={formData.foto_profil} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <span className="text-5xl font-black text-[rgb(var(--theme-600))]">{getInitials(formData.nama_lengkap)}</span>
                )}
                
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                  <label className="bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-lg font-bold text-sm cursor-pointer transition-colors border border-white/50 backdrop-blur-md">
                    Ubah Foto
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {formData.foto_profil && (
                    <button type="button" onClick={removeImage} className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-red-400/50 backdrop-blur-md">
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user.nama_lengkap}</h3>
                <p className="text-[rgb(var(--theme-600))] font-semibold mt-1 capitalize">{user.role_akun === 'user' ? 'Pengguna' : user.role_akun.replace('_', ' ')}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {user.region || 'Semua Wilayah'}
                </div>
              </div>
            </div>

            <div className="w-full xl:w-2/3 space-y-8">
              
              <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-[rgb(var(--theme-600))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Informasi Dasar
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nama Lengkap</label>
                    <input required type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Username <span className="text-xs text-red-500 font-normal ml-1">(Tidak dapat diubah)</span></label>
                    <input disabled type="text" value={user.username} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed outline-none transition-all font-mono" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email Valid</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-[rgb(var(--theme-600))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Keamanan Akun
                </h4>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Password Lama</label>
                  <input type="password" name="password_lama" value={passwordData.password_lama} onChange={handlePasswordChange} placeholder="Masukkan password saat ini jika ingin mengubah password" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Password Baru</label>
                    <input type="password" name="password_baru" value={passwordData.password_baru} onChange={handlePasswordChange} placeholder="Kosongkan jika tidak ingin diubah" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Konfirmasi Password Baru</label>
                    <input type="password" name="konfirmasi_password" value={passwordData.konfirmasi_password} onChange={handlePasswordChange} placeholder="Ulangi password baru" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                  </div>
                </div>
              </div>
              
              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={isLoading} className="px-8 py-3.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white shadow-lg shadow-[rgba(var(--theme-600),0.3)] transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  )}
                  Simpan Perubahan
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>

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

export default Profile;