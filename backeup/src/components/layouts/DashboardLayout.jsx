import { useState, useEffect } from 'react';
import Sidebar from '../dashboard/Sidebar';
import DashboardNavbar from '../dashboard/DashboardNavbar';
import StatChart from '../dashboard/StatChart';
import KelolaUser from '../dashboard/KelolaUser';
import KelolaAdminRegional from '../dashboard/KelolaAdminRegional';
import KelolaOrganisasi from '../dashboard/KelolaOrganisasi';
import KelolaLandingPage from '../dashboard/KelolaLandingPage';
import KelolaAksesMenu from '../dashboard/KelolaAksesMenu';
import BuatKartu from '../dashboard/BuatKartu';
import LiveChat from '../dashboard/LiveChat';
import Profile from '../dashboard/Profile';
import Settings from '../dashboard/Settings';
import { regions, chartModels } from '../../utils/dashboardHelpers';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const DashboardLayout = ({ onNavigate }) => {
  const [userRole, setUserRole] = useState('');
  const [adminRegion, setAdminRegion] = useState('');
  const [activeMenu, setActiveMenu] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [menuPermissions, setMenuPermissions] = useState({});
  const [allowedMenuCodes, setAllowedMenuCodes] = useState([]);
  
  const [regionFilter, setRegionFilter] = useState('global');
  const [userChartModel, setUserChartModel] = useState('bar');
  const [cardChartModel, setCardChartModel] = useState('pie');

  const [data, setData] = useState(null);

  // --- TAMBAHAN KODE UNTUK SIDEBAR DI SINI ---
  // Default terbuka di layar besar (desktop), tertutup di HP
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  // ------------------------------------------

  useEffect(() => {
    const stored = localStorage.getItem('user');
    let role = 'user';
    let region = '';
    
    if (stored) {
      const parsed = JSON.parse(stored);
      role = parsed.role || parsed.role_akun || 'user';
      region = parsed.region || parsed.regional_id || parsed.region_id || '';
      setUserRole(role);
      setAdminRegion(region);
    } else {
      setUserRole('user');
    }

    const fetchAccess = async () => {
      if (!role) {
        setIsLoaded(true);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/menus/user-access?role=${role}&regional_id=${encodeURIComponent(region)}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.ok) {
          const resData = await response.json();
          if (Array.isArray(resData)) {
            setMenuPermissions({});
            setAllowedMenuCodes(resData);
          } else {
            setMenuPermissions(resData || {});
            setAllowedMenuCodes(Object.keys(resData || {}));
          }
        } else {
          setMenuPermissions({});
          setAllowedMenuCodes([]);
        }
      } catch (error) {
        setMenuPermissions({});
        setAllowedMenuCodes([]);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchAccess();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      if (userRole === 'user') {
        setActiveMenu('buat_kartu');
      } else if (userRole === 'superadmin' || allowedMenuCodes.includes('beranda')) {
        setActiveMenu('beranda');
      } else if (allowedMenuCodes.length > 0) {
        setActiveMenu(allowedMenuCodes[0]);
      } else {
        setActiveMenu('');
      }
    }
  }, [isLoaded, userRole, allowedMenuCodes]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dashboard/stats?region=${encodeURIComponent(regionFilter)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const stats = await response.json();
          setData(stats);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (isLoaded && activeMenu === 'beranda') {
      fetchDashboardStats();
    }
  }, [isLoaded, regionFilter, activeMenu]);

  const themeColor = "14, 165, 233"; 

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onNavigate('auth');
  };

  const SelectorBtn = ({ models, current, setCurrent }) => (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
      {models.map(model => (
        <button 
          key={model.id}
          onClick={() => setCurrent(model.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${current === model.id ? 'bg-white dark:bg-gray-700 text-[rgb(var(--theme-600))] shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          {model.name}
        </button>
      ))}
    </div>
  );

  if (!isLoaded) return null;

  return (
    <div className="flex bg-gray-50 dark:bg-gray-950 min-h-screen transition-colors duration-500 font-sans view-transition-root">
      
      {/* PASTIKAN PROPS isOpen DAN toggleSidebar DIKIRIM KE SINI */}
      <Sidebar 
        role={userRole} 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
        onLogout={handleLogout} 
        allowedMenuCodes={allowedMenuCodes} 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* PASTIKAN PROPS toggleSidebar DIKIRIM KE SINI */}
        <DashboardNavbar 
            setActiveMenu={setActiveMenu} 
            toggleSidebar={toggleSidebar} 
        />
        
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* ... SISA KODE KONTEN ANDA ... */}
            
            {activeMenu === 'beranda' && data && userRole !== 'user' && (
              <div className="animate-[popIn_0.4s_ease-out] space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[rgb(var(--theme-600))] mb-1">Selamat Datang di Portal</p>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Jiaf Digital <span className="font-light text-gray-400">| {data.regionName}</span></h1>
                  </div>

                  {userRole === 'superadmin' && (
                    <div className="relative w-full md:w-64">
                      <select 
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-[rgb(var(--theme-500))] focus:border-[rgb(var(--theme-500))] outline-none appearance-none transition-all cursor-pointer"
                      >
                        <option value="global">Nasional (Seluruh Wilayah)</option>
                        <optgroup label="Per Wilayah Regional">
                          {regions.map(r => <option key={r} value={r}>{r}</option>)}
                        </optgroup>
                      </select>
                      <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <svg className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  )}
                </div>
                
                {(userRole === 'superadmin' || allowedMenuCodes.includes('beranda')) && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                      <StatCard iconColor="blue" title="Total Pengguna" value={data.totalUsers.toLocaleString('id-ID')} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      <StatCard iconColor="emerald" title="Total Kartu" value={data.totalCards.toLocaleString('id-ID')} icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      <StatCard iconColor="sky" title="Kartu Aktif" value={data.cards.aktif.toLocaleString('id-ID')} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      {data.regionalAdmins !== null && data.regionalAdmins !== undefined && (
                         <StatCard iconColor="purple" title="Admin Regional" value={data.regionalAdmins} icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      )}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <ChartContainer title="Status Aktivasi Pengguna" Selector={() => <SelectorBtn models={chartModels} current={userChartModel} setCurrent={setUserChartModel} />}>
                        <StatChart type={userChartModel} title="Jumlah Pengguna" labels={['Aktif', 'Pending (Menunggu)', 'Tidak Aktif']} dataValue={[data.users.aktif, data.users.pending, data.users.tidakAktif]} themeColor={themeColor} />
                    </ChartContainer>

                      <ChartContainer title="Status Kondisi Kartu" Selector={() => <SelectorBtn models={chartModels} current={cardChartModel} setCurrent={setCardChartModel} />}>
                        <StatChart type={cardChartModel} title="Jumlah Kartu" labels={['Aktif', 'Tidak Aktif']} dataValue={[data.cards.aktif, data.cards.tidakAktif]} themeColor="16, 185, 129" />
                      </ChartContainer>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeMenu === 'buat_kartu' && ( <BuatKartu /> )}
            {activeMenu === 'profil' && ( <Profile onNavigate={onNavigate} /> )}
            {activeMenu === 'pengaturan' && ( <Settings onNavigate={onNavigate} /> )}
            {activeMenu === 'live_chat' && ( <LiveChat role={userRole} /> )}
            {activeMenu === 'kelola_user' && (userRole === 'superadmin' || allowedMenuCodes.includes('kelola_user')) && ( <KelolaUser role={userRole} adminRegion={adminRegion} permissions={menuPermissions['kelola_user'] || {}} /> )}
            {activeMenu === 'kelola_admin_regional' && (userRole === 'superadmin' || allowedMenuCodes.includes('kelola_admin_regional')) && ( <KelolaAdminRegional role={userRole} adminRegion={adminRegion} permissions={menuPermissions['kelola_admin_regional'] || {}} /> )}
            {activeMenu === 'kelola_organisasi' && (userRole === 'superadmin' || allowedMenuCodes.includes('kelola_organisasi')) && ( <KelolaOrganisasi role={userRole} adminRegion={adminRegion} permissions={menuPermissions['kelola_organisasi'] || {}} /> )}
            {activeMenu === 'atur_landing_page' && (userRole === 'superadmin' || allowedMenuCodes.includes('atur_landing_page')) && ( <KelolaLandingPage role={userRole} permissions={menuPermissions['atur_landing_page'] || {}} /> )}
            {activeMenu === 'kelola_akses_menu' && userRole === 'superadmin' && ( <KelolaAksesMenu role={userRole} /> )}

            {activeMenu !== 'beranda' && 
             activeMenu !== 'profil' && 
             activeMenu !== 'pengaturan' && 
             activeMenu !== 'live_chat' && 
             activeMenu !== 'kelola_user' && 
             activeMenu !== 'kelola_admin_regional' && 
             activeMenu !== 'kelola_organisasi' && 
             activeMenu !== 'atur_landing_page' && 
             activeMenu !== 'kelola_akses_menu' && 
             activeMenu !== 'buat_kartu' && (
              <div className="animate-[popIn_0.4s_ease-out] bg-white dark:bg-gray-900 rounded-3xl p-10 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center min-h-[500px] transition-colors">
                <div className="w-24 h-24 bg-[rgb(var(--theme-100))] dark:bg-[rgba(var(--theme-900),0.3)] text-[rgb(var(--theme-600))] rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Halaman {activeMenu.replace(/_/g, ' ')}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md transition-colors">Modul ini sedang dalam tahap pengembangan sesuai dengan peran dan aksesibilitas akun Anda.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ iconColor, title, value, icon }) => {
  const colorMap = { blue: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400', emerald: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400', sky: 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400', purple: 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400' };
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorMap[iconColor]}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} /></svg>
      </div>
      <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 transition-colors">{title}</h3>
      <p className="text-3xl font-black text-gray-900 dark:text-white transition-colors">{value}</p>
    </div>
  );
};

const ChartContainer = ({ title, children, Selector }) => (
  <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors flex flex-col">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">{title}</h3>
      <Selector />
    </div>
    <div className="flex-1 min-h-[300px] w-full">{children}</div>
  </div>
);

export default DashboardLayout;