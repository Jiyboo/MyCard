import { useEffect } from 'react';

export const useSessionTimeout = (onLogout) => {
  useEffect(() => {
    const checkSession = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      const loginTime = localStorage.getItem('loginTime');

      if (!lastActivity || !loginTime) return;

      const now = Date.now();
      const idleTime = now - parseInt(lastActivity, 10);
      const totalTime = now - parseInt(loginTime, 10);

      if (idleTime > 3600000 || totalTime > 86400000) {
        localStorage.clear();
        if (onLogout) onLogout();
      }
    };

    const updateActivity = () => {
      if (localStorage.getItem('token')) {
        localStorage.setItem('lastActivity', Date.now().toString());
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, updateActivity));

    const interval = setInterval(checkSession, 10000);

    return () => {
      events.forEach(event => document.removeEventListener(event, updateActivity));
      clearInterval(interval);
    };
  }, [onLogout]);
};