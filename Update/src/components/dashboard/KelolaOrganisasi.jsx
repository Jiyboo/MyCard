import { useState, useMemo, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const KelolaOrganisasi = ({ role, adminRegion, permissions = {} }) => {
  const permsArray = permissions.permissions || [];
  
  const [orgs, setOrgs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({ id: null, kode: '', nama: '', deskripsi: '', status: 'aktif' });
  
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });

  const getAllowedRegionsForAction = (action) => {
    if (role === 'superadmin') return null;
    let allowed = new Set();
    
    for (let p of permsArray) {
      if (p[action]) {
        if (!p.can_view_cross_region) {
          allowed.add(adminRegion);
        } else {
          const cross = (() => { try { return JSON.parse(p.allowed_cross_regions); } catch(e){ return []; } })();
          if (cross.includes('Semua')) {
            return null;
          } else {
            cross.forEach(c => allowed.add(c));
          }
        }
      }
    }
    return Array.from(allowed);
  };

  const viewableRegions = getAllowedRegionsForAction('can_read');
  const creatableRegions = getAllowedRegionsForAction('can_create');
  const updateableRegions = getAllowedRegionsForAction('can_update');
  const deletableRegions = getAllowedRegionsForAction('can_delete');

  const checkAction = (targetRegion, action) => {
    if (role === 'superadmin') return true;
    let allowed;
    if (action === 'can_update') allowed = updateableRegions;
    else if (action === 'can_delete') allowed = deletableRegions;
    else allowed = getAllowedRegionsForAction(action);
    
    if (allowed === null) return true;
    return allowed.includes(targetRegion);
  };

  const actualCanCreate = role === 'superadmin' || creatableRegions === null || creatableRegions.length > 0;
  const showActionColumn = role === 'superadmin' || updateableRegions === null || updateableRegions.length > 0 || deletableRegions === null || deletableRegions.length > 0;

  const fetchOrgs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/regionals`);
      const data = await response.json();
      setOrgs(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, itemsPerPage]);

  const filteredOrgs = useMemo(() => {
    return orgs.filter(org => {
      const matchSearch = org.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          org.kode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'Semua' ? true : org.status === filterStatus;
      
      let matchRegion = false;
      if (role === 'superadmin' || viewableRegions === null) {
        matchRegion = true;
      } else {
        matchRegion = viewableRegions.includes(org.nama);
      }

      return matchSearch && matchStatus && matchRegion;
    });
  }, [orgs, searchQuery, filterStatus, role, viewableRegions]);

  const totalPages = Math.ceil(filteredOrgs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrgs.slice(indexOfFirstItem, indexOfLastItem);

  const handleOpenModal = (mode, org = null) => {
    setModalMode(mode);
    if (mode === 'edit' && org) {
      setFormData(org);
    } else {
      setFormData({ id: null, kode: '', nama: '', deskripsi: '', status: 'aktif' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    const method = modalMode === 'add' ? 'POST' : 'PUT';
    const url = modalMode === 'add' ? `${API_URL}/api/regionals` : `${API_URL}/api/regionals/${formData.id}`;

    try {
      await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      fetchOrgs();
      handleCloseModal();
    } catch (error) {
      console.error(error);
    }
  };

  const triggerConfirm = (title, message, type, onConfirm) => {
    setConfirmDialog({ isOpen: true, title, message, type, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });
  };

  const handleDeleteOrg = (id) => {
    triggerConfirm(
      'Hapus Organisasi/Regional',
      'Apakah Anda yakin ingin menghapus data regional ini? Seluruh data yang terkait mungkin akan terpengaruh.',
      'danger',
      async () => {
        try {
          await fetch(`${API_URL}/api/regionals/${id}`, { method: 'DELETE' });
          fetchOrgs();
          closeConfirm();
        } catch (error) {
          console.error(error);
        }
      }
    );
  };

  const handleToggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'aktif' ? 'tidak_aktif' : 'aktif';
    const actionText = newStatus === 'aktif' ? 'mengaktifkan' : 'menonaktifkan';
    const actionType = newStatus === 'aktif' ? 'success' : 'warning';

    triggerConfirm(
      'Ubah Status Regional',
      `Apakah Anda yakin ingin ${actionText} regional ini?`,
      actionType,
      async () => {
        try {
          await fetch(`${API_URL}/api/regionals/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
          fetchOrgs();
          closeConfirm();
        } catch (error) {
          console.error(error);
        }
      }
    );
  };

  const getStatusStyle = (status) => {
    if (status === 'aktif') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
  };

  const getStatusText = (status) => {
    if (status === 'aktif') return 'Aktif';
    return 'Tidak Aktif';
  };

  return (
    <div className="animate-[popIn_0.4s_ease-out] flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Kelola Organisasi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manajemen data wilayah regional operasional sistem.</p>
        </div>
        {actualCanCreate && (
          <button onClick={() => handleOpenModal('add')} className="bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-[rgba(var(--theme-600),0.3)] transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Tambah Regional
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors flex flex-col">
        <div className="p-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input type="text" placeholder="Cari kode atau nama regional..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[rgb(var(--theme-500))] focus:border-transparent outline-none text-gray-900 dark:text-white transition-all"/>
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none appearance-none font-medium cursor-pointer w-full md:w-48">
            <option value="Semua">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="tidak_aktif">Tidak Aktif</option>
          </select>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 w-32">Kode</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nama Regional</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Deskripsi</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 w-32">Status</th>
                {showActionColumn && <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-center w-40">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? currentItems.map(org => (
                <tr key={org.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4"><span className="font-bold text-[rgb(var(--theme-600))] bg-[rgba(var(--theme-600),0.1)] px-3 py-1.5 rounded-lg text-xs tracking-wider">{org.kode}</span></td>
                  <td className="px-6 py-4"><p className="font-bold text-gray-900 dark:text-white">{org.nama}</p></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">{org.deskripsi}</td>
                  <td className="px-6 py-4"><span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusStyle(org.status)}`}>{getStatusText(org.status)}</span></td>
                  {showActionColumn && (
                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                      {checkAction(org.nama, 'can_update') && (
                        <button onClick={() => handleToggleStatus(org.id, org.status)} className={`p-2 rounded-lg transition-colors ${org.status === 'aktif' ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      )}
                      {checkAction(org.nama, 'can_update') && (
                        <button onClick={() => handleOpenModal('edit', org)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      )}
                      {checkAction(org.nama, 'can_delete') && (
                        <button onClick={() => handleDeleteOrg(org.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={showActionColumn ? "5" : "4"} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Tidak ada data organisasi/regional yang ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Tampilkan</span>
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm outline-none cursor-pointer">
              <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">data</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${currentPage === i + 1 ? 'bg-[rgb(var(--theme-600))] text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{i + 1}</button>
              ))}
            </div>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" /></svg></button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={handleCloseModal}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-xl shadow-2xl z-10 overflow-hidden animate-[popIn_0.3s_ease-out]">
            <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{modalMode === 'add' ? 'Tambah Regional Baru' : 'Edit Data Regional'}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white dark:bg-gray-800 rounded-full p-2 shadow-sm border border-gray-100 dark:border-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSaveOrg} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Kode Regional</label>
                  <input required type="text" name="kode" value={formData.kode} onChange={handleFormChange} placeholder="Contoh: REG-JKT" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all uppercase" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</label>
                  <div className="relative">
                    <select name="status" value={formData.status} onChange={handleFormChange} className="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none appearance-none cursor-pointer transition-all">
                      <option value="aktif">Aktif</option>
                      <option value="tidak_aktif">Tidak Aktif</option>
                    </select>
                    <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nama Regional</label>
                <input required type="text" name="nama" value={formData.nama} onChange={handleFormChange} placeholder="Contoh: Jakarta" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Deskripsi Lengkap</label>
                <textarea required name="deskripsi" value={formData.deskripsi} onChange={handleFormChange} rows="3" placeholder="Masukkan deskripsi cakupan wilayah..." className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all resize-none"></textarea>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
                <button type="submit" className="px-8 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white shadow-lg shadow-[rgba(var(--theme-600),0.2)] transition-all">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={closeConfirm}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out] text-center p-8">
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
              <button 
                onClick={confirmDialog.onConfirm} 
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${confirmDialog.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : confirmDialog.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'}`}
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KelolaOrganisasi;