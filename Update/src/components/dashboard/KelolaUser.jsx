import { useState, useMemo, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const KelolaUser = ({ role, adminRegion, permissions = {} }) => {
  const permsArray = permissions.permissions || [];
  
  const [users, setUsers] = useState([]);
  const [regionList, setRegionList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({ id: null, nama_lengkap: '', username: '', email: '', region: '', status: 'pending', role_akun: 'user', password: '' });
  
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });

  const getRegionName = (r) => r.nama_region || r.NamaRegion || r.nama_regional || r.nama || '';

  const getAllowedRegionsForAction = (action) => {
    if (role === 'superadmin') return regionList.map(r => getRegionName(r));
    let allowed = new Set();
    
    for (let p of permsArray) {
      if (p[action]) {
        if (!p.can_view_cross_region) {
          allowed.add(adminRegion);
        } else {
          const cross = (() => { try { return JSON.parse(p.allowed_cross_regions); } catch(e){ return []; } })();
          if (cross.includes('Semua')) {
            regionList.forEach(r => allowed.add(getRegionName(r)));
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

  const checkAction = (targetRegion, action) => {
    if (role === 'superadmin') return true;
    const allowed = getAllowedRegionsForAction(action);
    return allowed.includes(targetRegion);
  };

  const actualCanCreate = role === 'superadmin' || creatableRegions.length > 0;
  const actualCanViewCross = role === 'superadmin' || viewableRegions.some(r => r !== adminRegion);
  const showActionColumn = role === 'superadmin' || getAllowedRegionsForAction('can_update').length > 0 || getAllowedRegionsForAction('can_delete').length > 0;

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users?role=user`);
      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/regionals`);
      const data = await response.json();
      const activeRegions = (data || []).filter(r => {
        const status = r.status_aktivasi || r.status || r.StatusAktivasi;
        return status === 'aktif' || status === 'Aktif' || r.is_active === true || status === 1;
      });
      setRegionList(activeRegions);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRegions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRegion, filterStatus, itemsPerPage]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchSearch = user.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRegion = role === 'superadmin' 
        ? (filterRegion === 'Semua' ? true : user.region === filterRegion)
        : (viewableRegions.includes(user.region) && (filterRegion === 'Semua' ? true : user.region === filterRegion));
        
      const matchStatus = filterStatus === 'Semua' ? true : user.status === filterStatus;

      return matchSearch && matchRegion && matchStatus;
    });
  }, [users, searchQuery, filterRegion, filterStatus, viewableRegions, role]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const handleOpenModal = (mode, user = null) => {
    setModalMode(mode);
    if (mode === 'edit' && user) {
      setFormData({ ...user, password: '' });
    } else {
      const defaultRegion = creatableRegions.length > 0 ? creatableRegions[0] : adminRegion;
      
      setFormData({ 
        id: null, 
        nama_lengkap: '', 
        username: '', 
        email: '', 
        region: defaultRegion, 
        status: 'pending',
        role_akun: 'user',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const method = modalMode === 'add' ? 'POST' : 'PUT';
    const url = modalMode === 'add' ? `${API_URL}/api/users` : `${API_URL}/api/users/${formData.id}`;

    try {
      await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      fetchUsers();
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

  const handleDeleteUser = (id) => {
    triggerConfirm(
      'Hapus Pengguna',
      'Apakah Anda yakin ingin menghapus pengguna ini? Data yang telah dihapus tidak dapat dikembalikan.',
      'danger',
      async () => {
        try {
          await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE' });
          fetchUsers();
          closeConfirm();
        } catch (error) {
          console.error(error);
        }
      }
    );
  };

  const handleToggleStatus = (id, currentStatus) => {
    let newStatus = 'aktif';
    if (currentStatus === 'aktif') newStatus = 'tidak_aktif';
    if (currentStatus === 'tidak_aktif') newStatus = 'aktif';
    if (currentStatus === 'pending') newStatus = 'aktif';

    const actionText = newStatus === 'aktif' ? 'mengaktifkan' : 'menonaktifkan';
    const actionType = newStatus === 'aktif' ? 'success' : 'warning';

    triggerConfirm(
      'Ubah Status Pengguna',
      `Apakah Anda yakin ingin ${actionText} pengguna ini?`,
      actionType,
      async () => {
        try {
          await fetch(`${API_URL}/api/users/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
          fetchUsers();
          closeConfirm();
        } catch (error) {
          console.error(error);
        }
      }
    );
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'aktif': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'tidak_aktif': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'aktif': return 'Aktif';
      case 'pending': return 'Menunggu';
      case 'tidak_aktif': return 'Tidak Aktif';
      default: return status;
    }
  };

  return (
    <div className="animate-[popIn_0.4s_ease-out] flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Kelola Pengguna</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {actualCanViewCross
              ? `Manajemen seluruh akun pengguna sistem.` 
              : `Manajemen akun pengguna wilayah ${adminRegion}.`}
          </p>
        </div>
        {actualCanCreate && (
          <button 
            onClick={() => handleOpenModal('add')}
            className="bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-[rgba(var(--theme-600),0.3)] transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Tambah Pengguna
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors flex flex-col">
        <div className="p-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Cari nama, username, atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[rgb(var(--theme-500))] focus:border-transparent outline-none text-gray-900 dark:text-white transition-all"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none appearance-none font-medium cursor-pointer"
          >
            <option value="Semua">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="pending">Menunggu</option>
            <option value="tidak_aktif">Tidak Aktif</option>
          </select>

          {actualCanViewCross && (
            <select 
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none appearance-none font-medium cursor-pointer"
            >
              <option value="Semua">Semua Wilayah</option>
              {viewableRegions.map(rName => <option key={rName} value={rName}>{rName}</option>)}
            </select>
          )}
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nama Pengguna</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Kontak</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Peran & Wilayah</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                {showActionColumn && <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? currentItems.map(user => (
                <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 dark:text-white">{user.nama_lengkap}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm font-medium">{user.email}</td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 dark:text-white text-sm font-bold capitalize">User Biasa</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{user.region || 'Belum Diatur'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusStyle(user.status)}`}>
                      {getStatusText(user.status)}
                    </span>
                  </td>
                  {showActionColumn && (
                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                      {checkAction(user.region, 'can_update') && (
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className={`p-2 rounded-lg transition-colors ${user.status === 'aktif' ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                          title={user.status === 'aktif' ? 'Non-aktifkan' : 'Aktifkan'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      )}
                      {checkAction(user.region, 'can_update') && (
                        <button 
                          onClick={() => handleOpenModal('edit', user)}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      )}
                      {checkAction(user.region, 'can_delete') && (
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={showActionColumn ? "5" : "4"} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada data pengguna yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Tampilkan</span>
            <select 
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">data</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${currentPage === i + 1 ? 'bg-[rgb(var(--theme-600))] text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={handleCloseModal}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl shadow-2xl z-10 overflow-hidden animate-[popIn_0.3s_ease-out]">
            <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {modalMode === 'add' ? 'Tambah Pengguna Baru' : 'Edit Pengguna'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white dark:bg-gray-800 rounded-full p-2 shadow-sm border border-gray-100 dark:border-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nama Lengkap</label>
                  <input required type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Username</label>
                  <input required type="text" name="username" value={formData.username} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email Valid</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status Akun</label>
                  <div className="relative">
                    <select name="status" value={formData.status} onChange={handleFormChange} className="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none appearance-none cursor-pointer transition-all">
                      <option value="aktif">Aktif</option>
                      <option value="pending">Menunggu</option>
                      <option value="tidak_aktif">Tidak Aktif</option>
                    </select>
                    <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Wilayah Regional</label>
                  <div className="relative">
                    <select name="region" value={formData.region} onChange={handleFormChange} className="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none appearance-none cursor-pointer transition-all">
                      {(modalMode === 'add' ? creatableRegions : getAllowedRegionsForAction('can_update')).map(rName => (
                        <option key={rName} value={rName}>{rName}</option>
                      ))}
                    </select>
                    <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Peran Sistem</label>
                  <div className="relative opacity-70">
                    <select name="role_akun" value="user" disabled className="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white appearance-none cursor-not-allowed transition-all">
                      <option value="user">User Biasa</option>
                    </select>
                    <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {modalMode === 'add' ? 'Password Sementara' : 'Ubah Password (opsional)'}
                  </label>
                  <input 
                    required={modalMode === 'add'} 
                    type="text" 
                    name="password" 
                    value={formData.password || ''} 
                    onChange={handleFormChange} 
                    placeholder={modalMode === 'edit' ? 'Kosongkan jika tidak ingin mengubah password' : ''}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none transition-all" 
                  />
                </div>
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

export default KelolaUser;