import React, { useRef, useState } from 'react';
import { useLMS, ACCENT_PRESETS } from '@/contexts/LMSContext';
import { uploadFileToPublic } from '@/utils/fileUploader';
import { hasCustomAvatar } from '@/utils/avatar';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  Building,
  UserCheck,
  ShieldCheck,
  GraduationCap,
  Mail,
  Layers,
  LogOut,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Lock,
  Bell,
  Sliders,
  Eye,
  EyeOff,
  Edit3,
  Save,
  Palette,
  RotateCcw,
  Check,
  Sun,
  Moon,
  MonitorSmartphone,
  Camera,
  Trash2,
  Loader2,
  ImagePlus
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

type ProfileTab = 'overview' | 'preferences' | 'security';

const SettingSwitch: React.FC<{ checked: boolean; onChange: (value: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
      checked ? 'bg-primary' : 'bg-muted-foreground/30'
    }`}
  >
    <span
      className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${
        checked ? 'left-[21px]' : 'left-[3px]'
      }`}
    />
  </button>
);

interface ProfilePageProps {
  onNavigateTab?: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onNavigateTab
}) => {
  const { activeUser, activeRole, db, logout, showConfirm, showAlert, updateUser, accent, customAccentHex, setAccent, setCustomAccentHex, resetAccent, theme, toggleTheme } = useLMS();

  // Active tab within the profile page
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview');

  // Interactive bio editing state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(
    activeRole === 'admin'
      ? 'Overseeing academic programs and curriculum development for the College of Computer Science.'
      : activeRole === 'faculty'
      ? 'Specializing in Theoretical Computer Science, Automata Theory, and High-Performance Distributed Computing Systems.'
      : activeRole === 'staff'
      ? 'Managing student academic records and section allocations.'
      : 'Undergraduate student in BS Computer Science, specialized in Systems Software and Intelligent Distributed Applications.'
  );
  const [saveAlert, setSaveAlert] = useState(false);

  // Preference switches
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [speedGraderAlerts, setSpeedGraderAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  // Profile photo + banner uploads
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
  const MAX_BANNER_BYTES = 8 * 1024 * 1024;

  const handlePhotoFile = async (file: File, kind: 'avatar' | 'banner') => {
    if (!file.type.startsWith('image/')) {
      showAlert({
        title: 'Invalid File',
        message: 'Please choose an image file (PNG, JPG, or WEBP).',
        type: 'warning'
      });
      return;
    }
    const limit = kind === 'avatar' ? MAX_AVATAR_BYTES : MAX_BANNER_BYTES;
    if (file.size > limit) {
      showAlert({
        title: 'File Too Large',
        message: `Please choose an image under ${Math.round(limit / 1024 / 1024)}MB.`,
        type: 'warning'
      });
      return;
    }
    if (kind === 'avatar') setIsUploadingAvatar(true);
    else setIsUploadingBanner(true);
    try {
      const { url } = await uploadFileToPublic(file);
      const ok = await updateUser(currentUser.id, kind === 'avatar' ? { avatar: url } : { banner: url });
      if (ok) {
        showAlert({
          title: kind === 'avatar' ? 'Profile Photo Updated' : 'Banner Updated',
          message: kind === 'avatar'
            ? 'Your new profile photo is now visible across the app.'
            : 'Your new profile banner is now visible on your profile.',
          type: 'success'
        });
      }
    } catch {
      // updateUser / upload already surfaced the alert.
    } finally {
      if (kind === 'avatar') setIsUploadingAvatar(false);
      else setIsUploadingBanner(false);
    }
  };

  const handleRemovePhoto = async (kind: 'avatar' | 'banner') => {
    const ok = await updateUser(currentUser.id, kind === 'avatar' ? { avatar: '' } : { banner: '' });
    if (ok) {
      showAlert({
        title: kind === 'avatar' ? 'Profile Photo Removed' : 'Banner Removed',
        message: kind === 'avatar'
          ? 'Your profile now shows your initial.'
          : 'Your profile banner was removed.',
        type: 'info'
      });
    }
  };

  // Change password form state (email is read-only — no change email here)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [lastPasswordChange, setLastPasswordChange] = useState('14 days ago');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert({
        title: 'Required Information',
        message: 'Please fill in your current password, new password, and confirmation.',
        type: 'warning'
      });
      return;
    }
    if ((currentUser.password || 'gabay2026') !== currentPassword) {
      showAlert({
        title: 'Incorrect Password',
        message: 'Your current password does not match our records.',
        type: 'warning'
      });
      return;
    }
    if (newPassword.length < 8) {
      showAlert({
        title: 'Weak Password',
        message: 'Your new password must be at least 8 characters long.',
        type: 'warning'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert({
        title: 'Passwords Do Not Match',
        message: 'The new password and confirmation do not match.',
        type: 'warning'
      });
      return;
    }
    setIsChangingPassword(true);
    try {
      const ok = await updateUser(currentUser.id, { password: newPassword });
      if (!ok) return;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLastPasswordChange('Just now');
      showAlert({
        title: 'Password Updated',
        message: 'Your account password has been changed successfully.',
        type: 'success'
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const currentUser = activeUser;

  const roleBadges: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
    admin: {
      label: 'Dean / academic admin',
      style: 'bg-primary/10 text-primary border-primary/20',
      icon: <Building className="w-3.5 h-3.5" />
    },
    faculty: {
      label: 'Faculty instructor',
      style: 'bg-primary/10 text-primary border-primary/20',
      icon: <UserCheck className="w-3.5 h-3.5" />
    },
    staff: {
      label: 'Registrar aide',
      style: 'bg-primary/10 text-primary border-primary/20',
      icon: <ShieldCheck className="w-3.5 h-3.5" />
    },
    student: {
      label: 'Enrolled student',
      style: 'bg-primary/10 text-primary border-primary/20',
      icon: <GraduationCap className="w-3.5 h-3.5" />
    }
  };

  const badge = roleBadges[activeRole] || roleBadges.student;

  const userCourses = db.courses.filter(c => {
    if (activeRole === 'student') return (currentUser.enrolledCourseIds || []).includes(c.id);
    if (activeRole === 'faculty') return c.instructorId === currentUser.id;
    return true;
  });

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Sliders className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> }
  ];

  const handleSaveBio = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingBio(false);
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 3000);
  };

  return (
    <div className="flex min-h-full w-full flex-1 flex-col p-6 max-w-6xl mx-auto space-y-6 animate-fade-in pb-16 select-none">
      {/* Top Action Bar */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => onNavigateTab && onNavigateTab('dashboard')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border px-3.5 py-2 rounded-xl transition-all shadow-none cursor-pointer active:scale-[0.98] shrink-0 mt-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex-1">
          <PageHeader
            title="Profile"
            actions={
              <button
                onClick={() => {
                  showConfirm("Are you sure you want to sign out of your GABAY LMS session?", () => {
                    logout();
                  }, "Sign Out");
                }}
                className="inline-flex items-center space-x-1.5 text-xs font-bold bg-destructive hover:bg-destructive/90 active:scale-[0.98] text-destructive-foreground px-3.5 py-2 rounded-xl transition-all shadow-none cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            }
          />
        </div>
      </div>

      {/* Identity hero */}
      <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden">
        {/* Banner cover (uploadable) */}
        <div className="relative h-40 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent overflow-hidden group/cover">
          {currentUser.banner ? (
            <>
              <img
                src={currentUser.banner}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20" />
            </>
          ) : (
            <>
              <div aria-hidden="true" className="absolute -right-16 -top-24 w-72 h-72 rounded-full bg-primary/15 blur-2xl" />
              <div aria-hidden="true" className="absolute right-40 -bottom-32 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
            </>
          )}
          <div className="relative flex items-center justify-between p-5">
            <span className="px-3 py-1 text-[11px] font-semibold bg-card/70 backdrop-blur text-muted-foreground rounded-full border border-border">
              Profile
            </span>
            <span className="flex items-center space-x-2 px-3 py-1 bg-card/70 backdrop-blur rounded-full border border-border">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">Online</span>
            </span>
          </div>
          {/* Banner actions */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 opacity-0 group-hover/cover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
              title={currentUser.banner ? 'Change banner' : 'Upload banner'}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-bold bg-black/55 hover:bg-black/70 text-white backdrop-blur rounded-xl border border-white/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {isUploadingBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              <span>{isUploadingBanner ? 'Uploading…' : currentUser.banner ? 'Change banner' : 'Upload banner'}</span>
            </button>
            {currentUser.banner && !isUploadingBanner && (
              <button
                type="button"
                onClick={() => void handleRemovePhoto('banner')}
                title="Remove banner"
                className="p-1.5 bg-black/55 hover:bg-black/70 text-white backdrop-blur rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handlePhotoFile(file, 'banner');
            }}
          />
        </div>

        {/* Identity row */}
        <div className="px-6 pb-5">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
            <div className="relative group/avatar shrink-0">
              <UserAvatar
                name={currentUser.name}
                src={currentUser.avatar}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-card bg-card shadow-card"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                title="Change profile photo"
                className="absolute inset-0 rounded-2xl bg-black/55 text-white flex flex-col items-center justify-center gap-1 opacity-0 group-hover/avatar:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer disabled:opacity-60"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Change</span>
                  </>
                )}
              </button>
              {hasCustomAvatar(currentUser.avatar) && !isUploadingAvatar && (
                <button
                  type="button"
                  onClick={() => void handleRemovePhoto('avatar')}
                  title="Remove profile photo"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center justify-center shadow-card transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void handlePhotoFile(file, 'avatar');
                }}
              />
            </div>
            <div className="flex-1 min-w-0 md:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  {currentUser.name}
                </h1>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border inline-flex items-center space-x-1.5 ${badge.style}`}>
                  {badge.icon}
                  <span>{badge.label}</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentUser.title} • {currentUser.department}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                {currentUser.email}{currentUser.studentId ? ` • ${currentUser.studentId}` : ''}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 p-2 bg-muted/40 border border-border/70 rounded-2xl">
            <div className="flex items-center gap-2.5 px-3 py-2">
              <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-foreground tabular-nums leading-none">{userCourses.length}</span>
                <span className="block text-[11px] text-muted-foreground mt-1">Courses</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 border-x border-border/60">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-foreground leading-none">Active</span>
                <span className="block text-[11px] text-muted-foreground mt-1">Session</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2">
              <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-foreground leading-none truncate">SSO</span>
                <span className="block text-[11px] text-muted-foreground mt-1">DMMMSU auth</span>
              </span>
            </div>
          </div>

          {/* Segmented tab control */}
          <div className="mt-4 flex p-1 bg-muted rounded-2xl gap-1 overflow-x-auto" role="tablist" aria-label="Profile sections">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={profileTab === t.id}
                onClick={() => setProfileTab(t.id)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  profileTab === t.id
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span className={`px-1.5 py-px text-[10px] font-bold tabular-nums rounded-full ${profileTab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/15 text-muted-foreground'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {saveAlert && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-2 text-xs font-sans font-bold text-emerald-700 dark:text-emerald-400 animate-fade-in shadow-soft">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Profile changes updated and saved to GABAY session database!</span>
        </div>
      )}

      {/* Tab 1: Overview */}
      {profileTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Identity Grid */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-none space-y-4">
            <h3 className="font-semibold text-[12px] text-muted-foreground">
              Identity & contact information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-1">
                <div className="flex items-center space-x-2 text-muted-foreground font-medium">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>Email Address</span>
                </div>
                <div className="font-sans text-foreground font-bold truncate">
                  {currentUser.email}
                </div>
              </div>

              <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-1">
                <div className="flex items-center space-x-2 text-muted-foreground font-medium">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  <span>ID Number</span>
                </div>
                <div className="font-sans text-foreground font-bold">
                  {currentUser.studentId || 'Not assigned'}
                </div>
              </div>
            </div>
          </div>

          {/* Academic Bio & Philosophy Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[12px] text-muted-foreground">
                Academic statement & biography
              </h3>
              {!isEditingBio && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Bio</span>
                </button>
              )}
            </div>

            {isEditingBio ? (
              <form onSubmit={handleSaveBio} className="space-y-3">
                <textarea
                  rows={4}
                  value={bioText}
                  onChange={e => setBioText(e.target.value)}
                  className="w-full p-3.5 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-xs text-foreground leading-relaxed shadow-inner font-sans outline-none"
                />
                <div className="flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(false)}
                    className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-none flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Bio</span>
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-foreground leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/80">
                {bioText}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Preferences */}
      {profileTab === 'preferences' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {/* Appearance group */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5" aria-label="Appearance settings">
              <div>
                <h3 className="font-bold text-foreground text-[13px]">Appearance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Theme mode and accent color apply instantly across the app.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-start space-x-3 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-foreground text-xs">Color theme</div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                      Currently using {theme === 'dark' ? 'dark' : 'light'} mode.
                    </p>
                  </div>
                </div>
                <div className="flex p-1 bg-muted rounded-xl gap-1 shrink-0" role="group" aria-label="Color theme">
                  {(['light', 'dark'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { if (theme !== mode) toggleTheme(); }}
                      aria-pressed={theme === mode}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                        theme === mode
                          ? 'bg-card text-foreground shadow-soft'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {mode === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      <span className="capitalize">{mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Palette className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-foreground text-xs">Accent color</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Applies instantly across buttons, highlights, and focus rings — in both light and dark mode.
                  </p>
                </div>
                {accent !== 'pink' && (
                  <button
                    type="button"
                    onClick={resetAccent}
                    title="Reset to default color"
                    className="flex items-center space-x-1 px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5 pl-7">
                {ACCENT_PRESETS.map(preset => {
                  const isActive = accent === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAccent(preset.id)}
                      title={preset.label}
                      aria-label={`Use ${preset.label} accent`}
                      aria-pressed={isActive}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105'
                          : 'hover:scale-105 ring-1 ring-border'
                      }`}
                      style={{ backgroundColor: preset.swatch }}
                    >
                      {isActive && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  );
                })}
                <label
                  title="Custom color"
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 overflow-hidden ${
                    accent === 'custom'
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105'
                      : 'hover:scale-105 ring-1 ring-border ring-dashed'
                  }`}
                  style={{ backgroundColor: customAccentHex }}
                >
                  <span className="text-white text-sm font-bold leading-none select-none">+</span>
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(customAccentHex) ? customAccentHex : '#0E7A5C'}
                    onChange={e => setCustomAccentHex(e.target.value)}
                    aria-label="Pick a custom accent color"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
                <span className="text-[11px] text-muted-foreground ml-1">
                  {accent === 'custom'
                    ? `Custom ${customAccentHex}`
                    : ACCENT_PRESETS.find(p => p.id === accent)?.label ?? ''}
                  {` · ${theme === 'dark' ? 'Dark' : 'Light'} mode`}
                </span>
              </div>
              </div>
            </section>

            {/* Notifications group */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4 text-xs" aria-label="Notification settings">
              <div>
                <h3 className="font-bold text-foreground text-[13px]">Notifications</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time alerts, email digests, and grading updates.
                </p>
              </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-start space-x-3">
                <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-foreground">Instant Email Notifications</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Receive immediate notifications for announcement postings and urgent advising messages.
                  </p>
                </div>
              </div>
              <SettingSwitch checked={emailNotifications} onChange={setEmailNotifications} label="Instant email notifications" />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-start space-x-3">
                <Sliders className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-foreground">SpeedGrader & Submission Alerts</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Trigger desktop toast alerts when activities are graded or submitted for evaluation.
                  </p>
                </div>
              </div>
              <SettingSwitch checked={speedGraderAlerts} onChange={setSpeedGraderAlerts} label="SpeedGrader and submission alerts" />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-start space-x-3">
                <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-foreground">Weekly Academic Activity Digest</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Summary of upcoming module deadlines, quizzes, and office advising sessions.
                  </p>
                </div>
              </div>
              <SettingSwitch checked={weeklyDigest} onChange={setWeeklyDigest} label="Weekly academic activity digest" />
            </div>

          <div className="pt-1 flex justify-end">
            <button
              onClick={() => {
                setSaveAlert(true);
                setTimeout(() => setSaveAlert(false), 3000);
              }}
              className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-primary-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              Update Notification Settings
            </button>
          </div>
            </section>
          </div>
        </div>
      )}

      {/* Tab 4: Security & Sessions */}
      {profileTab === 'security' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {/* Sign-in group */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4 text-xs" aria-label="Sign-in and verification">
              <div>
                <h3 className="font-bold text-foreground text-[13px]">Sign-in & verification</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Two-factor authentication for your account.
                </p>
              </div>
            <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-foreground flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Two-Factor Authentication (2FA)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 text-[10px] font-sans font-bold rounded border ${
                    twoFactorAuth
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {twoFactorAuth ? 'Enforced' : 'Disabled'}
                  </span>
                  <SettingSwitch checked={twoFactorAuth} onChange={setTwoFactorAuth} label="Two-factor authentication" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Single sign-on requires hardware token or registered authenticator code for all faculty and administrative access.
              </p>
            </div>
            </section>

            {/* Sessions group */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4 text-xs" aria-label="Active sessions">
              <div>
                <h3 className="font-bold text-foreground text-[13px]">Active sessions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Devices currently signed in to your account.
                </p>
              </div>
            <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-foreground flex items-center space-x-2">
                  <MonitorSmartphone className="w-4 h-4 text-primary" />
                  <span>Current browser session</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
                  This device
                </span>
              </div>
              <div className="font-sans text-[11px] text-muted-foreground space-y-1">
                <div>Client Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)</div>
                <div>IP Address: 192.168.1.42 (DMMMSU-SLUC Gateway)</div>
                <div>Session Authenticated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</div>
              </div>
            </div>
            </section>
          </div>

          {/* Change password */}
          <section className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4 text-xs" aria-label="Change password">
            <div>
              <h3 className="font-bold text-foreground text-[13px]">Change password</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter your current password, then choose a new one. Your email address cannot be changed here.
              </p>
            </div>
            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Current password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    className="w-full pr-10 p-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans outline-none focus:ring-2 focus:ring-primary/30 shadow-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="w-full pr-10 p-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans outline-none focus:ring-2 focus:ring-primary/30 shadow-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    className="w-full pr-10 p-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans outline-none focus:ring-2 focus:ring-primary/30 shadow-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-primary-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl px-6 py-4 shadow-card">
            <span className="text-[11px] text-muted-foreground">
              Last password change: {lastPasswordChange}
            </span>
            <button
              onClick={() => {
                showConfirm("Are you sure you want to sign out and revoke this session?", () => {
                  logout();
                }, "Terminate Session");
              }}
              className="px-4 py-2 text-xs font-bold bg-card border border-border hover:bg-muted text-foreground rounded-xl transition-all shadow-none cursor-pointer active:scale-[0.98]"
            >
              Terminate Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
