import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardLayout from './components/layouts/DashboardLayout';
import ThemeSettings from './components/ThemeSettings';
import ScanQR from './components/ScanQR';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-500">
      {currentPage === 'landing' && <LandingPage onNavigate={setCurrentPage} />}
      {currentPage === 'auth' && <AuthPage onNavigate={setCurrentPage} />}
      {currentPage === 'dashboard' && <DashboardLayout onNavigate={setCurrentPage} />}
      {currentPage === 'scan' && <ScanQR onNavigate={setCurrentPage} />}
      
      <ThemeSettings />
    </div>
  );
}

export default App;