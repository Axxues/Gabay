import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import { formatIdNumber, isValidIdNumber, ID_NUMBER_EXAMPLE } from '@/utils/idNumber';
import type { User, UserRole } from '@/services/lms/types/lms.types';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  ArrowLeft,
  UserPlus,
  Mail,
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  Search,
  Building,
  UserCheck,
  GraduationCap,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

const DEPARTMENTS = [
  'Department of Computer Science',
  'Department of Information Technology',
  'Department of Information Systems',
  'College of Computer Science',
  'Office of the College Registrar',
  'Office of the Dean'
];

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  icon,
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);
  const filteredOptions = searchable && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase().trim()))
    : options;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2.5 bg-background border rounded-xl text-xs font-sans transition-all cursor-pointer ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-none'
            : 'border-border hover:border-primary/50 text-foreground'
        }`}
      >
        <div className="flex items-center space-x-2 truncate min-w-0 mr-2">
          {selectedOption?.icon || icon ? (
            <span className="shrink-0">{selectedOption?.icon || icon}</span>
          ) : null}
          <span className="truncate font-semibold text-foreground">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 dropdown-panel p-1.5 z-[120] animate-dropdown max-h-64 flex flex-col shadow-xl">
          {searchable && options.length > 4 && (
            <div className="p-1 pb-1.5 border-b border-border/60 mb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter options..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-muted/40 border border-border rounded-lg text-xs font-sans outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto custom-scrollbar space-y-0.5 max-h-52">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">No matching options</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'text-foreground hover:bg-primary/10 hover:text-primary font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate mr-2">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface EditAccountPageProps {
  user: User;
  onNavigateTab: (tab: string) => void;
}

export const EditAccountPage: React.FC<EditAccountPageProps> = ({ user, onNavigateTab }) => {
  const { updateUser, showAlert } = useLMS();

  const [formEmail, setFormEmail] = useState(user.email || '');
  const [formIdNumber, setFormIdNumber] = useState(user.studentId || '');
  const [formRole, setFormRole] = useState<UserRole>(user.role);
  const [formDepartment, setFormDepartment] = useState(user.department || 'Department of Computer Science');
  const [formPassword, setFormPassword] = useState(user.password || 'gabay2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departmentSelectOptions: DropdownOption[] = useMemo(() => DEPARTMENTS.map(d => ({
    value: d,
    label: d,
    icon: <Building className="w-3.5 h-3.5 text-muted-foreground" />
  })), []);

  const roleOptions: DropdownOption[] = [
    { value: 'faculty', label: 'Faculty Instructor', icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> },
    { value: 'student', label: 'Enrolled Student', icon: <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> },
    { value: 'staff', label: 'Non-Teaching Staff', icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> },
    { value: 'admin', label: 'Dean / Administrator', icon: <Building className="w-3.5 h-3.5 text-primary" /> }
  ];

  const previewMeta = useMemo(() => {
    const defaultTitle = formRole === 'student' ? 'Student' : formRole === 'faculty' ? 'Faculty Instructor' : formRole === 'admin' ? 'Dean / Administrator' : 'Staff / Registrar Aide';
    const roleLabel = formRole === 'admin' ? 'Dean / admin' : formRole === 'faculty' ? 'Faculty' : formRole === 'staff' ? 'Registrar / staff' : 'Student';
    return { defaultTitle, roleLabel };
  }, [formRole]);

  const handleBack = () => onNavigateTab('accounts');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formEmail.trim();
    const cleanIdNumber = formIdNumber.trim();
    if (!cleanEmail) {
      showAlert({
        title: 'Required Information',
        message: 'Please provide an Institutional Email.',
        type: 'warning'
      });
      return;
    }
    if (!cleanIdNumber) {
      showAlert({
        title: 'Required Information',
        message: 'Please provide an ID Number for this account.',
        type: 'warning'
      });
      return;
    }
    if (!isValidIdNumber(cleanIdNumber)) {
      showAlert({
        title: 'Invalid ID Number',
        message: `ID Number must follow the format XXX-XXXX-X (e.g. ${ID_NUMBER_EXAMPLE}).`,
        type: 'warning'
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const finalName = user.name?.trim() || cleanEmail;
      const ok = await updateUser(user.id, {
        name: finalName,
        email: cleanEmail,
        role: formRole,
        department: formDepartment,
        studentId: cleanIdNumber,
        password: formPassword.trim() || user.password || 'gabay2026'
      });
      if (!ok) return;

      showAlert({
        title: 'Account Updated',
        message: `Account settings for "${cleanEmail}" (email, password, role, department, ID number) have been saved successfully.`,
        type: 'success'
      });
      onNavigateTab('accounts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-1 flex-col space-y-6 animate-fade-in max-w-5xl mx-auto pt-2 pb-24 px-2 sm:px-4 font-sans select-none">
      {/* Breadcrumb + header */}
      <div className="pb-4 border-b border-border/80">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground font-sans">
            <button
              type="button"
              onClick={handleBack}
              className="hover:text-primary transition-colors cursor-pointer flex items-center space-x-1.5 font-medium group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Manage College Accounts</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-primary font-bold px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[11px]">
              Edit Account
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div className="space-y-1">
              <h1 className="text-[22px] font-extrabold tracking-tight text-foreground flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 border border-border">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span>Edit college account</span>
              </h1>
              <p className="text-[13px] text-muted-foreground font-normal pl-0.5">
                Modifying record for {user.name || user.email}. Changes apply as soon as you save.
              </p>
            </div>

            <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-card hover:bg-muted/60 border border-border rounded-xl transition-all shadow-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-account-form"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer flex items-center space-x-1.5 disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <form id="edit-account-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: form cards */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-none space-y-4">
            <div className="flex items-center space-x-2 border-b border-border/60 pb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">
                1. Account identity
              </span>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                Institutional email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="e.g. jdoe@dmmmsu.edu.ph"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                If no full name is set on the account, this email will be used as their name.
              </p>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                ID Number *
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={formIdNumber}
                  onChange={e => setFormIdNumber(formatIdNumber(e.target.value))}
                  placeholder={`e.g. ${ID_NUMBER_EXAMPLE}`}
                  inputMode="numeric"
                  maxLength={10}
                  pattern="\d{3}-\d{4}-\d"
                  title={`ID Number format: XXX-XXXX-X (e.g. ${ID_NUMBER_EXAMPLE})`}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Format XXX-XXXX-X (e.g. {ID_NUMBER_EXAMPLE}). Shown on the user's profile.
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-none space-y-4">
            <div className="flex items-center space-x-2 border-b border-border/60 pb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">
                2. Role & department selection
              </span>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                Account role *
              </label>
              <CustomDropdown
                value={formRole}
                onChange={val => setFormRole(val as UserRole)}
                options={roleOptions}
                placeholder="Select Account Role"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                Department *
              </label>
              <CustomDropdown
                value={formDepartment}
                onChange={setFormDepartment}
                options={departmentSelectOptions}
                searchable
                placeholder="Select Department"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-none space-y-4">
            <div className="flex items-center space-x-2 border-b border-border/60 pb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">
                3. Access credentials
              </span>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                Account password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="Leave unchanged or enter new password"
                  className="w-full pr-10 p-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans outline-none focus:ring-2 focus:ring-primary/30 shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Enter a new password to update account credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-none space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-[12px] font-semibold text-muted-foreground">
                Account preview
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">Live</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5 shadow-none">
              <div className="flex items-center space-x-3">
                <UserAvatar
                  name={user.name || formEmail.trim() || 'Unnamed Account'}
                  src={user.avatar}
                  className="w-10 h-10 rounded-full object-cover border border-border shadow-xs shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-foreground truncate">
                    {user.name || formEmail.trim() || 'Unnamed Account'}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {formEmail.trim() || 'Institutional email'}
                  </div>
                </div>
              </div>
              <div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-muted text-muted-foreground border-border">
                  {previewMeta.roleLabel}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                <div className="font-medium text-foreground truncate">{formDepartment}</div>
                <div className="truncate">{user.title || previewMeta.defaultTitle}</div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-none space-y-2.5">
              <span className="text-[12px] font-semibold text-muted-foreground block">
              Before you save
            </span>
            <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>Changes to <span className="font-semibold text-foreground">email, role, department, and password</span> apply immediately.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>Role controls access — switching roles changes what the user can see.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>Use <span className="font-semibold text-foreground">Cancel</span> to return without saving.</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditAccountPage;
