import type { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useLMS } from '@/contexts/LMSContext';
import { AppSkeleton } from '@/components/shared/AppSkeleton';

export const AuthLoadingScreen: FC = () => <AppSkeleton />;

export const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, authReady } = useLMS();
  const location = useLocation();
  if (!authReady) {
    return <AuthLoadingScreen />;
  }
  if (!isAuthenticated) {
    const fromPath = location.pathname === '/gabay-rag' ? '/dashboard' : (location.pathname + location.search);
    return <Navigate to="/login" replace state={{ from: fromPath }} />;
  }
  return <>{children}</>;
};
