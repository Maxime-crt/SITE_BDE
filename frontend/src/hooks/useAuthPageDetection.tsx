import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function useAuthPageDetection() {
  const location = useLocation();
  const { setAuthPage } = useTheme();

  useEffect(() => {
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    setAuthPage(isAuthPage);
  }, [location.pathname, setAuthPage]);
}