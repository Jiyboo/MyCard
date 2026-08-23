import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [heroData, setHeroData] = useState({
    title: 'Kelola peserta dan verifikasi QR dengan lebih cerdas',
    description: 'Platform modern untuk membuat, mendistribusikan, dan memverifikasi QR secara cepat dan efisien. Terintegrasi langsung dengan manajemen kartu anggota digital Anda.',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000'
  });

  useEffect(() => {
    setIsVisible(true);

    const fetchHeroData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/landing`);
        if (response.ok) {
          const data = await response.json();
          if (data.hero && data.hero.id !== 0) {
            setHeroData({
              title: data.hero.title || heroData.title,
              description: data.hero.description || heroData.description,
              image_url: data.hero.image_url || heroData.image_url
            });
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchHeroData();
  }, []);

  return (
    <section id="beranda" className="relative min-h-screen flex items-center pt-20 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 dark:from-gray-900 dark:via-gray-800 dark:to-black overflow-hidden transition-colors duration-500">
      
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full border-[40px] border-white/5 opacity-50"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] rounded-full border-[20px] border-white/5 opacity-50"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-white/5 opacity-30 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          <div className={`relative transform transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
            
            <div className="absolute -top-10 -left-16 sm:-left-24 w-80 h-80 sm:w-96 sm:h-96 z-[-1] opacity-20 pointer-events-none transform -rotate-12">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                <rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="4" className="qr-block" style={{animationDelay: '0.1s'}} />
                <rect x="12" y="12" width="8" height="8" fill="currentColor" className="qr-block" style={{animationDelay: '0.3s'}} />
                
                <rect x="73" y="5" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="4" className="qr-block" style={{animationDelay: '0.5s'}} />
                <rect x="80" y="12" width="8" height="8" fill="currentColor" className="qr-block" style={{animationDelay: '0.7s'}} />
                
                <rect x="5" y="73" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="4" className="qr-block" style={{animationDelay: '0.9s'}} />
                <rect x="12" y="80" width="8" height="8" fill="currentColor" className="qr-block" style={{animationDelay: '1.1s'}} />
                
                <rect x="35" y="5" width="10" height="10" fill="currentColor" className="qr-block" style={{animationDelay: '1.2s'}} />
                <rect x="50" y="15" width="15" height="10" fill="currentColor" className="qr-block" style={{animationDelay: '1.3s'}} />
                <rect x="35" y="25" width="25" height="10" fill="currentColor" className="qr-block" style={{animationDelay: '1.4s'}} />
                <rect x="65" y="35" width="10" height="20" fill="currentColor" className="qr-block" style={{animationDelay: '1.5s'}} />
                <rect x="5" y="35" width="15" height="15" fill="currentColor" className="qr-block" style={{animationDelay: '1.6s'}} />
                <rect x="25" y="45" width="25" height="10" fill="currentColor" className="qr-block" style={{animationDelay: '1.7s'}} />
                <rect x="55" y="40" width="35" height="10" fill="currentColor" className="qr-block" style={{animationDelay: '1.8s'}} />
                <rect x="85" y="25" width="10" height="10" fill="currentColor" className="qr-block" style={{animationDelay: '1.9s'}} />
                <rect x="35" y="60" width="10" height="25" fill="currentColor" className="qr-block" style={{animationDelay: '2.0s'}} />
                <rect x="50" y="60" width="20" height="15" fill="currentColor" className="qr-block" style={{animationDelay: '2.1s'}} />
                <rect x="75" y="75" width="20" height="20" fill="currentColor" className="qr-block" style={{animationDelay: '2.2s'}} />
                <rect x="50" y="85" width="15" height="10" fill="currentColor" className="qr-block" style={{animationDelay: '2.3s'}} />
                <rect x="25" y="80" width="10" height="15" fill="currentColor" className="qr-block" style={{animationDelay: '2.4s'}} />
                <rect x="75" y="60" width="10" height="10" fill="currentColor" className="qr-block" style={{animationDelay: '2.5s'}} />
              </svg>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs md:text-sm font-semibold tracking-widest mb-8 backdrop-blur-sm shadow-sm relative z-10">
              <span>GENERATE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
              <span>VERIFY</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
              <span>MANAGE</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 drop-shadow-md relative z-10">
              {heroData.title}
            </h1>

            <p className="text-lg md:text-xl text-blue-100 dark:text-gray-300 mb-10 max-w-xl leading-relaxed relative z-10">
              {heroData.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12 relative z-10">
              <button className="bg-white text-blue-700 px-8 py-3.5 rounded-full font-bold hover:bg-gray-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] active:scale-95 text-lg">
                Mulai Sekarang
              </button>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-4 relative z-10">
              <div className="flex items-center gap-2 text-white font-medium">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                Multi-Perangkat
              </div>
              <div className="flex items-center gap-2 text-white font-medium">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                Real-time Analytics
              </div>
              <div className="flex items-center gap-2 text-white font-medium">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                Export PDF & Excel
              </div>
            </div>
          </div>

          <div className={`relative transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="relative w-full aspect-[4/3] md:aspect-auto flex justify-center items-center mt-10 lg:mt-0">
              
              <div className="absolute inset-0 bg-blue-500/30 dark:bg-white/5 rounded-3xl blur-2xl transform rotate-3 scale-105"></div>
              
              <img
                src={heroData.image_url}
                alt="Dashboard Mockup"
                className="relative z-10 w-full max-w-lg lg:max-w-full h-auto object-cover rounded-2xl shadow-2xl border border-white/10"
              />
              
              <div className="absolute -bottom-6 -left-4 sm:-left-10 z-20 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Sistem QR</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">Terverifikasi</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;