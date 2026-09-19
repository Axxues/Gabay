import React from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { UserRole } from '@/services/lms/types/lms.types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallbackMessage?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallbackMessage = "Access Restricted: This feature or tool is reserved for authorized faculty and academic administrators."
}) => {
  const { activeRole, setIsRoleModalOpen } = useLMS();

  if (!allowedRoles.includes(activeRole)) {
    return (
      <div className="p-8 max-w-3xl mx-auto my-12 bg-card border border-border rounded-2xl shadow-subtle">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-primary/10 text-primary border border-primary/20 rounded-xl shrink-0 shadow-soft">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-3">
            <div>
              <span className="px-2.5 py-1 text-xs font-sans font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-lg border border-primary/20">
                HTTP 403 / RBAC RESTRICTION
              </span>
              <h2 className="text-xl font-extrabold text-foreground mt-2">
                Access Restricted
              </h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {fallbackMessage}
            </p>

            <div className="p-3.5 bg-muted/30 rounded-xl border border-border text-xs font-sans text-muted-foreground space-y-1">
              <div>Current Role: <span className="font-bold text-foreground uppercase">{activeRole}</span></div>
              <div>Required Roles: <span className="font-bold text-foreground uppercase">{allowedRoles.join(', ')}</span></div>
              <div>Compliance Guard: <span className="text-foreground">RA 10173 Philippine Data Privacy Act & CHED CMO 25 s. 2015</span></div>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-primary-sm active:scale-[0.98] cursor-pointer"
              >
                Switch Role to Test
              </button>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold border border-border text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return Back</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
