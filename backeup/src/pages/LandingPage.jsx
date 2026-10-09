import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';
import ThemeSettings from '../components/ThemeSettings';

const LandingPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-grow">
        <Hero onNavigate={onNavigate} />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
      <ThemeSettings />
    </div>
  );
};

export default LandingPage;