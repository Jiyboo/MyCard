import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Navbar = ({ onNavigate }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [showScanQR, setShowScanQR] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    const storedUser = localStorage.getItem('user');
    let currentUser = null;
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      setUser(currentUser);
    }

    const checkMenuAccess = async () => {
      try {
        const role = currentUser ? (currentUser.role_akun || currentUser.role) : '';
        const regionId = currentUser ? (currentUser.regional_id || currentUser.region_id || currentUser.region || '') : '';
        
        const response = await fetch(`${API_URL}/api/menus/check-access?code=scan_qr&role=${role}&regional_id=${encodeURIComponent(regionId)}`);
        if (response.ok) {
          const data = await response.json();
          setShowScanQR(data.has_access);
        } else {
          setShowScanQR(false);
        }
      } catch (error) {
        setShowScanQR(false);
      }
    };

    checkMenuAccess();
  }, []);

  const toggleTheme = (e) => {
    const isDark = !isDarkMode;

    const updateTheme = () => {
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    };

    if (!document.startViewTransition) {
      updateTheme();
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(updateTheme);

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    });
  };

  return (
    <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md fixed w-full z-50 top-0 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <div 
            onClick={() => onNavigate('landing')}
            className="flex-shrink-0 flex items-center cursor-pointer active:scale-95 transition-transform"
          >
            <span className="font-bold text-2xl text-[rgb(var(--theme-600))]">Jiaf</span>
          </div>
          
          <div className="hidden md:flex space-x-8 items-center">
            <a href="#beranda" className="relative group text-gray-700 dark:text-gray-300 hover:text-[rgb(var(--theme-600))] dark:hover:text-[rgb(var(--theme-400))] font-medium transition-colors active:scale-95">
              Beranda
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[rgb(var(--theme-600))] transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#fitur" className="relative group text-gray-700 dark:text-gray-300 hover:text-[rgb(var(--theme-600))] dark:hover:text-[rgb(var(--theme-400))] font-medium transition-colors active:scale-95">
              Fitur
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[rgb(var(--theme-600))] transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#cara-kerja" className="relative group text-gray-700 dark:text-gray-300 hover:text-[rgb(var(--theme-600))] dark:hover:text-[rgb(var(--theme-400))] font-medium transition-colors active:scale-95">
              Cara Kerja
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[rgb(var(--theme-600))] transition-all duration-300 group-hover:w-full"></span>
            </a>
            
            {showScanQR && (
              <button 
                onClick={() => onNavigate('scan')} 
                className="relative group text-[rgb(var(--theme-600))] dark:text-[rgb(var(--theme-400))] font-bold flex items-center gap-1 transition-colors active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Scan QR
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[rgb(var(--theme-600))] transition-all duration-300"></span>
              </button>
            )}
            
            <button
              onClick={toggleTheme}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none overflow-hidden active:scale-90 transition-transform"
              aria-label="Toggle Dark Mode"
            >
              <svg
                className={`w-6 h-6 text-yellow-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 transform ${
                  isDarkMode ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                }`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg
                className={`w-6 h-6 text-[rgb(var(--theme-400))] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 transform ${
                  isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                }`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <div className="w-6 h-6"></div>
            </button>

            {user ? (
              <button 
                onClick={() => onNavigate('dashboard')}
                className="bg-[rgb(var(--theme-600))] text-white px-5 py-2 rounded-md font-medium active:scale-95 transition-all shadow-md hover:shadow-lg hover:opacity-90 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {user.nama || user.username || 'Dashboard'}
              </button>
            ) : (
              <button 
                onClick={() => onNavigate('auth')}
                className="bg-[rgb(var(--theme-600))] text-white px-5 py-2 rounded-md font-medium active:scale-95 transition-all shadow-md hover:shadow-lg hover:opacity-90"
              >
                Masuk / Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;