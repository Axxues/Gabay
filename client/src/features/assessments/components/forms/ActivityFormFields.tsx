import React, { useState, useRef } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import { uploadFileToPublic, FILE_UPLOAD_MAX_BYTES, isFileTooLarge } from '@/utils/fileUploader';
import {
  Award,
  Calendar,
  Upload,
  FileText,
  Clock,
  Trash2,
  FolderOpen,
  Plus,
  X
} from 'lucide-react';
import { FilePickerModal } from '@/components/shared/FilePickerModal';
import { UploadProgress } from '@/components/shared/UploadProgress';
import { useSimulatedUpload } from '@/hooks/useSimulatedUpload';
import type { AggregatedCourseFile } from '@/hooks/useCourseFiles';
import type { Activity, RubricCriterion, RubricRating, TermId } from '@/services/lms/types/lms.types';
import { TermSelect } from '@/components/shared/TermSelect';

export interface ActivityAttachment {
  name: string;
  size: string;
  url: string;
}

export interface ActivityFormValue {
  title: string;
  instructions: string;
  term?: TermId;
  pointsPossible: number;
  dueDate: string;
  availableFrom: string;
  availableUntil: string;
  allowFileUpload: boolean;
  allowOnlineText: boolean;
  attachedFile: ActivityAttachment | null;
  includeRubric: boolean;
  rubric: RubricCriterion[];
}

const newCriterionId = (): string =>
  `rub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const blankRubricCriterion = (): RubricCriterion => ({
  id: newCriterionId(),
  title: '',
  description: '',
  points: 0,
  ratings: [
    { points: 0, description: '' },
    { points: 0, description: '' },
    { points: 0, description: '' }
  ]
});

export function emptyActivityFormValue(): ActivityFormValue {
  const due = new Date(Date.now() + 7 * 86400000);
  due.setHours(23, 59, 0, 0);
  return {
    title: '',
    instructions: '',
    pointsPossible: 100,
    dueDate: due.toISOString().slice(0, 16),
    availableFrom: new Date().toISOString().slice(0, 16),
    availableUntil: '',
    allowFileUpload: true,
    allowOnlineText: true,
    attachedFile: null,
    includeRubric: false,
    rubric: []
  };
}

export function validateActivityForm(v: ActivityFormValue): { title: string; message: string } | null {
  if (!v.title.trim()) {
    return { title: 'Missing Title', message: 'Please provide an activity title before saving.' };
  }
  if (!v.allowFileUpload && !v.allowOnlineText) {
    return { title: 'Submission Type Required', message: 'Please select at least one submission type (File Upload or Online Text Entry).' };
  }
  if (v.includeRubric) {
    if (v.rubric.length === 0) {
      return { title: 'Rubric Required', message: 'Rubric is enabled but has no criteria. Add at least one criterion or uncheck the rubric option.' };
    }
    for (let i = 0; i < v.rubric.length; i++) {
      const c = v.rubric[i];
      if (!c.title.trim()) {
        return { title: 'Rubric Criterion Incomplete', message: `Criterion #${i + 1} needs a title.` };
      }
      if (!(Number(c.points) > 0)) {
        return { title: 'Rubric Criterion Incomplete', message: `Criterion "${c.title.trim()}" needs points greater than 0.` };
      }
      if (c.ratings.length === 0) {
        return { title: 'Rubric Rating Required', message: `Criterion "${c.title.trim()}" needs at least one rating level.` };
      }
      for (let j = 0; j < c.ratings.length; j++) {
        const r: RubricRating = c.ratings[j];
        if (!r.description.trim()) {
          return { title: 'Rubric Rating Incomplete', message: `Criterion "${c.title.trim()}", rating #${j + 1} needs a label.` };
        }
        if (!(Number(r.points) >= 0)) {
          return { title: 'Rubric Rating Incomplete', message: `Criterion "${c.title.trim()}", rating "${r.description.trim()}" needs points of 0 or more.` };
        }
        if (Number(r.points) > Number(c.points)) {
          return { title: 'Rubric Rating Exceeds Criterion', message: `Rating "${r.description.trim()}" (${r.points} pts) exceeds criterion "${c.title.trim()}" (${c.points} pts).` };
        }
      }
    }
    const criteriaTotal = v.rubric.reduce((sum, c) => sum + (Number(c.points) || 0), 0);
    if (criteriaTotal !== (Number(v.pointsPossible) || 0)) {
      return { title: 'Rubric Points Mismatch', message: `Rubric criteria total ${criteriaTotal} pts, but Total points is ${v.pointsPossible} pts. Adjust them to match before saving.` };
    }
  }
  return null;
}

export function buildActivityPayload(courseId: string, v: ActivityFormValue, publish: boolean): Partial<Activity> {
  const submissionTypes: ('file' | 'online_text')[] = [];
  if (v.allowFileUpload) submissionTypes.push('file');
  if (v.allowOnlineText) submissionTypes.push('online_text');

  return {
    courseId,
    format: 'classic',
    title: v.title.trim(),
    instructions: v.instructions.trim() || 'Complete the activity guidelines aligned with course syllabus objectives.',
    ...(v.term !== undefined ? { term: v.term } : {}),
    category: 'Activities',
    pointsPossible: Number(v.pointsPossible) || 100,
    weight: 30,
    rubric: v.includeRubric
      ? v.rubric.map(c => ({
          ...c,
          id: c.id || newCriterionId(),
          title: c.title.trim(),
          description: c.description.trim(),
          points: Number(c.points) || 0,
          ratings: c.ratings.map(r => ({
            points: Number(r.points) || 0,
            description: r.description.trim()
          }))
        }))
      : [],
    dueDate: v.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
    availableFrom: v.availableFrom || undefined,
    availableUntil: v.availableUntil || undefined,
    submissionTypes,
    published: publish,
    sectionRestriction: 'All Sections',
    fileName: v.attachedFile?.name,
    fileUrl: v.attachedFile?.url,
    fileSize: v.attachedFile?.size
  };
}

export const ActivityFormFields: React.FC<{
  courseId: string;
  value: ActivityFormValue;
  onChange: (v: ActivityFormValue) => void;
}> = ({ courseId, value, onChange }) => {
  const { showAlert, effectiveTermsForCourse, uploadCourseFile } = useLMS();
  const [isDragging, setIsDragging] = useState(false);
  const upload = useSimulatedUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (isFileTooLarge(file.size)) {
      showAlert({
        title: 'File Too Large',
        message: `Please attach a document or archive smaller than ${FILE_UPLOAD_MAX_BYTES / 1024 / 1024}MB.`,
        type: 'warning'
      });
      return;
    }

    if (upload.isUploading) return;
    upload.start(file.name);
    try {
      // Same order as AddModuleItemPage: Vite dev middleware first, then the
      // backend multipart upload. Never embed a data URL — Activity.fileUrl
      // is NVarChar(1024), so embedding always 500s on create.
      const viaVite = await uploadFileToPublic(file);
      if (!viaVite.url.startsWith('data:')) {
        onChange({
          ...value,
          attachedFile: { name: viaVite.name, size: viaVite.size, url: viaVite.url }
        });
        upload.complete();
        showAlert({
          title: 'File Attached',
          message: `"${file.name}" has been attached to this activity.`,
          type: 'success'
        });
        return;
      }
      let url = '';
      let name = file.name;
      let size = viaVite.size;
      try {
        const saved = await uploadCourseFile({
          courseId,
          name: file.name,
          rawFile: file,
          visibility: 'published'
        });
        url = saved.fileUrl || saved.url || '';
        name = saved.name || file.name;
        size = saved.formattedSize || viaVite.size;
      } catch {
        url = '';
      }
      if (!url || url.startsWith('data:')) {
        showAlert({
          title: 'Upload Service Unavailable',
          message: 'The file could not be stored on the server (upload service unreachable). Please ensure the backend is running and try again.',
          type: 'error'
        });
        upload.fail();
        return;
      }
      onChange({ ...value, attachedFile: { name, size, url } });
      upload.complete();
      showAlert({
        title: 'File Attached',
        message: `"${file.name}" has been attached to this activity.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to attach activity file:', err);
      upload.fail();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (upload.isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSelectExistingFile = (file: AggregatedCourseFile) => {
    onChange({
      ...value,
      attachedFile: {
        name: file.name,
        size: file.formattedSize || '',
        url: file.url || file.fileUrl || `/public/uploads/${file.name}`
      }
    });
    setIsFilePickerOpen(false);
    showAlert({
      title: 'File Attached',
      message: `"${file.name}" has been attached from your uploaded course files.`,
      type: 'success'
    });
  };

  // Host course for the syllabus-driven term picker. When the context
  // helper is unavailable the picker falls back to the legacy pair.
  const terms: TermId[] =
    courseId && typeof effectiveTermsForCourse === 'function'
      ? effectiveTermsForCourse(courseId)
      : ['midterm', 'finals'];
  const safeTerm: TermId =
    value.term && terms.includes(value.term) ? value.term : (terms[0] ?? 'midterm');

  return (
    <div className="space-y-6 text-xs">
      {/* Section 1: Activity Information (Combined General Info + Instructions & Handouts) */}
      <div className="p-5 sm:p-6 bg-card border border-border rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-border/70">
          <div className="w-6 h-6 rounded-lg bg-muted border border-border text-muted-foreground flex items-center justify-center font-bold text-[11px] tabular-nums">
            1
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-extrabold tracking-tight text-foreground">Activity information</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Title, guidelines, and starter files</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
              Activity title
            </label>
            <input
              type="text"
              required
              value={value.title}
              onChange={e => onChange({ ...value, title: e.target.value })}
              placeholder="e.g. Activity 4: SpeedGrader Split-Screen UI Integration"
              className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 text-[13px] outline-none transition-all"
            />
          </div>

          {/* Grading term picker (syllabus-driven options) */}
          <div>
            <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
              Grading term
            </label>
            <TermSelect terms={terms} value={safeTerm} onChange={t => onChange({ ...value, term: t })} id="classic-activity-term-select" />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
              Instructions & deliverables
            </label>
            <textarea
              rows={6}
              value={value.instructions}
              onChange={e => onChange({ ...value, instructions: e.target.value })}
              placeholder="Detail the step-by-step requirements, input/output test specifications, coding conventions, and rubric criteria for students..."
              className="w-full p-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 text-[13px] leading-relaxed outline-none resize-y transition-all"
            />
          </div>

          {/* Handout Attachment Upload */}
          <div>
            <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
              Starter code / handout file
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {value.attachedFile ? (
              <div className="p-3.5 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-[12.5px] text-foreground truncate">{value.attachedFile.name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {value.attachedFile.size} • Saved to uploads
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                  >
                    Change file
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilePickerOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                  >
                    Browse uploaded
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...value, attachedFile: null });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
              <div
                onClick={() => { if (!upload.isUploading) fileInputRef.current?.click(); }}
                onDragOver={e => {
                  e.preventDefault();
                  if (!upload.isUploading) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                aria-disabled={upload.isUploading}
                className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-primary/40 bg-primary/[0.04]'
                    : 'border-border/70 hover:border-primary/40 hover:bg-muted/30 bg-muted/10'
                }${upload.isUploading ? ' opacity-60 cursor-wait pointer-events-none' : ''}`}
              >
                <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[12.5px] font-semibold text-foreground block">
                    Click to browse or drop reference file here
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    PDF instructions, starter ZIP repositories, or sample datasets (up to 25MB)
                  </span>
                </div>
              </div>
              {upload.isUploading && upload.fileName && (
                <UploadProgress fileName={upload.fileName} progress={upload.progress} hint="Uploading file..." />
              )}
              </>
            )}

            <div className="flex justify-center pt-1.5">
              <button
                type="button"
                onClick={() => setIsFilePickerOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 border border-border/70"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Browse uploaded files</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Scoring and Deadlines (Combined Grading & Scoring Matrix + Submission Types & Deadlines) */}
      <div className="p-5 sm:p-6 bg-card border border-border rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-border/70">
          <div className="w-6 h-6 rounded-lg bg-muted border border-border text-muted-foreground flex items-center justify-center font-bold text-[11px] tabular-nums">
            2
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-extrabold tracking-tight text-foreground">Scoring and deadlines</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Points, submission methods, and availability</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Points Possible */}
          <div className="max-w-[240px]">
            <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
              Total points
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={1000}
                value={value.pointsPossible}
                onChange={e => onChange({ ...value, pointsPossible: Math.max(1, Number(e.target.value)) })}
                className="w-full pl-3.5 pr-11 py-2 bg-background border border-border rounded-xl text-foreground text-[13px] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground font-medium">
                pts
              </span>
            </div>
          </div>

          {/* Submission Methods */}
          <div>
            <label className="block text-[12px] font-semibold text-muted-foreground mb-2">
              Submission methods
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className={`px-3.5 py-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                value.allowFileUpload
                  ? 'border-primary/30 bg-primary/[0.04]'
                  : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/20'
              }`}>
                <input
                  type="checkbox"
                  checked={value.allowFileUpload}
                  onChange={e => onChange({ ...value, allowFileUpload: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-semibold text-[12.5px] text-foreground block">File upload</span>
                  <span className="text-[11.5px] leading-snug text-muted-foreground block mt-0.5">PDFs, archives, and source code</span>
                </div>
              </label>

              <label className={`px-3.5 py-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                value.allowOnlineText
                  ? 'border-primary/30 bg-primary/[0.04]'
                  : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/20'
              }`}>
                <input
                  type="checkbox"
                  checked={value.allowOnlineText}
                  onChange={e => onChange({ ...value, allowOnlineText: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-semibold text-[12.5px] text-foreground block">Text entry</span>
                  <span className="text-[11.5px] leading-snug text-muted-foreground block mt-0.5">In-browser markdown or code</span>
                </div>
              </label>
            </div>
          </div>

          {/* Schedule Deadlines */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="min-w-0">
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Due date</span>
              </label>
              <input
                type="datetime-local"
                required
                value={value.dueDate}
                onChange={e => onChange({ ...value, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-[12.5px] tabular-nums outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer transition-all"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Available from</span>
              </label>
              <input
                type="datetime-local"
                value={value.availableFrom}
                onChange={e => onChange({ ...value, availableFrom: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-[12.5px] tabular-nums outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer transition-all"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Until</span>
              </label>
              <input
                type="datetime-local"
                value={value.availableUntil}
                onChange={e => onChange({ ...value, availableUntil: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-[12.5px] tabular-nums outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Grading Rubric (Optional) */}
      <div className="p-5 sm:p-6 bg-card border border-border rounded-2xl space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-border/70">
          <div className="w-6 h-6 rounded-lg bg-muted border border-border text-muted-foreground flex items-center justify-center font-bold text-[11px] tabular-nums">
            3
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-extrabold tracking-tight text-foreground">Grading rubric</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Optional scoring criteria for SpeedGrader</p>
          </div>
          {value.includeRubric && value.rubric.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-md bg-muted text-foreground border border-border font-bold text-[11px] tabular-nums shrink-0">
              {value.rubric.length} {value.rubric.length === 1 ? 'criterion' : 'criteria'}
            </span>
          )}
        </div>

        <label className={`px-3.5 py-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
          value.includeRubric
            ? 'border-primary/30 bg-primary/[0.04]'
            : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/20'
        }`}>
          <input
            type="checkbox"
            checked={value.includeRubric}
            onChange={e => {
              const checked = e.target.checked;
              onChange({
                ...value,
                includeRubric: checked,
                rubric: checked
                  ? (value.rubric.length > 0 ? value.rubric : [blankRubricCriterion()])
                  : value.rubric
              });
            }}
            className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0"
          />
          <div className="min-w-0">
            <span className="font-semibold text-[12.5px] text-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-muted-foreground" />
              Include a grading rubric
            </span>
            <span className="text-[11.5px] leading-snug text-muted-foreground block mt-0.5">
              Define your own criteria and rating levels. Leave unchecked for a plain point score with no rubric.
            </span>
          </div>
        </label>

        {value.includeRubric && (
          <div className="space-y-3">
            {value.rubric.map((criterion, cIdx) => (
              <div key={criterion.id} className="p-4 bg-muted/20 border border-border/70 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Criterion {cIdx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...value, rubric: value.rubric.filter((_, i) => i !== cIdx) })}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove criterion"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2.5">
                  <input
                    type="text"
                    value={criterion.title}
                    onChange={e => onChange({
                      ...value,
                      rubric: value.rubric.map((c, i) => (i === cIdx ? { ...c, title: e.target.value } : c))
                    })}
                    placeholder="Criterion title (e.g. Code Quality & Technical Execution)"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 text-[12.5px] font-semibold outline-none transition-all"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={criterion.points}
                      onChange={e => onChange({
                        ...value,
                        rubric: value.rubric.map((c, i) => (i === cIdx ? { ...c, points: Math.max(0, Number(e.target.value)) } : c))
                      })}
                      className="w-full pl-3 pr-9 py-2 bg-background border border-border rounded-xl text-foreground text-[12.5px] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-medium">
                      pts
                    </span>
                  </div>
                </div>

                <input
                  type="text"
                  value={criterion.description}
                  onChange={e => onChange({
                    ...value,
                    rubric: value.rubric.map((c, i) => (i === cIdx ? { ...c, description: e.target.value } : c))
                  })}
                  placeholder="Description (e.g. Follows clean code conventions and documentation)"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-muted-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 text-[12px] outline-none transition-all"
                />

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">Rating levels</span>
                  {criterion.ratings.map((rating, rIdx) => (
                    <div key={rIdx} className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={rating.points}
                        onChange={e => onChange({
                          ...value,
                          rubric: value.rubric.map((c, i) => (
                            i === cIdx
                              ? { ...c, ratings: c.ratings.map((r, j) => (j === rIdx ? { ...r, points: Math.max(0, Number(e.target.value)) } : r)) }
                              : c
                          ))
                        })}
                        className="w-20 shrink-0 px-2.5 py-1.5 bg-background border border-border rounded-lg text-foreground text-[12px] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                        aria-label={`Criterion ${cIdx + 1} rating ${rIdx + 1} points`}
                      />
                      <input
                        type="text"
                        value={rating.description}
                        onChange={e => onChange({
                          ...value,
                          rubric: value.rubric.map((c, i) => (
                            i === cIdx
                              ? { ...c, ratings: c.ratings.map((r, j) => (j === rIdx ? { ...r, description: e.target.value } : r)) }
                              : c
                          ))
                        })}
                        placeholder={`Rating label (e.g. ${rIdx === 0 ? 'Exemplary Mastery' : rIdx === 1 ? 'Proficient' : 'Needs Revision'})`}
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 text-[12px] outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => onChange({
                          ...value,
                          rubric: value.rubric.map((c, i) => (
                            i === cIdx ? { ...c, ratings: c.ratings.filter((_, j) => j !== rIdx) } : c
                          ))
                        })}
                        className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        title="Remove rating level"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => onChange({
                      ...value,
                      rubric: value.rubric.map((c, i) => (
                        i === cIdx ? { ...c, ratings: [...c.ratings, { points: 0, description: '' }] } : c
                      ))
                    })}
                    className="px-3 py-1.5 text-[11.5px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add rating level
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => onChange({ ...value, rubric: [...value.rubric, blankRubricCriterion()] })}
                className="px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 border border-primary/30 bg-primary/5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add criterion
              </button>
              <span className="text-[11.5px] font-semibold tabular-nums text-muted-foreground sm:ml-auto">
                Criteria total: {value.rubric.reduce((sum, c) => sum + (Number(c.points) || 0), 0)} pts
                <span className="mx-1">•</span>
                Activity total: {Number(value.pointsPossible) || 0} pts
              </span>
            </div>
          </div>
        )}
      </div>

      {isFilePickerOpen && (
        <FilePickerModal
          courseId={courseId}
          onClose={() => setIsFilePickerOpen(false)}
          onSelect={handleSelectExistingFile}
        />
      )}
    </div>
  );
};
