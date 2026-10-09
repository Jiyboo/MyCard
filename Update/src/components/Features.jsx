import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Features = () => {
  const [featuresData, setFeaturesData] = useState([]);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await fetch(`${API_URL}/api/landing`);
        if (response.ok) {
          const data = await response.json();
          if (data.features && Array.isArray(data.features)) {
            setFeaturesData(data.features);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchFeatures();
  }, []);

  const getIcon = (index) => {
    const type = index % 3;
    if (type === 0) {
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      );
    }
    if (type === 1) {
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    );
  };

  const getBackAnimation = (index) => {
    const type = index % 3;
    if (type === 0) {
      return (
        <div className="absolute inset-0 bg-gray-900 overflow-hidden flex items-center justify-center rounded-2xl">
          <div className="w-32 h-32 bg-[rgb(var(--theme-500))] rounded-full mix-blend-screen filter blur-2xl absolute animate-[float1_4s_infinite_alternate]"></div>
          <div className="w-24 h-24 bg-purple-500 rounded-full mix-blend-screen filter blur-2xl absolute right-10 top-10 animate-[float2_5s_infinite_alternate]"></div>
          
          <div className="w-36 h-48 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 flex flex-col items-center z-10 animate-[float3_3s_infinite_ease-in-out]">
            
            <div className="w-16 h-16 rounded-full border-2 border-[rgb(var(--theme-400))] p-0.5 overflow-hidden opacity-0 group-hover:animate-pop-image" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
               <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80" alt="User" className="w-full h-full rounded-full object-cover" />
            </div>

            <div className="mt-3 w-full flex flex-col items-center">
               <div className="inline-block overflow-hidden whitespace-nowrap border-r-2 border-transparent w-0 opacity-0 group-hover:animate-type-name" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
                 <span className="text-white font-bold text-xs tracking-wide">Lorem ipsum</span>
               </div>
               <div className="w-0 h-1.5 bg-[rgb(var(--theme-400))] rounded-full mt-2 opacity-0 group-hover:animate-load-bar" style={{ animationDelay: '2.4s', animationFillMode: 'forwards' }}></div>
               <div className="w-0 h-1.5 bg-white/30 rounded-full mt-1.5 opacity-0 group-hover:animate-load-bar-short" style={{ animationDelay: '2.6s', animationFillMode: 'forwards' }}></div>
            </div>
            
          </div>
        </div>
      );
    }
    if (type === 1) {
      return (
        <div className="absolute inset-0 bg-gray-900 overflow-hidden flex items-center justify-center rounded-2xl">
          <div className="relative w-36 h-36 bg-white rounded-xl p-3 flex flex-col justify-between shadow-[0_0_40px_rgba(var(--theme-500),0.4)] z-10">
            <div className="flex justify-between">
              <div className="w-8 h-8 border-4 border-gray-900 rounded-sm flex items-center justify-center"><div className="w-2 h-2 bg-gray-900"></div></div>
              <div className="w-8 h-8 border-4 border-gray-900 rounded-sm flex items-center justify-center"><div className="w-2 h-2 bg-gray-900"></div></div>
            </div>
            <div className="flex justify-between items-end">
              <div className="w-8 h-8 border-4 border-gray-900 rounded-sm flex items-center justify-center"><div className="w-2 h-2 bg-gray-900"></div></div>
              <div className="w-12 h-12 flex flex-wrap gap-1">
                <div className="w-4 h-3 bg-gray-900"></div>
                <div className="w-3 h-4 bg-gray-900"></div>
                <div className="w-6 h-3 bg-gray-900"></div>
                <div className="w-3 h-5 bg-gray-900"></div>
                <div className="w-5 h-2 bg-gray-900"></div>
              </div>
            </div>
            <div className="absolute left-1 right-1 h-0.5 bg-[rgb(var(--theme-500))] shadow-[0_0_15px_3px_rgba(var(--theme-500),0.9)] animate-[scan_2s_linear_infinite]"></div>
          </div>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 bg-gray-900 overflow-hidden flex items-center justify-center rounded-2xl">
        <div className="w-56 h-32 relative z-10 flex flex-col justify-end pb-4">
          <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_8px_rgba(var(--theme-400),0.6)]" viewBox="0 0 200 100">
            
            <path 
              d="M 35,55 C 20,45 40,20 50,25 C 65,30 40,65 55,65 C 70,65 75,35 80,30 C 85,25 75,30 70,50 C 65,75 55,90 70,85 C 80,80 85,60 90,55 C 95,50 85,65 95,65 C 105,65 110,50 115,50 C 110,50 105,65 115,65 C 125,65 130,25 135,25 C 140,25 125,65 135,65 C 145,65 150,55 155,50" 
              fill="none" 
              stroke="rgb(var(--theme-400))" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="group-hover:animate-signature"
              style={{ strokeDasharray: 400, strokeDashoffset: 400, animationDelay: '0.2s', animationDuration: '1.5s' }}
            />
            
            <path 
              d="M 30,75 L 145,72" 
              fill="none" 
              stroke="rgb(var(--theme-400))" 
              strokeWidth="3" 
              strokeLinecap="round" 
              className="group-hover:animate-signature"
              style={{ strokeDasharray: 150, strokeDashoffset: 150, animationDelay: '1.4s', animationDuration: '0.5s' }}
            />

            <path 
              d="M 160,67 L 160.1,67" 
              fill="none" 
              stroke="rgb(var(--theme-400))" 
              strokeWidth="5" 
              strokeLinecap="round" 
              className="group-hover:animate-signature"
              style={{ strokeDasharray: 10, strokeDashoffset: 10, animationDelay: '1.8s', animationDuration: '0.2s' }}
            />

          </svg>
        </div>
      </div>
    );
  };

  return (
    <section id="fitur" className="py-24 bg-white dark:bg-gray-900 transition-colors duration-500">
      
      <style>{`
        @keyframes float1 { 
          0% { transform: translate(0, 0) scale(1); } 
          100% { transform: translate(20px, -20px) scale(1.3); } 
        }
        @keyframes float2 { 
          0% { transform: translate(0, 0) scale(1); } 
          100% { transform: translate(-30px, 30px) scale(1.2); } 
        }
        @keyframes float3 { 
          0%, 100% { transform: translateY(0); } 
          50% { transform: translateY(-12px); } 
        }
        @keyframes scan { 
          0%, 100% { top: 10%; opacity: 0; } 
          15%, 85% { opacity: 1; } 
          50% { top: 90%; } 
        }
        @keyframes sign { 
          to { stroke-dashoffset: 0; } 
        }
        
        @keyframes popImage {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes typeName {
          0% { width: 0; opacity: 1; border-right-color: white; }
          80% { width: 100px; opacity: 1; border-right-color: white; }
          100% { width: 100px; opacity: 1; border-right-color: transparent; }
        }
        @keyframes loadBar {
          0% { width: 0; opacity: 0; }
          1% { opacity: 1; }
          100% { width: 80%; opacity: 1; }
        }
        @keyframes loadBarShort {
          0% { width: 0; opacity: 0; }
          1% { opacity: 1; }
          100% { width: 60%; opacity: 1; }
        }

        .group-hover\\:animate-signature { animation: none; }
        .group:hover .group-hover\\:animate-signature { 
          animation-name: sign;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }

        .group-hover\\:animate-pop-image { animation: none; }
        .group:hover .group-hover\\:animate-pop-image { animation: popImage 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        
        .group-hover\\:animate-type-name { animation: none; }
        .group:hover .group-hover\\:animate-type-name { animation: typeName 1.5s steps(13, end) forwards; }
        
        .group-hover\\:animate-load-bar { animation: none; }
        .group:hover .group-hover\\:animate-load-bar { animation: loadBar 0.5s ease-out forwards; }
        
        .group-hover\\:animate-load-bar-short { animation: none; }
        .group:hover .group-hover\\:animate-load-bar-short { animation: loadBarShort 0.5s ease-out forwards; }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 transition-colors">
            Kemudahan Akses dan Pengelolaan
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors">
            Arahkan kursor ke kartu di bawah ini untuk melihat contoh integrasi sistem kami.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {featuresData.map((feature, index) => (
            <div key={feature.id || index} className="group h-96 [perspective:1000px] cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-xl rounded-2xl">
                
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-gray-50 dark:bg-gray-800 rounded-2xl flex flex-col items-center justify-center p-8 border border-gray-200 dark:border-gray-700 transition-colors">
                  <div className="w-16 h-16 bg-[rgb(var(--theme-100))] dark:bg-[rgba(var(--theme-900),0.5)] text-[rgb(var(--theme-600))] dark:text-[rgb(var(--theme-400))] rounded-full flex items-center justify-center mb-6 transition-colors shadow-inner">
                    {getIcon(index)}
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white text-center transition-colors">
                    {feature.title_front}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed transition-colors">
                    {feature.desc_front}
                  </p>
                </div>

                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl overflow-hidden group-hover:shadow-2xl">
                  
                  {getBackAnimation(index)}
                  
                  <div className="absolute inset-0 bg-black/70 flex flex-col justify-end p-6 z-20 pointer-events-none">
                    <div className="text-white w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <h4 className="text-xl font-bold mb-2">{feature.title_back}</h4>
                      <p className="text-sm text-gray-200 line-clamp-3 mb-3">{feature.desc_back}</p>
                      <div className="w-12 h-1 bg-[rgb(var(--theme-500))] rounded"></div>
                    </div>
                  </div>
                  
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;