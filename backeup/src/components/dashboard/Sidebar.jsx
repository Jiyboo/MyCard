import { useState, useEffect } from 'react';

const Sidebar = ({ role, activeMenu, setActiveMenu, onLogout, allowedMenuCodes = [], isOpen, toggleSidebar }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [openDropdown, setOpenDropdown] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const API_URL = import.meta.env.VITE_API_BASE_URL;
        const res = await fetch(`${API_URL}/api/chats?user_id=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          const total = (data || []).reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
          setUnreadCount(total);
        }
      } catch (error) {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? '' : id);
  };

  const baseMenuList = [
    {
      id: 'beranda',
      title: 'Beranda'
    },
    {
      id: 'live_chat',
      title: 'Pesan & Komunikasi'
    },
    {
      id: 'grup_pengguna',
      title: 'Kelola Data Pengguna',
      isDropdown: true,
      children: [
        { id: 'kelola_user', title: 'Kelola User' },
        { id: 'kelola_admin_regional', title: 'Kelola Admin Regional' }
      ]
    },
    {
      id: 'kelola_organisasi',
      title: 'Kelola Organisasi'
    },
    {
      id: 'buat_kartu',
      title: 'Buat Kartu'
    },
    {
      id: 'atur_website',
      title: 'Atur Website',
      isDropdown: true,
      children: [
        { id: 'atur_landing_page', title: 'Atur Landing Page' },
        { id: 'kelola_akses_menu', title: 'Kelola Akses Menu Website' }
      ]
    }
  ];

  const getIcon = (id) => {
    switch (id) {
      case 'beranda': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />;
      case 'live_chat': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />;
      case 'grup_pengguna': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />;
      case 'kelola_user': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />;
      case 'kelola_organisasi': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />;
      case 'buat_kartu': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />;
      case 'atur_website': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />;
      default: return null;
    }
  };

  const allowedMenus = baseMenuList.map(menu => {
    if (role === 'superadmin') return menu;
    if (menu.id === 'live_chat') return menu;

    if (menu.isDropdown) {
      const visibleChildren = menu.children.filter(child => allowedMenuCodes.includes(child.id));
      if (visibleChildren.length > 0) {
        return { ...menu, children: visibleChildren };
      }
      return null;
    }

    if (allowedMenuCodes.includes(menu.id)) return menu;
    return null;
  }).filter(Boolean);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300" 
          onClick={toggleSidebar}
        ></div>
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 flex flex-col overflow-hidden ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 lg:w-0 lg:border-none lg:translate-x-0'}`}>
        <div className="w-72 h-full flex flex-col">
          <div className="h-20 flex items-center px-8 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <span className="font-extrabold text-3xl text-[rgb(var(--theme-600))] tracking-wider">Jiaf</span>
            <span className="ml-2 mt-1 text-xs font-bold text-gray-400 uppercase tracking-widest">Sistem</span>
          </div>

          <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col gap-2">
            <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Menu Navigasi</p>
            
            {allowedMenus.map((menu) => {
              if (menu.isDropdown) {
                const isMenuOpen = openDropdown === menu.id;
                const hasActiveChild = menu.children.some(child => child.id === activeMenu);

                return (
                  <div key={menu.id} className="flex flex-col gap-1">
                    <button
                      onClick={() => toggleDropdown(menu.id)}
                      className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl font-medium transition-all duration-300 ${
                        isMenuOpen || hasActiveChild
                          ? 'bg-gray-100 dark:bg-gray-800 text-[rgb(var(--theme-600))]'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-[rgb(var(--theme-600))]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{getIcon(menu.id)}</svg>
                        <span className="text-sm tracking-wide whitespace-nowrap">{menu.title}</span>
                      </div>
                      <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                      {menu.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setActiveMenu(child.id)}
                          className={`flex items-center gap-3 w-full pl-12 pr-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                            activeMenu === child.id
                              ? 'bg-[rgb(var(--theme-600))] text-white shadow-md'
                              : 'text-gray-500 dark:text-gray-400 hover:text-[rgb(var(--theme-600))] hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeMenu === child.id ? 'bg-white' : 'bg-gray-400'}`}></div>
                          {child.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={menu.id}
                  onClick={() => {
                    setActiveMenu(menu.id);
                    setOpenDropdown('');
                  }}
                  className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl font-medium transition-all duration-300 ${
                    activeMenu === menu.id
                      ? 'bg-[rgb(var(--theme-600))] text-white shadow-[0_4px_15px_rgba(var(--theme-600),0.3)] scale-[1.02]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[rgb(var(--theme-600))] hover:scale-[1.02]'
                  }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{getIcon(menu.id)}</svg>
                  <span className="text-sm tracking-wide whitespace-nowrap">{menu.title}</span>
                  {menu.id === 'live_chat' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex-shrink-0">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm tracking-wide whitespace-nowrap">Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out] text-center p-8">
            <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-red-100 text-red-500 dark:bg-red-900/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Keluar Sistem</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">Apakah Anda yakin ingin keluar dari portal Jiaf Digital?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
              <button onClick={onLogout} className="flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all bg-red-500 hover:bg-red-600 shadow-red-500/30">Ya, Keluar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;