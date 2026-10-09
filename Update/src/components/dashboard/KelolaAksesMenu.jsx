import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const KelolaAksesMenu = ({ role }) => {
  const [menus, setMenus] = useState([]);
  const [regionals, setRegionals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [menuPermissions, setMenuPermissions] = useState([]);
  const [openCrossDropdownIndex, setOpenCrossDropdownIndex] = useState(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [menusRes, regionalsRes] = await Promise.all([
        fetch(`${API_URL}/api/menus`, { cache: 'no-store' }),
        fetch(`${API_URL}/api/regionals`, { cache: 'no-store' })
      ]);

      if (menusRes.ok) {
        const menusData = await menusRes.json();
        setMenus(menusData);
      }
      
      if (regionalsRes.ok) {
        const regionalsData = await regionalsRes.json();
        setRegionals(regionalsData);
      }
    } catch (error) {
      showAlert('Koneksi Error', 'Gagal memuat data dari server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showAlert = (title, message, type = 'success') => {
    setCustomAlert({ isOpen: true, title, message, type });
    if (type === 'success') {
      setTimeout(() => setCustomAlert(prev => ({ ...prev, isOpen: false })), 2500);
    }
  };

  const openPermissionModal = async (menu) => {
    setSelectedMenu({ ...menu });
    setIsLoading(true);
    setOpenCrossDropdownIndex(null);
    try {
      const response = await fetch(`${API_URL}/api/menus/${menu.id}/permissions`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const formattedData = (data || []).map(p => ({
          ...p,
          allowed_cross_regions: p.allowed_cross_regions ? JSON.parse(p.allowed_cross_regions) : []
        }));
        setMenuPermissions(formattedData);
      } else {
        setMenuPermissions([]);
      }
    } catch (error) {
      setMenuPermissions([]);
      showAlert('Koneksi Error', 'Gagal memuat hak akses menu.', 'error');
    } finally {
      setIsLoading(false);
      setIsModalOpen(true);
    }
  };

  const closePermissionModal = () => {
    setIsModalOpen(false);
    setSelectedMenu(null);
    setMenuPermissions([]);
    setOpenCrossDropdownIndex(null);
  };

  const handleMenuChange = (field, value) => {
    setSelectedMenu(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (index, field, value) => {
    const updated = [...menuPermissions];
    updated[index] = { ...updated[index], [field]: value };
    setMenuPermissions(updated);
  };

  const handleCrossRegionToggle = (index, regionName) => {
    const current = [...(menuPermissions[index].allowed_cross_regions || [])];
    if (regionName === 'Semua') {
      if (current.includes('Semua')) {
        handlePermissionChange(index, 'allowed_cross_regions', []);
      } else {
        handlePermissionChange(index, 'allowed_cross_regions', ['Semua']);
      }
    } else {
      let updated;
      if (current.includes(regionName)) {
        updated = current.filter(r => r !== regionName);
      } else {
        updated = [...current.filter(r => r !== 'Semua'), regionName];
      }
      handlePermissionChange(index, 'allowed_cross_regions', updated);
    }
  };

  const addPermissionRow = () => {
    setMenuPermissions([
      ...menuPermissions,
      {
        role_name: 'admin_regional',
        regional_id: '',
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
        can_view_cross_region: false,
        allowed_cross_regions: []
      }
    ]);
  };

  const removePermissionRow = (index) => {
    const updated = menuPermissions.filter((_, i) => i !== index);
    setMenuPermissions(updated);
    if (openCrossDropdownIndex === index) setOpenCrossDropdownIndex(null);
  };

  const savePermissions = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        requires_login: selectedMenu.requires_login,
        permissions: menuPermissions.map(p => ({
          role_name: p.role_name,
          regional_id: p.regional_id ? parseInt(p.regional_id) : null,
          can_read: Boolean(p.can_read),
          can_create: Boolean(p.can_create),
          can_update: Boolean(p.can_update),
          can_delete: Boolean(p.can_delete),
          can_view_cross_region: Boolean(p.can_view_cross_region),
          allowed_cross_regions: Boolean(p.can_view_cross_region) ? JSON.stringify(p.allowed_cross_regions || []) : "[]"
        }))
      };

      const response = await fetch(`${API_URL}/api/menus/${selectedMenu.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showAlert('Berhasil Disimpan', 'Pengaturan akses menu telah diperbarui.', 'success');
        closePermissionModal();
        fetchData();
      } else {
        showAlert('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan pengaturan.', 'error');
      }
    } catch (error) {
      showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
    }
  };

  if (role !== 'superadmin') return null;

  if (isLoading && !isModalOpen) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[rgb(var(--theme-600))] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-[popIn_0.4s_ease-out] flex flex-col gap-6 font-sans pb-10">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Kelola Akses Menu Website</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Atur visibilitas, otorisasi login, dan hak akses detail untuk setiap peran dan wilayah.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menus.map((menu) => (
          <div key={menu.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full group relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${menu.menu_type === 'navbar' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${menu.menu_type === 'navbar' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                  {menu.menu_type}
                </span>
                {menu.requires_login ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    Wajib Login
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                    Akses Publik
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{menu.menu_name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-mono">{menu.menu_code}</p>
            </div>
            <button onClick={() => openPermissionModal(menu)} className="w-full py-3 rounded-xl font-bold bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-[rgb(var(--theme-600))] transition-colors border border-gray-200 dark:border-gray-700">
              Konfigurasi Akses
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && selectedMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity" onClick={closePermissionModal}></div>
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-7xl shadow-2xl z-10 flex flex-col max-h-[95vh] animate-[popIn_0.3s_ease-out]">
            
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20 shrink-0 rounded-t-[2rem]">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Akses: {selectedMenu.menu_name}</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Kode: {selectedMenu.menu_code} | Tipe: <span className="uppercase">{selectedMenu.menu_type}</span></p>
              </div>
              <button onClick={closePermissionModal} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar" onClick={() => { if(openCrossDropdownIndex !== null) setOpenCrossDropdownIndex(null) }}>
              <form id="permissionForm" onSubmit={savePermissions} className="space-y-8" onClick={(e) => e.stopPropagation()}>
                
                <div className="bg-[rgb(var(--theme-50))] dark:bg-[rgba(var(--theme-900),0.2)] border border-[rgb(var(--theme-200))] dark:border-[rgba(var(--theme-700),0.5)] p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[rgb(var(--theme-700))] dark:text-[rgb(var(--theme-400))] text-lg">Wajib Login untuk Akses</h4>
                    <p className="text-sm text-[rgb(var(--theme-600))] dark:text-[rgb(var(--theme-500))] mt-1">Jika dimatikan, menu ini dapat diakses oleh publik tanpa perlu autentikasi.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={selectedMenu.requires_login} onChange={(e) => handleMenuChange('requires_login', e.target.checked)} className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-[rgb(var(--theme-500))]"></div>
                  </label>
                </div>

                {selectedMenu.requires_login && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Detail Hak Akses Peran</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tentukan peran, wilayah, dan batas tindakan yang diizinkan.</p>
                      </div>
                      <button type="button" onClick={addPermissionRow} className="px-5 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white hover:bg-[rgb(var(--theme-700))] shadow-md transition-all text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                        Tambah Akses
                      </button>
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm min-h-[300px]">
                      <div className="overflow-x-auto w-full pb-32 custom-scrollbar">
                        <table className="w-full min-w-[1000px] text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            <tr>
                              <th className="px-4 py-4 font-bold">Peran (Role)</th>
                              <th className="px-4 py-4 font-bold">Wilayah Regional</th>
                              <th className="px-4 py-4 font-bold text-center">Lihat</th>
                              <th className="px-4 py-4 font-bold text-center">Tambah</th>
                              <th className="px-4 py-4 font-bold text-center">Ubah</th>
                              <th className="px-4 py-4 font-bold text-center">Hapus</th>
                              <th className="px-4 py-4 font-bold text-center">Lintas Wilayah</th>
                              <th className="px-4 py-4 font-bold text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 relative">
                            {menuPermissions.length === 0 ? (
                              <tr>
                                <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                                  Belum ada aturan akses khusus.
                                </td>
                              </tr>
                            ) : (
                              menuPermissions.map((perm, index) => (
                                <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                  <td className="px-4 py-3">
                                    <select value={perm.role_name} onChange={(e) => handlePermissionChange(index, 'role_name', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--theme-500))] font-medium text-gray-900 dark:text-white">
                                      <option value="superadmin">Superadmin</option>
                                      <option value="admin_regional">Admin Regional</option>
                                      <option value="user">User</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-3">
                                    <select 
                                      value={perm.regional_id === null || perm.regional_id === undefined ? '' : perm.regional_id} 
                                      onChange={(e) => handlePermissionChange(index, 'regional_id', e.target.value)} 
                                      disabled={perm.role_name === 'superadmin'} 
                                      className="w-48 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--theme-500))] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-900 dark:text-white"
                                    >
                                      <option value="">Semua Wilayah</option>
                                      {regionals
                                        .filter(reg => reg.status_aktivasi === 'aktif' || reg.status === 'aktif' || reg.is_active === true || reg.status === 1)
                                        .map(reg => (
                                        <option key={reg.id} value={reg.id}>
                                          {reg.nama_region || reg.nama_regional || reg.nama}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input type="checkbox" checked={Boolean(perm.can_read)} onChange={(e) => handlePermissionChange(index, 'can_read', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))]" />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input type="checkbox" checked={Boolean(perm.can_create)} onChange={(e) => handlePermissionChange(index, 'can_create', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))]" />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input type="checkbox" checked={Boolean(perm.can_update)} onChange={(e) => handlePermissionChange(index, 'can_update', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))]" />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input type="checkbox" checked={Boolean(perm.can_delete)} onChange={(e) => handlePermissionChange(index, 'can_delete', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))]" />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1 relative">
                                      <input type="checkbox" checked={Boolean(perm.can_view_cross_region)} onChange={(e) => { handlePermissionChange(index, 'can_view_cross_region', e.target.checked); if(!e.target.checked) setOpenCrossDropdownIndex(null); }} disabled={perm.role_name === 'user'} className="w-5 h-5 rounded border-gray-300 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))] disabled:opacity-50" />
                                      {perm.can_view_cross_region && perm.role_name !== 'user' && (
                                        <div className="mt-1 relative">
                                          <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); setOpenCrossDropdownIndex(openCrossDropdownIndex === index ? null : index); }} 
                                            className="w-32 text-xs px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg flex justify-between items-center"
                                          >
                                            <span className="truncate">
                                              {Array.isArray(perm.allowed_cross_regions) && perm.allowed_cross_regions.length > 0 
                                                ? (perm.allowed_cross_regions.includes('Semua') ? 'Semua Wilayah' : perm.allowed_cross_regions.join(', '))
                                                : 'Pilih Wilayah'}
                                            </span>
                                            <svg className="w-3 h-3 ml-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                          </button>
                                          {openCrossDropdownIndex === index && (
                                            <div className="absolute z-[100] mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto left-1/2 -translate-x-1/2 py-1" onClick={(e) => e.stopPropagation()}>
                                              <label className="flex items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800">
                                                <input type="checkbox" checked={(perm.allowed_cross_regions || []).includes('Semua')} onChange={() => handleCrossRegionToggle(index, 'Semua')} className="mr-3 rounded border-gray-300 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))]" />
                                                <span className="text-xs font-semibold text-gray-900 dark:text-white">Semua Wilayah</span>
                                              </label>
                                              {regionals.filter(r => r.status_aktivasi === 'aktif' || r.status === 'aktif' || r.is_active === true || r.status === 1).map(reg => {
                                                const rName = reg.nama_region || reg.nama_regional || reg.nama;
                                                return (
                                                  <label key={rName} className="flex items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                                    <input type="checkbox" checked={(perm.allowed_cross_regions || []).includes(rName)} onChange={() => handleCrossRegionToggle(index, rName)} disabled={(perm.allowed_cross_regions || []).includes('Semua')} className="mr-3 rounded border-gray-300 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))] disabled:opacity-40" />
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{rName}</span>
                                                  </label>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button type="button" onClick={() => removePermissionRow(index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

              </form>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 shrink-0 flex justify-end gap-4 bg-gray-50/50 dark:bg-gray-900 rounded-b-[2rem]">
              <button type="button" onClick={closePermissionModal} className="px-8 py-3.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Batal
              </button>
              <button form="permissionForm" type="submit" className="px-8 py-3.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white hover:bg-[rgb(var(--theme-700))] shadow-lg shadow-[rgba(var(--theme-600),0.3)] transition-all transform hover:scale-[1.02]">
                Simpan Pengaturan
              </button>
            </div>

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

export default KelolaAksesMenu;