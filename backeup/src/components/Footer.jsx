import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Footer = () => {
  const defaultFooter = {
    about_text: 'Platform manajemen kartu anggota digital yang terintegrasi, aman, dan dirancang khusus untuk mempermudah proses verifikasi serta pengelolaan data di berbagai skala organisasi.',
    email: 'support@jiaf.com',
    phone: '+62 812 3456 7890',
    address: 'Jakarta Timur\nDKI Jakarta, Indonesia',
    copyright: '2026 Jiaf. Seluruh hak dilindungi undang-undang.',
    Website_link: 'https://Website.com',
    instagram_link: 'https://instagram.com/afsl.co/'
  };

  const [footerData, setFooterData] = useState(defaultFooter);

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/landing`);
        if (response.ok) {
          const data = await response.json();
          if (data.footer) {
            setFooterData({
              about_text: data.footer.about_text || defaultFooter.about_text,
              email: data.footer.email || defaultFooter.email,
              phone: data.footer.phone || defaultFooter.phone,
              address: data.footer.address || defaultFooter.address,
              copyright: data.footer.copyright || defaultFooter.copyright,
              Website_link: data.footer.Website_link || defaultFooter.Website_link,
              instagram_link: data.footer.instagram_link || defaultFooter.instagram_link
            });
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchFooterData();
  }, []);

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 transition-colors duration-500 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          <div className="md:pr-8">
            <h3 className="text-3xl font-extrabold text-[rgb(var(--theme-600))] mb-4 transition-colors">Jiaf</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed transition-colors">
              {footerData.about_text}
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 transition-colors">Tautan Cepat</h4>
            <ul className="space-y-4">
              <li>
                <a href="#beranda" className="text-gray-600 dark:text-gray-400 hover:text-[rgb(var(--theme-600))] dark:hover:text-[rgb(var(--theme-400))] transition-colors font-medium">Beranda</a>
              </li>
              <li>
                <a href="#fitur" className="text-gray-600 dark:text-gray-400 hover:text-[rgb(var(--theme-600))] dark:hover:text-[rgb(var(--theme-400))] transition-colors font-medium">Fitur Utama</a>
              </li>
              <li>
                <a href="#cara-kerja" className="text-gray-600 dark:text-gray-400 hover:text-[rgb(var(--theme-600))] dark:hover:text-[rgb(var(--theme-400))] transition-colors font-medium">Cara Kerja</a>
              </li>
              <li>
                <a href="#scan" className="text-gray-600 dark:text-gray-400 hover:text-[rgb(var(--theme-600))] dark:hover:text-[rgb(var(--theme-400))] transition-colors font-medium">Scan QR Code</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 transition-colors">Hubungi Kami</h4>
            <ul className="space-y-4 text-gray-600 dark:text-gray-400 transition-colors">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[rgb(var(--theme-600))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                {footerData.email}
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[rgb(var(--theme-600))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                {footerData.phone}
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[rgb(var(--theme-600))] mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span className="whitespace-pre-line">{footerData.address}</span>
              </li>
            </ul>
          </div>
          
        </div>
        
        <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            &copy; {footerData.copyright}
          </p>
          <div className="flex gap-6">
            <a href={footerData.Website_link} className="text-gray-400 hover:text-[rgb(var(--theme-600))] transition-colors" aria-label="Website">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </a>
            <a href={footerData.instagram_link} className="text-gray-400 hover:text-[rgb(var(--theme-600))] transition-colors" aria-label="Instagram">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;