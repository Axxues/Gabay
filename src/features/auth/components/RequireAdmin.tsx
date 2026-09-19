import type { FC, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useLMS } from '@/contexts/LMSContext';

export const RequireAdmin: FC<{ children: ReactNode }> = ({ children }) => {
  const { activeRole } = useLMS();
  if (activeRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
