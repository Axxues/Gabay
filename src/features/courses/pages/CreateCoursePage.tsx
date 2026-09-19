import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLMS, generateCourseJoinCode } from '@/contexts/LMSContext';
import { useSimulatedUpload } from '@/hooks/useSimulatedUpload';
import { uploadFileToPublic } from '@/utils/fileUploader';
import { UploadProgress } from '@/components/shared/UploadProgress';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { getAcademicTermOptions, getDefaultAcademicTerm } from '@/utils/academicTerms';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Check,
  Sparkles,
  GraduationCap,
  ImageIcon,
  Upload,
  X,
  Ban,
  KeyRound,
  RefreshCw,
  CalendarDays,
  ChevronDown,
  Loader2
} from 'lucide-react';

const PRESET_COLORS = [
  { label: 'Cellwego Blue', hex: '#2563eb' },
  { label: 'Emerald Green', hex: '#059669' },
  { label: 'Rose Pink', hex: '#be185d' },
  { label: 'Amber Gold', hex: '#d97706' },
  { label: 'Purple Violet', hex: '#7c3aed' },
  { label: 'Slate Zinc', hex: '#475569' }
];

const PRESET_IMAGES = [
  {
    label: 'AI & Neural Systems',
    url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80'
  },
  {
    label: 'Software & Web Dev',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80'
  },
  {
    label: 'Cybersecurity & Networks',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80'
  },
  {
    label: 'Data Science & Metrics',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'
  },
  {
    label: 'Hardware & Architecture',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80'
  },
  {
    label: 'Algorithms & Mathematics',
    url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80'
  }
];

interface CreateCoursePageProps {
  onNavigateCourse: (courseId: string, subTab?: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const CreateCoursePage: React.FC<CreateCoursePageProps> = ({
  onNavigateCourse,
  onNavigateTab
}) => {
  const { activeUser, db, createCourse, showAlert } = useLMS();

  const [courseCode, setCourseCode] = useState('CMSC 180');
  const [courseTitle, setCourseTitle] = useState('Artificial Intelligence & Expert Systems');
  const [courseSection, setCourseSection] = useState('BSCS 4-1');
  const [courseColor, setCourseColor] = useState('#2563eb');
  const [courseImage, setCourseImage] = useState<string>(PRESET_IMAGES[0].url);
  const [imageMode, setImageMode] = useState<'presets' | 'upload' | 'url'>('presets');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const upload = useSimulatedUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [courseTerm, setCourseTerm] = useState(() => getDefaultAcademicTerm());
  const [courseDesc, setCourseDesc] = useState(
    'Covers foundational concepts in heuristics, search algorithms, knowledge representation, inference engines, and expert system design.'
  );

  const [courseJoinCode, setCourseJoinCode] = useState(() =>
    generateCourseJoinCode(db.courses, 'CMSC 180')
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegenerateCode = () => {
    setCourseJoinCode(generateCourseJoinCode(db.courses, courseCode));
  };

  // Dynamic academic terms: current AY always on top, short terms below, then history
  const termOptions = useMemo(() => getAcademicTermOptions(new Date()), []);
  const [isTermOpen, setIsTermOpen] = useState(false);
  const termDropdownRef = useRef<HTMLDivElement>(null);
  const selectedTerm = termOptions.find(o => o.value === courseTerm) ?? null;

  useEffect(() => {
    if (!isTermOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (termDropdownRef.current && !termDropdownRef.current.contains(e.target as Node)) {
        setIsTermOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsTermOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isTermOpen]);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showAlert({
        title: 'Invalid File Type',
        message: 'Please upload an image file (PNG, JPG, WebP, SVG, GIF).',
        type: 'warning'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showAlert({
        title: 'File Too Large',
        message: 'Please upload an image smaller than 10MB.',
        type: 'warning'
      });
      return;
    }

    if (upload.isUploading) return;
    upload.start(file.name);
    try {
      // Persist to /uploads and store the URL — never a data URL. A 10MB
      // photo inlines to ~13MB of base64, which once lived in the Course
      // row and made every course query (list + all access checks) ~1s.
      const result = await uploadFileToPublic(file);
      setCourseImage(result.url);
      setUploadedFileName(result.name);
      upload.complete();
      if (result.url.startsWith('data:')) {
        showAlert({
          title: 'Stored Without Upload',
          message: 'The image server was unreachable, so this cover is embedded in the course. Re-upload it later for faster loading.',
          type: 'warning'
        });
      }
    } catch {
      upload.fail();
      showAlert({
        title: 'Upload Failed',
        message: 'Could not upload that image. Please try a different file.',
        type: 'warning'
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be picked again via Change.
    e.target.value = '';
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (upload.isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const switchImageMode = (mode: 'presets' | 'upload' | 'url') => {
    if (upload.isUploading) {
      upload.reset();
    }
    setImageMode(mode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || upload.isUploading) return;
    if (!courseCode.trim() || !courseTitle.trim()) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please provide both a Course Code and Course Title.',
        type: 'warning'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newCourse = await createCourse({
        code: courseCode.trim().toUpperCase(),
        title: courseTitle.trim(),
        section: courseSection.trim(),
        color: courseColor,
        image: courseImage.trim(),
        instructorId: activeUser.id,
        instructorName: activeUser.name,
        term: courseTerm,
        published: true,
        joinCode: courseJoinCode
      });

      showAlert({
        title: 'Course Shell Created',
        message: `Course shell "${newCourse.code} - ${newCourse.section}" has been initialized successfully with you assigned as instructor.`,
        type: 'success'
      });

      onNavigateCourse(newCourse.id, 'modules');
    } catch {
      // createCourse already surfaced an alert.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-1 flex-col space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onNavigateTab('dashboard')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">
                Create course shell
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground border border-border rounded-md">
                Course authoring
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Initialize a dedicated subject shell for curriculum delivery, materials, and grading.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onNavigateTab('dashboard')}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-course-form"
            disabled={isSubmitting || upload.isUploading}
            className="px-5 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl shadow-primary-sm transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-70 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Creating...' : 'Create course shell'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2">
          <form id="create-course-form" onSubmit={handleSubmit} className="space-y-6">
            {/* General Identification */}
            <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-border/70">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-[12px] font-semibold text-muted-foreground">
                  Subject identification
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                    Course code
                  </label>
                  <input
                    type="text"
                    required
                    value={courseCode}
                    onChange={e => setCourseCode(e.target.value)}
                    placeholder="CMSC 180"
                    className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-[13px] tabular-nums outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground">e.g. CMSC 180, IT 120</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                    Section
                  </label>
                  <input
                    type="text"
                    required
                    value={courseSection}
                    onChange={e => {
                      setCourseSection(e.target.value);
                    }}
                    placeholder="BSCS 4-1"
                    className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-[13px] outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground">Class section or laboratory group — renamable later in course settings</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Course title
                </label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={e => setCourseTitle(e.target.value)}
                  placeholder="e.g. Artificial Intelligence & Expert Systems"
                  className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-[13px] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Academic term
                </label>
                <div ref={termDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTermOpen(v => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={isTermOpen}
                    className={`w-full p-2.5 bg-background border rounded-xl text-left outline-none transition-all flex items-center gap-3 cursor-pointer ${isTermOpen
                      ? 'border-primary/40 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40'
                      }`}
                  >
                    <span className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                      <CalendarDays className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-foreground truncate">
                        {selectedTerm?.label ?? courseTerm}
                      </span>
                    </span>
                    {selectedTerm?.isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground border border-border rounded-md shrink-0">
                        Current
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isTermOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTermOpen && (
                    <div className="absolute z-30 mt-2 w-full bg-card border border-border rounded-2xl shadow-elevated overflow-hidden animate-fade-in">
                      <div className="max-h-80 overflow-y-auto custom-scrollbar p-1.5">
                        {/* Current AY */}
                        <div className="px-2.5 pt-2 pb-1 text-[12px] font-semibold text-muted-foreground">
                          {termOptions[0]?.groupLabel}
                        </div>
                        {termOptions.filter(o => o.group === 'current').map(o => {
                          const active = o.value === courseTerm;
                          return (
                            <button
                              key={o.value}
                              type="button"
                              role="option"
                              aria-selected={active}
                              onClick={() => { setCourseTerm(o.value); setIsTermOpen(false); }}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${active ? 'bg-primary/10' : 'hover:bg-muted/60'
                                }`}
                            >
                              <span className={`flex-1 min-w-0`}>
                                <span className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground truncate">{o.label}</span>
                                  <span className="px-1.5 py-px text-[10px] font-semibold bg-muted text-muted-foreground border border-border rounded">
                                    New
                                  </span>
                                </span>
                              </span>
                              {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          );
                        })}

                        {/* Short terms */}
                        <div className="px-2.5 pt-3 pb-1 text-[12px] font-semibold text-muted-foreground">
                          Short terms
                        </div>
                        {termOptions.filter(o => o.group === 'short').map(o => {
                          const active = o.value === courseTerm;
                          return (
                            <button
                              key={o.value}
                              type="button"
                              role="option"
                              aria-selected={active}
                              onClick={() => { setCourseTerm(o.value); setIsTermOpen(false); }}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${active ? 'bg-primary/10' : 'hover:bg-muted/60'
                                }`}
                            >
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-bold text-foreground truncate">{o.label}</span>
                              </span>
                              {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          );
                        })}

                        {/* Previous AYs */}
                        <div className="px-2.5 pt-3 pb-1 text-[12px] font-semibold text-muted-foreground">
                          Previous academic years
                        </div>
                        {termOptions.filter(o => o.group === 'previous').map(o => {
                          const active = o.value === courseTerm;
                          return (
                            <button
                              key={o.value}
                              type="button"
                              role="option"
                              aria-selected={active}
                              onClick={() => { setCourseTerm(o.value); setIsTermOpen(false); }}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${active ? 'bg-primary/10' : 'hover:bg-muted/60'
                                }`}
                            >
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-semibold text-foreground truncate">{o.label}</span>
                              </span>
                              {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">Current school year stays on top and rolls over automatically every January.</span>
              </div>

              {/* Course Join Code (Auto-Generated) */}
              <div className="p-3.5 bg-muted/50 border border-border rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    <span>Course Join Code (Auto-Generated)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="text-[11px] text-primary hover:text-primary/80 font-bold flex items-center space-x-1 cursor-pointer"
                    title="Generate New Unique Code"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={courseJoinCode}
                    onChange={e => setCourseJoinCode(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-background border border-border rounded-xl font-mono font-bold text-xs uppercase tracking-wider text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Students will use this unique code to self-enroll in this course once published.
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Course description & overview
                </label>
                <textarea
                  rows={3}
                  value={courseDesc}
                  onChange={e => setCourseDesc(e.target.value)}
                  placeholder="Provide an overview of the course syllabus, objectives, and prerequisites..."
                  className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-[13px] placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>

            {/* Instructor selection */}
            <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-border/70">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-[12px] font-semibold text-muted-foreground">
                  Assigned instructor
                </h3>
              </div>

              {/* Automatic Creator-As-Instructor Card */}
              <div className="p-4 bg-muted/40 border border-border rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <UserAvatar
                    name={activeUser.name}
                    src={activeUser.avatar}
                    className="w-10 h-10 rounded-full object-cover border border-border shadow-soft shrink-0"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-foreground">{activeUser.name}</span>
                      <span className="px-2 py-0.5 text-[10px] font-sans font-bold uppercase rounded bg-primary/10 text-primary border border-primary/20">
                        Course Creator
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-muted-foreground mt-0.5">
                      {activeUser.email} • {activeUser.department}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground hidden sm:inline-block font-medium">
                  Automatically designated as primary instructor
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Visual Branding & Live Card Preview */}
        <div className="space-y-6">
          {/* Card Branding (Cover Image & Theme Color) */}
          <div className="p-6 bg-card border border-border rounded-2xl space-y-5">
            <div className="flex items-center space-x-2 pb-2 border-b border-border/70">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-[12px] font-semibold text-muted-foreground">
                Visual branding
              </h3>
            </div>

            {/* Course Image Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[12px] font-semibold text-muted-foreground">
                  Course cover image
                </label>
                {courseImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setCourseImage('');
                      setUploadedFileName(null);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-sans flex items-center space-x-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>No Image</span>
                  </button>
                )}
              </div>

              {/* Segmented Image Source Selector */}
              <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => switchImageMode('presets')}
                  className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center truncate ${
                    imageMode === 'presets'
                      ? 'bg-card text-foreground  font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Preset Covers
                </button>
                <button
                  type="button"
                  onClick={() => switchImageMode('upload')}
                  className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center truncate flex items-center justify-center space-x-1 ${
                    imageMode === 'upload'
                      ? 'bg-card text-foreground  font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="w-3 h-3 shrink-0" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchImageMode('url')}
                  className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center truncate flex items-center justify-center space-x-1 ${
                    imageMode === 'url'
                      ? 'bg-card text-foreground  font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ImageIcon className="w-3 h-3 shrink-0" />
                  <span>Image URL</span>
                </button>
              </div>

              {/* Mode: Preset Gallery */}
              {imageMode === 'presets' && (
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_IMAGES.map(img => {
                    const isSelected = courseImage === img.url;
                    return (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => {
                          setCourseImage(img.url);
                          setUploadedFileName(null);
                        }}
                        title={img.label}
                        className={`relative h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                          isSelected ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-border hover:border-border/80'
                        }`}
                      >
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                            <Check className="w-4 h-4 text-white drop-shadow-md" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-white truncate drop-shadow-sm px-0.5">
                          {img.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Mode: Upload Custom File */}
              {imageMode === 'upload' && (
                <div className="space-y-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onDragOver={e => {
                      e.preventDefault();
                      if (!upload.isUploading) setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (!upload.isUploading) fileInputRef.current?.click();
                    }}
                    aria-disabled={upload.isUploading}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all ${
                      upload.isUploading
                        ? 'border-border bg-muted/20 opacity-60 cursor-wait pointer-events-none'
                        : isDragging
                          ? 'border-primary bg-primary/10 scale-[1.01] cursor-pointer'
                          : 'border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 cursor-pointer'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                      {upload.isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {upload.isUploading ? `Uploading... ${upload.progress}%` : 'Click to browse or drag & drop'}
                    </span>
                    <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                      PNG, JPG, WEBP, or GIF (up to 10MB)
                    </p>
                  </div>

                  {upload.isUploading && upload.fileName && (
                    <UploadProgress fileName={upload.fileName} progress={upload.progress} hint="Uploading image..." />
                  )}

                  {!upload.isUploading && uploadedFileName && courseImage.startsWith('data:') && (
                    <div className="p-2.5 bg-muted/40 border border-border rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 truncate">
                        <img
                          src={courseImage}
                          alt="Uploaded Preview"
                          className="w-8 h-8 rounded-lg object-cover border border-border shrink-0"
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold text-foreground block truncate">
                            {uploadedFileName}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans flex items-center space-x-1">
                            <Check className="w-3 h-3 inline" />
                            <span>Uploaded successfully</span>
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-primary hover:underline shrink-0 ml-2 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mode: Custom Image URL */}
              {imageMode === 'url' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-sans text-muted-foreground">
                    Direct Image URL
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="url"
                      value={courseImage.startsWith('data:') ? '' : courseImage}
                      onChange={e => {
                        setCourseImage(e.target.value);
                        setUploadedFileName(null);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs font-sans outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-sans">
                    Paste any public image address from Unsplash or web host.
                  </p>
                </div>
              )}
            </div>

            {/* Card Color Theme */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[12px] font-semibold text-muted-foreground">
                  Card accent color
                </label>
                {courseColor ? (
                  <button
                    type="button"
                    onClick={() => setCourseColor('')}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-sans flex items-center space-x-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>No Color</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-sans font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                    No Color (Neutral)
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 mb-3">
                {/* No Color Option Swatch */}
                <button
                  type="button"
                  onClick={() => setCourseColor('')}
                  title="No Color (Default Neutral Slate)"
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-soft cursor-pointer border relative overflow-hidden shrink-0 ${
                    !courseColor
                      ? 'border-primary ring-2 ring-primary/40 bg-card'
                      : 'border-border bg-muted/60 hover:bg-muted'
                  }`}
                >
                  <Ban className={`w-4 h-4 ${!courseColor ? 'text-primary' : 'text-muted-foreground'}`} />
                </button>

                {PRESET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setCourseColor(c.hex)}
                    title={c.label}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-soft cursor-pointer shrink-0 ${
                      courseColor.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-offset-1 ring-primary'
                        : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {courseColor.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={courseColor || '#2563eb'}
                  onChange={e => setCourseColor(e.target.value)}
                  className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={courseColor}
                  placeholder="No color selected (Neutral Theme)"
                  onChange={e => setCourseColor(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-xl text-foreground font-sans text-xs uppercase placeholder:normal-case placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCoursePage;
