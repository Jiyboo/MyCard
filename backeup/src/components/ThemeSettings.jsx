import { useState, useEffect } from 'react';

const ThemeSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState('#2563eb');

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [37, 99, 235];
  };

  const mixColors = (color, base, weight) => {
    const r = Math.round(color[0] * weight + base[0] * (1 - weight));
    const g = Math.round(color[1] * weight + base[1] * (1 - weight));
    const b = Math.round(color[2] * weight + base[2] * (1 - weight));
    return `${r} ${g} ${b}`;
  };

  const applyTheme = (hex) => {
    const rgb = hexToRgb(hex);
    const white = [255, 255, 255];
    const black = [0, 0, 0];

    const themeVars = {
      '--theme-300': mixColors(rgb, white, 0.4),
      '--theme-400': mixColors(rgb, white, 0.6),
      '--theme-500': mixColors(rgb, white, 0.8),
      '--theme-600': `${rgb[0]} ${rgb[1]} ${rgb[2]}`,
      '--theme-700': mixColors(rgb, black, 0.8),
      '--theme-800': mixColors(rgb, black, 0.6),
      '--theme-900': mixColors(rgb, black, 0.4),
    };

    const root = document.documentElement;
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    localStorage.setItem('app-color-theme', hex);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-color-theme');
    if (savedTheme) {
      setCurrentColor(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const handleColorChange = (e) => {
    const val = e.target.value;
    setCurrentColor(val);
    applyTheme(val);
  };

  const handleTextInputChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('#') && val.length > 0) {
      val = '#' + val;
    }
    
    setCurrentColor(val);
    if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
      let validHex = val;
      if (val.length === 4) {
        validHex = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
      }
      applyTheme(validHex);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={`absolute bottom-20 right-0 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300 origin-bottom-right w-64 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 text-center">Sesuaikan Warna Tema</h4>
        
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full h-12 rounded-lg overflow-hidden shadow-inner border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="color"
              value={currentColor.length === 7 ? currentColor : '#2563eb'}
              onChange={handleColorChange}
              className="absolute -top-2 -left-2 w-[120%] h-[120%] cursor-pointer"
            />
          </div>
          
          <div className="flex items-center justify-between w-full text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>Kode Warna:</span>
            <input
              type="text"
              value={currentColor}
              onChange={handleTextInputChange}
              maxLength={7}
              placeholder="#2563EB"
              className="w-24 uppercase bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1.5 rounded border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-center transition-colors"
            />
          </div>
        </div>
        
      </div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(var(--theme-600),0.5)] hover:scale-105 active:scale-95 transition-all"
      >
        <svg className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>
    </div>
  );
};

export default ThemeSettings;