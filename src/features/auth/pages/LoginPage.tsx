import React, { useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, theme, toggleTheme, showAlert } = useLMS();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(identifier, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email: string) => {
    setIdentifier(email);
    setPassword('gabay2026');
    setErrorMessage('');
    setIsLoading(true);
    setTimeout(async () => {
      await login(email, 'gabay2026');
      setIsLoading(false);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4 relative overflow-hidden text-foreground select-none font-sans">
      {/* Subtle Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Theme Button */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer"
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-amber-500" />
          )}
        </button>
      </div>

      {/* Cellwego Glass Login Card */}
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 space-y-6 z-10 animate-scale-in">
        {/* Simple Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/gabay-logo.png"
            alt="GABAY logo"
            className="w-16 h-16 mx-auto rounded-2xl object-contain bg-transparent"
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground font-sans">
              GABAY
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sign in to your academic portal
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start space-x-2 text-xs text-destructive animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-muted-foreground">
              Email or ID
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                value={identifier}
                onChange={e => {
                  setIdentifier(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="name@dmmmsu.edu.ph"
                className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-sans"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold text-muted-foreground">Password</label>
              <button
                type="button"
                onClick={() => {
                  showAlert({
                    title: "Reset Password",
                    message: (
                      <div className="space-y-2">
                        <p>To reset your account password, please contact the chairperson or visit dean's office.</p>
                        <div className="p-2.5 bg-muted rounded-xl text-xs font-sans text-foreground select-text">
                          Email: it.support@dmmmsu.edu.ph
                        </div>
                      </div>
                    ),
                    type: "info",
                    confirmText: "Understood"
                  });
                }}
                className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-sans"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center text-xs">
            <label className="flex items-center space-x-2 cursor-pointer text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="rounded border-border accent-primary"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 active:scale-[0.99] text-primary-foreground rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Clean Demo Accounts */}
        <div className="pt-3 border-t border-border space-y-2">
          <span className="text-[12px] font-semibold text-muted-foreground block text-center font-sans">
            Quick demo login
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('dean1@dmmmsu.edu.ph')}
              className="py-1.5 px-2 bg-muted/50 hover:bg-primary/10 hover:border-primary/30 border border-border rounded-lg text-xs font-semibold text-foreground transition-all text-center cursor-pointer"
            >
              Dean 1
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('faculty1@dmmmsu.edu.ph')}
              className="py-1.5 px-2 bg-muted/50 hover:bg-primary/10 hover:border-primary/30 border border-border rounded-lg text-xs font-semibold text-foreground transition-all text-center cursor-pointer"
            >
              Faculty 1
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('staff1@dmmmsu.edu.ph')}
              className="py-1.5 px-2 bg-muted/50 hover:bg-primary/10 hover:border-primary/30 border border-border rounded-lg text-xs font-semibold text-foreground transition-all text-center cursor-pointer"
            >
              Staff 1
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('student1@dmmmsu.edu.ph')}
              className="py-1.5 px-2 bg-muted/50 hover:bg-primary/10 hover:border-primary/30 border border-border rounded-lg text-xs font-semibold text-foreground transition-all text-center cursor-pointer"
            >
              Student 1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
