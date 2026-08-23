import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const HowItWorks = () => {
  const [sections, setSections] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [animState, setAnimState] = useState({ step: 0, phase: 'card' });

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        const response = await fetch(`${API_URL}/api/landing`);
        if (response.ok) {
          const data = await response.json();
          if (data.step_sections && Array.isArray(data.step_sections)) {
            setSections(data.step_sections);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchSteps();
  }, []);

  useEffect(() => {
    if (!sections.length || !sections[activeTab]?.steps?.length) return;
    const stepsCount = sections[activeTab].steps.length;

    const timer = setTimeout(() => {
      if (animState.phase === 'card') {
        if (stepsCount > 1) {
          setAnimState({ step: animState.step, phase: 'line' });
        }
      } else {
        setAnimState({ step: (animState.step + 1) % stepsCount, phase: 'card' });
      }
    }, animState.phase === 'card' ? 2500 : 800);

    return () => clearTimeout(timer);
  }, [animState, activeTab, sections]);

  if (!sections || sections.length === 0) {
    return null;
  }

  const currentSection = sections[activeTab];
  const steps = currentSection?.steps || [];

  const colClasses = {
    1: 'lg:col-start-1',
    2: 'lg:col-start-2',
    3: 'lg:col-start-3'
  };

  return (
    <section id="cara-kerja" className="py-24 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-500 overflow-hidden">
      <style>{`
        @keyframes beamRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes beamLeft {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes beamDown {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-beam-right { animation: beamRight 0.8s linear forwards; }
        .animate-beam-left { animation: beamLeft 0.8s linear forwards; }
        .animate-beam-down { animation: beamDown 0.8s linear forwards; }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 transition-colors">
            Panduan Penggunaan
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors">
            Ikuti langkah-langkah di bawah ini untuk memahami alur sistem manajemen kartu keanggotaan.
          </p>
        </div>

        <div className="relative flex w-full max-w-3xl mx-auto bg-gray-200/70 dark:bg-gray-900/50 rounded-full p-2 mb-20 shadow-inner border border-gray-100 dark:border-gray-800">
          <div
            className="absolute top-2 bottom-2 rounded-full bg-[rgb(var(--theme-600))] shadow-md transition-all duration-500 ease-out"
            style={{
              width: `calc((100% - 16px) / ${sections.length})`,
              transform: `translateX(calc(${activeTab} * 100%))`
            }}
          ></div>
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveTab(index);
                setAnimState({ step: 0, phase: 'card' });
              }}
              className={`relative z-10 flex-1 py-3 text-sm md:text-base font-bold rounded-full transition-colors duration-300 ${
                activeTab === index
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-y-12 lg:gap-y-16 lg:gap-x-12 relative w-full lg:grid-flow-row-dense">
          {steps.map((step, index) => {
            const row = Math.floor(index / 3);
            const pos = index % 3;
            const isEvenRow = row % 2 === 0;
            
            const colNum = isEvenRow ? pos + 1 : 3 - pos;
            const colClass = colClasses[colNum];

            const isCardActive = animState.step === index && animState.phase === 'card';
            const isLineActive = animState.step === index && animState.phase === 'line';

            return (
              <div key={step.id} className={`relative flex justify-center w-full ${colClass}`}>
                
                <div 
                  className={`w-full max-w-[340px] bg-white dark:bg-gray-900 rounded-[2rem] p-8 border transition-all duration-500 ease-out flex flex-col ${
                    isCardActive 
                      ? 'scale-105 shadow-[0_15px_40px_rgba(var(--theme-500),0.25)] border-[rgb(var(--theme-500))] z-10 opacity-100' 
                      : 'scale-95 shadow-sm border-gray-100 dark:border-gray-800 opacity-60 z-0 hover:opacity-80'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl mb-6 transition-colors duration-500 ${
                    isCardActive 
                      ? 'bg-[rgb(var(--theme-600))] text-white shadow-lg shadow-[rgba(var(--theme-600),0.4)]' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }`}>
                    {step.step_number}
                  </div>
                  <h3 className={`text-xl font-extrabold mb-3 transition-colors duration-500 ${
                    isCardActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm leading-relaxed font-medium transition-colors duration-500 ${
                    isCardActive ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>

                {pos < 2 && index < steps.length - 1 && (
                  <div className={`hidden lg:block absolute top-1/2 w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden transform -translate-y-1/2 z-0
                    ${isEvenRow ? '-right-12' : '-left-12'}`}
                  >
                    {isLineActive && (
                      <div className={`absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[rgb(var(--theme-500))] to-transparent shadow-[0_0_12px_rgb(var(--theme-500))]
                        ${isEvenRow ? 'animate-beam-right' : 'animate-beam-left'}`}
                      ></div>
                    )}
                  </div>
                )}

                {pos === 2 && index < steps.length - 1 && (
                  <div className="hidden lg:block absolute -bottom-16 left-1/2 w-1.5 h-16 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden transform -translate-x-1/2 z-0">
                    {isLineActive && (
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-[rgb(var(--theme-500))] to-transparent animate-beam-down shadow-[0_0_12px_rgb(var(--theme-500))]"></div>
                    )}
                  </div>
                )}

                {index < steps.length - 1 && (
                  <div className="block lg:hidden absolute -bottom-12 left-1/2 w-1 h-12 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden transform -translate-x-1/2 z-0">
                    {isLineActive && (
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-[rgb(var(--theme-500))] to-transparent animate-beam-down shadow-[0_0_12px_rgb(var(--theme-500))]"></div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;