import React, { useState, useRef, useEffect } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { Activity, ModuleItem, Quiz, TermId } from '@/services/lms/types/lms.types';
import {
  ArrowLeft,
  FileText,
  File,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Upload,
  Paperclip,
  Check,
  Plus,
  X,
  Layers,
  ChevronDown,
  FileCheck2,
  HelpCircle,
  Globe,
  BookOpen,
  FolderOpen
} from 'lucide-react';

import { uploadFileToPublic, formatFileSize, FILE_UPLOAD_MAX_BYTES, toShortFileType, isFileTooLarge } from '@/utils/fileUploader';
import { normalizeTermId } from '@/utils/gradingTerms';
import { UploadProgress } from '@/components/shared/UploadProgress';
import { useSimulatedUpload } from '@/hooks/useSimulatedUpload';
import { FilePickerModal } from '@/components/shared/FilePickerModal';
import type { AggregatedCourseFile } from '@/hooks/useCourseFiles';
import {
  ActivityFormFields,
  buildActivityPayload as buildClassicActivityPayload,
  emptyActivityFormValue,
  validateActivityForm,
  type ActivityFormValue
} from '@/features/assessments/components/forms/ActivityFormFields';
import {
  QuizBuilderFields,
  buildQuizPayload,
  emptyQuizBuilderValue,
  validateQuizBuilder,
  type QuestionDraft,
  type QuizBuilderValue
} from '@/features/assessments/components/forms/QuizBuilderFields';
import {
  QuestionSetFields,
  buildActivityPayload,
  emptyQuestionSetValue,
  validateQuestionSet,
  type ActivityQuestionDraft,
  type QuestionSetValue
} from '@/features/assessments/components/forms/QuestionSetFields';

interface AddModuleItemPageProps {
  courseId: string;
  moduleId: string;
  editingItem?: ModuleItem;
  onBack: () => void;
}

const RESOURCE_TYPES: Array<{
  type: ModuleItem['type'];
  label: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badgeColor: string;
}> = [
    {
      type: 'page',
      label: 'Lecture note / reading page',
      badge: 'Page',
      description: 'Syllabus reading, lecture note, or markdown document',
      icon: FileText,
      iconBg: 'bg-muted text-muted-foreground',
      badgeColor: 'bg-muted text-muted-foreground border-border'
    },
    {
      type: 'file',
      label: 'Course document / handout file',
      badge: 'Handout',
      description: 'PDF document, slide deck, syllabus, or course asset file',
      icon: File,
      iconBg: 'bg-muted text-muted-foreground',
      badgeColor: 'bg-muted text-muted-foreground border-border'
    },
    {
      type: 'activity',
      label: 'Activity milestone',
      badge: 'Activity',
      description: 'Graded student submission with deadline, instructions & rubric',
      icon: FileCheck2,
      iconBg: 'bg-muted text-muted-foreground',
      badgeColor: 'bg-muted text-muted-foreground border-border'
    },
    {
      type: 'quiz',
      label: 'Assessment quiz',
      badge: 'Assessment',
      description: 'Timed assessment, exam, or knowledge evaluation milestone',
      icon: HelpCircle,
      iconBg: 'bg-muted text-muted-foreground',
      badgeColor: 'bg-muted text-muted-foreground border-border'
    },
    {
      type: 'external_url',
      label: 'External reference link',
      badge: 'Web link',
      description: 'Online repository, scientific publication, or digital tool',
      icon: Globe,
      iconBg: 'bg-muted text-muted-foreground',
      badgeColor: 'bg-muted text-muted-foreground border-border'
    }
  ];

const toLocalDateTimeInput = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
};

// Prefill the shared activity form from a linked classic activity record.
const classicActivityToForm = (
  a: Activity,
  fallbackTitle: string,
  fallbackContent: string
): ActivityFormValue => ({
  title: a.title || fallbackTitle,
  instructions: a.instructions || fallbackContent,
  pointsPossible: a.pointsPossible ?? 100,
  dueDate: toLocalDateTimeInput(a.dueDate) || emptyActivityFormValue().dueDate,
  availableFrom: toLocalDateTimeInput(a.availableFrom),
  availableUntil: toLocalDateTimeInput(a.availableUntil),
  allowFileUpload: (a.submissionTypes || []).includes('file'),
  allowOnlineText: (a.submissionTypes || []).includes('online_text'),
  attachedFile: a.fileName
    ? { name: a.fileName, size: a.fileSize || '', url: a.fileUrl || '' }
    : null,
  includeRubric: Array.isArray(a.rubric) && a.rubric.length > 0,
  rubric: Array.isArray(a.rubric) ? a.rubric : []
});

const MC_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Synthetic link convention (shared with submissions/badges/gradebook):
// question-set activities are referenced as `asg-activity-<activityId>`.
const QUESTION_SET_LINK_PREFIX = 'asg-activity-';
const questionSetLinkOf = (activityId: string): string => `${QUESTION_SET_LINK_PREFIX}${activityId}`;
const linkedActivityIdOf = (activityId?: string | null): string | undefined =>
  activityId && activityId.startsWith(QUESTION_SET_LINK_PREFIX)
    ? activityId.slice(QUESTION_SET_LINK_PREFIX.length)
    : undefined;

// Prefill the shared question-set builder from a linked activity record.
const activityToQuestionSet = (
  a: Activity,
  fallbackTitle: string,
  fallbackContent: string
): QuestionSetValue => ({
  title: a.title || fallbackTitle,
  instructions: a.instructions || fallbackContent,
  dueDate: toLocalDateTimeInput(a.dueDate) || emptyQuestionSetValue().dueDate,
  term: normalizeTermId(a.term) ?? 'midterm',
  items: (a.questions || []).map((qq, idx) => {
    const opts = [...(qq.options || [])];
    let correctAnswer = qq.correctAnswer || '';
    if (qq.type === 'multiple_choice') {
      const found = opts.indexOf(qq.correctAnswer || '');
      correctAnswer = found >= 0 ? MC_LETTERS[found] || 'A' : 'A';
      while (opts.length < 2) opts.push('');
    }
    const draft: ActivityQuestionDraft = {
      id: qq.id || `aq-edit-${idx}`,
      text: qq.text || '',
      type: qq.type,
      options: opts,
      correctAnswer,
      points: qq.points || 5
    };
    return draft;
  })
});

// Prefill the shared quiz builder from a linked quiz record. Compiled
// multiple-choice keys are stored as option text — map back to letters.
const quizToBuilder = (
  q: Quiz,
  fallbackTitle: string,
  fallbackContent: string
): QuizBuilderValue => ({
  title: q.title || fallbackTitle,
  instructions: q.instructions || fallbackContent,
  timeLimitMinutes: q.timeLimitMinutes ?? 30,
  delayPosting: Boolean(q.delayedUntil),
  delayedDate: toLocalDateTimeInput(q.delayedUntil) || emptyQuizBuilderValue().delayedDate,
  term: normalizeTermId(q.term) ?? 'midterm',
  items: (q.questions || []).map((qq, idx) => {
    const opts = [...(qq.options || [])];
    let correctAnswer = qq.correctAnswer || '';
    if (qq.type === 'multiple_choice') {
      const found = opts.indexOf(qq.correctAnswer || '');
      correctAnswer = found >= 0 ? MC_LETTERS[found] || 'A' : 'A';
      while (opts.length < 2) opts.push('');
    }
    const draft: QuestionDraft = {
      id: qq.id || `q-edit-${idx}`,
      text: qq.text || '',
      type: qq.type,
      options: opts,
      correctAnswer,
      points: qq.points || 5,
      required: true
    };
    if (qq.description) draft.description = qq.description;
    if (qq.rubricNotes) draft.rubricNotes = qq.rubricNotes;
    return draft;
  })
});

export const AddModuleItemPage: React.FC<AddModuleItemPageProps> = ({
  courseId,
  moduleId,
  editingItem,
  onBack
}) => {
  const {
    db,
    addModuleItem,
    updateModuleItem,
    createActivity,
    updateActivity,
    createQuiz,
    updateQuiz,
    uploadCourseFile,
    showAlert,
    effectiveTermsForCourse
  // updateQuiz rides along as sibling-WIP: the context does not provide it
  // yet (quiz header editing), so it is typed here to keep this page
  // compiling until the quiz surface lands it.
  } = useLMS() as ReturnType<typeof useLMS> & {
    updateQuiz: (
      quizId: string,
      updates: Omit<Partial<Quiz>, 'delayedUntil'> & { delayedUntil?: string | null }
    ) => Promise<Quiz>;
  };
  const isEditing = Boolean(editingItem);

  const course = db.courses.find(c => c.id === courseId);
  // Syllabus-driven default grading term for fresh quiz/activity builders.
  const defaultAssessmentTerm: TermId =
    typeof effectiveTermsForCourse === 'function'
      ? (effectiveTermsForCourse(courseId)[0] ?? 'midterm')
      : 'midterm';
  const courseModules = db.modules.filter(m => m.courseId === courseId);
  const sortedModules = [...courseModules].sort((a, b) => {
    if (b.order !== a.order) return b.order - a.order;
    return b.id.localeCompare(a.id);
  });
  // Form State
  const [targetModuleId, setTargetModuleId] = useState(moduleId || sortedModules[0]?.id || '');
  const [itemType, setItemType] = useState<ModuleItem['type']>(editingItem?.type || 'page');
  const [title, setTitle] = useState(editingItem?.title || '');
  const [content, setContent] = useState(editingItem?.content || '');

  // Linked assessment records (real Activities/Quizzes rows).
  // Classic activities link via activityId; question-set activities via the
  // synthetic `asg-activity-<id>` convention (same as submissions/badges).
  const linkedClassicActivity =
    editingItem?.type === 'activity' &&
    editingItem.activityId &&
    !linkedActivityIdOf(editingItem.activityId)
      ? (db.activities || []).find(a => a.id === editingItem.activityId)
      : undefined;
  const linkedActivityId =
    editingItem?.type === 'activity'
      ? linkedActivityIdOf(editingItem.activityId)
      : undefined;
  const linkedActivity = linkedActivityId
    ? (db.activities ?? []).find(a => a.id === linkedActivityId)
    : undefined;
  const linkedQuiz =
    editingItem?.type === 'quiz' && editingItem.quizId
      ? db.quizzes.find(q => q.id === editingItem.quizId)
      : undefined;

  // Assessment forms — the SAME inputs as the Activities / Quizzes pages,
  // prefilled from the linked record when editing.
  const [activityForm, setActivityForm] = useState<ActivityFormValue>(() =>
    linkedClassicActivity
      ? classicActivityToForm(linkedClassicActivity, editingItem?.title || '', editingItem?.content || '')
      : {
          ...emptyActivityFormValue(),
          title: editingItem?.type === 'activity' ? editingItem.title || '' : '',
          instructions: editingItem?.type === 'activity' ? editingItem.content || '' : ''
        }
  );
  const [quizBuilder, setQuizBuilder] = useState<QuizBuilderValue>(() =>
    linkedQuiz
      ? quizToBuilder(linkedQuiz, editingItem?.title || '', editingItem?.content || '')
      : { ...emptyQuizBuilderValue(), term: defaultAssessmentTerm }
  );

  // Classic vs question-set mode for Activity items — same chooser as the
  // Activities page. Editing a question-set-linked item opens in that mode.
  const [activityMode, setActivityMode] = useState<'classic' | 'question_set'>(() =>
    linkedActivityId ? 'question_set' : 'classic'
  );
  const [questionSet, setQuestionSet] = useState<QuestionSetValue>(() =>
    linkedActivity
      ? activityToQuestionSet(linkedActivity, editingItem?.title || '', editingItem?.content || '')
      : { ...emptyQuestionSetValue(), term: defaultAssessmentTerm }
  );

  // Custom Dropdown Open States
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(target)) {
        setIsModuleDropdownOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(target)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Attachment State
  const [attachedFileName, setAttachedFileName] = useState(editingItem?.fileName || '');
  const [attachedFileSize, setAttachedFileSize] = useState(editingItem?.fileSize || '');
  const [attachedFileType, setAttachedFileType] = useState(editingItem?.fileType || '');
  const [attachedFileUrl, setAttachedFileUrl] = useState(editingItem?.fileUrl || '');
  const [isDragging, setIsDragging] = useState(false);
  const upload = useSimulatedUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  // Pending flag for slow item saves — show loading + block double-submit
  const [isSaving, setIsSaving] = useState(false);

  const selectedModule = courseModules.find(m => m.id === targetModuleId);
  const currentResourceType = RESOURCE_TYPES.find(r => r.type === itemType) || RESOURCE_TYPES[0];

  const handleProcessFile = async (file: globalThis.File) => {
    if (isFileTooLarge(file.size)) {
      showAlert({
        title: 'File Too Large',
        message: `Please attach a document or media file smaller than ${FILE_UPLOAD_MAX_BYTES / 1024 / 1024}MB.`,
        type: 'warning'
      });
      return;
    }

    if (upload.isUploading) return;
    upload.start(file.name);
    try {
      // Upload order matters:
      // 1. Vite dev middleware (/api/upload) first — instant short /uploads/…
      //    URL when running `npm run dev`, with no auth alert side effects.
      // 2. Backend multipart upload (same pattern as Files/Syllabus) when the
      //    Vite endpoint is absent (production) or returned a data URL.
      // Data URLs longer than ~900 chars can never be saved: the
      // ModuleItem.fileUrl column is NVarChar(1024), so embedding them made
      // the items POST fail with 500.
      const viaVite = await uploadFileToPublic(file);
      if (!viaVite.url.startsWith('data:')) {
        setAttachedFileUrl(viaVite.url);
        setAttachedFileName(viaVite.name);
        setAttachedFileSize(viaVite.size);
        setAttachedFileType(toShortFileType(file.name));
      } else {
        let url = '';
        let name = file.name;
        try {
          const saved = await uploadCourseFile({
            courseId,
            name: file.name,
            rawFile: file,
            area: 'modules',
            moduleId: targetModuleId || moduleId,
            moduleTitle: selectedModule?.title || courseModules.find(m => m.id === (targetModuleId || moduleId))?.title,
            visibility: 'published'
          });
          url = saved.fileUrl || saved.url || '';
          name = saved.name || file.name;
        } catch {
          url = '';
        }
        if (!url) {
          // Never embed a data URL: ModuleItem.fileUrl is NVarChar(1024) and
          // Activity.fileUrl is NVarChar(1024) — embedding always 400/500s.
          // The file was already validated against the 25MB server cap above,
          // so a missing URL means the upload service itself failed.
          showAlert({
            title: 'Upload Service Unavailable',
            message: 'The file could not be stored on the server (upload service unreachable). Please ensure the backend is running and try again.',
            type: 'error'
          });
          upload.fail();
          return;
        } else {
          setAttachedFileUrl(url);
          setAttachedFileName(name);
          setAttachedFileSize(formatFileSize(file.size));
          setAttachedFileType(toShortFileType(name));
        }
      }

      // Auto-populate title if empty
      if (!title.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
      upload.complete();
    } catch (err) {
      console.error('Failed to upload module item file:', err);
      upload.fail();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (upload.isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFileName('');
    setAttachedFileSize('');
    setAttachedFileType('');
    setAttachedFileUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectExistingFile = (file: AggregatedCourseFile) => {
    const url = file.url || file.fileUrl || `/public/uploads/${file.name}`;
    setAttachedFileUrl(url);
    setAttachedFileName(file.name);
    setAttachedFileSize(file.formattedSize || '');
    setAttachedFileType(file.type || 'file');

    if (!title.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }

    setIsFilePickerOpen(false);
    showAlert({
      title: 'File Attached',
      message: `"${file.name}" has been attached from your uploaded course files.`,
      type: 'success'
    });
  };

  // Question-set save: creates/updates the REAL activity row, then links it
  // via the synthetic `asg-activity-<id>` convention. Questions are
  // write-once (server PATCH covers header fields only), so editing a linked
  // activity updates its header and leaves questions locked.
  const handleSaveQuestionSet = async (addAnother: boolean = false) => {
    if (isEditing && editingItem && linkedActivity) {
      if (!questionSet.title.trim()) {
        showAlert({
          title: 'Title required',
          message: 'Give this activity a title.',
          type: 'warning'
        });
        return;
      }
      try {
        await updateActivity(linkedActivity.id, {
          title: questionSet.title.trim(),
          instructions: questionSet.instructions.trim() || 'Answer all questions carefully.',
          dueDate: questionSet.dueDate ? new Date(questionSet.dueDate).toISOString() : undefined
        });
        await updateModuleItem(
          moduleId,
          editingItem.id,
          {
            title: questionSet.title.trim(),
            type: 'activity',
            content:
              questionSet.instructions.trim() ||
              'Unit resource instructions aligned with syllabus requirements.',
            activityId: questionSetLinkOf(linkedActivity.id)
          },
          targetModuleId
        );
        showAlert({
          title: 'Module Item Updated',
          message: `"${questionSet.title.trim()}" has been updated successfully.`,
          type: 'success'
        });
        onBack();
      } catch {
        // Context already surfaced the failure alert.
      }
      return;
    }

    const err = validateQuestionSet(questionSet);
    if (err) {
      showAlert({ title: err.title, message: err.message, type: 'warning' });
      return;
    }

    const savedTitle = questionSet.title.trim();
    const savedContent =
      questionSet.instructions.trim() || 'Unit resource instructions aligned with syllabus requirements.';

    if (isEditing && editingItem) {
      // Legacy item without a linked row — create the row now and link it.
      try {
        const created = await createActivity(buildActivityPayload(courseId, questionSet));
        await updateModuleItem(
          moduleId,
          editingItem.id,
          {
            title: savedTitle,
            type: 'activity',
            content: savedContent,
            activityId: questionSetLinkOf(created.id)
          },
          targetModuleId
        );
        showAlert({
          title: 'Module Item Updated',
          message: `"${savedTitle}" has been updated successfully.`,
          type: 'success'
        });
        onBack();
      } catch {
        // Context already surfaced the failure alert.
      }
      return;
    }

    try {
      const created = await createActivity(buildActivityPayload(courseId, questionSet));
      await addModuleItem(targetModuleId, {
        title: savedTitle,
        type: 'activity',
        content: savedContent,
        published: true,
        required: false,
        completionCondition: 'submit',
        activityId: questionSetLinkOf(created.id)
      });
    } catch {
      // Context already surfaced the failure alert.
      return;
    }

    if (addAnother) {
      showAlert({
        title: 'Item Added to Module',
        message: `"${savedTitle}" has been added. You can add another item now.`,
        type: 'success'
      });
      setQuestionSet({ ...emptyQuestionSetValue(), term: defaultAssessmentTerm });
    } else {
      showAlert({
        title: 'Item Added to Module',
        message: `"${savedTitle}" has been added to ${selectedModule?.title || 'the module'}.`,
        type: 'success'
      });
      onBack();
    }
  };

  // Assessment save: creates/updates the REAL classic activity row, then links it.
  const handleSaveActivity = async (addAnother: boolean = false) => {
    if (activityMode === 'question_set') {
      await handleSaveQuestionSet(addAnother);
      return;
    }
    const err = validateActivityForm(activityForm);
    if (err) {
      showAlert({ title: err.title, message: err.message, type: 'warning' });
      return;
    }

    const savedTitle = activityForm.title.trim();
    const savedContent =
      activityForm.instructions.trim() || 'Unit resource instructions aligned with syllabus requirements.';
    const fileFields = {
      fileName: activityForm.attachedFile?.name || undefined,
      fileSize: activityForm.attachedFile?.size || undefined,
      fileUrl: activityForm.attachedFile?.url || undefined
    };

    if (isEditing && editingItem) {
      try {
        let activityId = linkedClassicActivity?.id;
        if (linkedClassicActivity) {
          const payload = buildClassicActivityPayload(courseId, activityForm, linkedClassicActivity.published);
          const { courseId: _courseId, ...updates } = payload;
          await updateActivity(linkedClassicActivity.id, updates);
        } else {
          // Legacy item without a linked row — create the row now and link it.
          const created = await createActivity(
            buildClassicActivityPayload(courseId, activityForm, editingItem.published)
          );
          activityId = created.id;
        }
        await updateModuleItem(
          moduleId,
          editingItem.id,
          { title: savedTitle, type: 'activity', content: savedContent, activityId, ...fileFields },
          targetModuleId
        );
        showAlert({
          title: 'Module Item Updated',
          message: `"${savedTitle}" has been updated successfully.`,
          type: 'success'
        });
        onBack();
      } catch {
        // Context already surfaced the failure alert.
      }
      return;
    }

    try {
      const created = await createActivity(buildClassicActivityPayload(courseId, activityForm, true));
      await addModuleItem(targetModuleId, {
        title: savedTitle,
        type: 'activity',
        content: savedContent,
        published: true,
        required: false,
        completionCondition: 'submit',
        activityId: created.id,
        ...fileFields
      });
    } catch {
      // Context already surfaced the failure alert.
      return;
    }

    if (addAnother) {
      showAlert({
        title: 'Item Added to Module',
        message: `"${savedTitle}" has been added. You can add another item now.`,
        type: 'success'
      });
      setActivityForm(emptyActivityFormValue());
      setQuestionSet({ ...emptyQuestionSetValue(), term: defaultAssessmentTerm });
    } else {
      showAlert({
        title: 'Item Added to Module',
        message: `"${savedTitle}" has been added to ${selectedModule?.title || 'the module'}.`,
        type: 'success'
      });
      onBack();
    }
  };

  // Assessment save: creates/updates the REAL quiz row, then links it. Quiz
  // questions are write-once (server PATCH covers header fields only), so
  // editing a linked quiz updates its header and leaves questions locked.
  const handleSaveQuizItem = async (addAnother: boolean = false) => {
    if (isEditing && editingItem && linkedQuiz) {
      if (!quizBuilder.title.trim()) {
        showAlert({
          title: 'Missing Quiz Title',
          message: 'Please provide a title for this assessment quiz before saving.',
          type: 'warning'
        });
        return;
      }
      try {
        if (typeof updateQuiz !== 'function') {
          showAlert({
            title: 'Quiz Editing Unavailable',
            message: 'Quiz header editing is not provided by the course store yet. Your changes were not saved.',
            type: 'warning'
          });
          return;
        }
        await updateQuiz(linkedQuiz.id, {
          title: quizBuilder.title.trim(),
          instructions:
            quizBuilder.instructions.trim() || 'Answer all questions carefully within the allotted time limit.',
          timeLimitMinutes: Number(quizBuilder.timeLimitMinutes) || 30,
          delayedUntil:
            quizBuilder.delayPosting && quizBuilder.delayedDate
              ? new Date(quizBuilder.delayedDate).toISOString()
              : null
        });
        await updateModuleItem(
          moduleId,
          editingItem.id,
          {
            title: quizBuilder.title.trim(),
            type: 'quiz',
            content:
              quizBuilder.instructions.trim() ||
              'Unit resource instructions aligned with syllabus requirements.',
            quizId: linkedQuiz.id
          },
          targetModuleId
        );
        showAlert({
          title: 'Module Item Updated',
          message: `"${quizBuilder.title.trim()}" has been updated successfully.`,
          type: 'success'
        });
        onBack();
      } catch {
        // Context already surfaced the failure alert.
      }
      return;
    }

    const err = validateQuizBuilder(quizBuilder);
    if (err) {
      showAlert({ title: err.title, message: err.message, type: 'warning' });
      return;
    }

    const savedTitle = quizBuilder.title.trim();
    const savedContent =
      quizBuilder.instructions.trim() || 'Unit resource instructions aligned with syllabus requirements.';

    if (isEditing && editingItem) {
      // Legacy item without a linked row — create the row now and link it.
      try {
        const created = await createQuiz(buildQuizPayload(courseId, quizBuilder, editingItem.published));
        await updateModuleItem(
          moduleId,
          editingItem.id,
          { title: savedTitle, type: 'quiz', content: savedContent, quizId: created.id },
          targetModuleId
        );
        showAlert({
          title: 'Module Item Updated',
          message: `"${savedTitle}" has been updated successfully.`,
          type: 'success'
        });
        onBack();
      } catch {
        // Context already surfaced the failure alert.
      }
      return;
    }

    try {
      const created = await createQuiz(buildQuizPayload(courseId, quizBuilder, true));
      await addModuleItem(targetModuleId, {
        title: savedTitle,
        type: 'quiz',
        content: savedContent,
        published: true,
        required: false,
        completionCondition: 'submit',
        quizId: created.id
      });
    } catch {
      // Context already surfaced the failure alert.
      return;
    }

    if (addAnother) {
      showAlert({
        title: 'Item Added to Module',
        message: `"${savedTitle}" has been added. You can add another item now.`,
        type: 'success'
      });
      setQuizBuilder({ ...emptyQuizBuilderValue(), term: defaultAssessmentTerm });
    } else {
      showAlert({
        title: 'Item Added to Module',
        message: `"${savedTitle}" has been added to ${selectedModule?.title || 'the module'}.`,
        type: 'success'
      });
      onBack();
    }
  };

  const handleSave = async (addAnother: boolean = false) => {
    if (upload.isUploading || isSaving) return;
    setIsSaving(true);
    try {
      if (itemType === 'activity') {
        await handleSaveActivity(addAnother);
        return;
      }
      if (itemType === 'quiz') {
        await handleSaveQuizItem(addAnother);
        return;
      }
      if (!title.trim()) {
        showAlert({
          title: 'Missing Resource Title',
          message: 'Please provide a title for this module item.',
          type: 'warning'
        });
        return;
      }

      const savedTitle = title.trim();

      if (isEditing && editingItem) {
        try {
          await updateModuleItem(
            moduleId,
            editingItem.id,
            {
              title: savedTitle,
              type: itemType,
              content: content.trim() || 'Unit resource instructions aligned with syllabus requirements.',
              fileName: attachedFileName || undefined,
              fileSize: attachedFileSize || undefined,
              fileType: attachedFileType || undefined,
              fileUrl: attachedFileUrl || undefined
            },
            targetModuleId
          );

          showAlert({
            title: 'Module Item Updated',
            message: `"${savedTitle}" has been updated successfully.`,
            type: 'success'
          });
          onBack();
        } catch {
          // Context already surfaced the failure alert.
        }
        return;
      }

      try {
        await addModuleItem(targetModuleId, {
          title: savedTitle,
          type: itemType,
          content: content.trim() || 'Unit resource instructions aligned with syllabus requirements.',
          published: true,
          required: false,
          completionCondition: 'view',
          fileName: attachedFileName || undefined,
          fileSize: attachedFileSize || undefined,
          fileType: attachedFileType || undefined,
          fileUrl: attachedFileUrl || undefined
        });
      } catch {
        // Context already surfaced the failure alert.
        return;
      }

      if (addAnother) {
        showAlert({
          title: 'Item Added to Module',
          message: `"${savedTitle}" has been added. You can add another item now.`,
          type: 'success'
        });
        setTitle('');
        setContent('');
        handleRemoveAttachment();
      } else {
        showAlert({
          title: 'Item Added to Module',
          message: `"${savedTitle}" has been added to ${selectedModule?.title || 'the module'}.`,
          type: 'success'
        });
        onBack();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSave(false);
  };

  const getFileIcon = (type: string, name: string) => {
    const lowerName = name.toLowerCase();
    if (type.includes('image') || /\.(jpg|jpeg|png|gif|svg|webp)$/.test(lowerName)) {
      return <ImageIcon className="w-5 h-5 text-muted-foreground" />;
    }
    if (type.includes('pdf') || lowerName.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
    if (type.includes('code') || /\.(py|js|ts|jsx|tsx|html|css|json|java|c|cpp)$/.test(lowerName)) {
      return <FileCode className="w-5 h-5 text-muted-foreground" />;
    }
    if (type.includes('zip') || /\.(zip|rar|7z|tar|gz)$/.test(lowerName)) {
      return <FileArchive className="w-5 h-5 text-muted-foreground" />;
    }
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pt-6 sm:pt-8 pb-16 px-1">
      {/* Top Breadcrumb & Header */}
      <div className="pb-7 sm:pb-8 border-b border-border/70">
        <div className="space-y-3 sm:space-y-3.5">
          {/* Breadcrumb row */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground font-sans">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-primary transition-colors cursor-pointer flex items-center space-x-1.5 font-medium group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Modules</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-semibold truncate max-w-[240px]">
              {selectedModule?.title || 'Unit Module'}
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full bg-muted border border-border text-[11px]">
              {isEditing ? 'Edit item' : 'Add item'}
            </span>
          </div>

          {/* Heading and subtitle */}
          <div className="pt-1.5 space-y-1.5">
            <h1 className="text-[22px] font-extrabold tracking-tight text-foreground flex items-center space-x-3 font-sans">
              <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <span>{isEditing ? 'Edit module item' : 'Add item to module'}</span>
            </h1>
            <p className="text-[13px] text-muted-foreground pl-0.5">
              {course ? `${course.code} • ` : ''}
              {isEditing
                ? 'Update learning material, instructions, or attached files for this unit item.'
                : 'Publish reading materials, activities, quizzes, and attach downloadable files.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Item Basic Info */}
        <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-border/70">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-[12px] font-semibold text-muted-foreground">
                Resource information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Target Module Custom Dropdown */}
              <div className="relative" ref={moduleDropdownRef}>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Target module
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsModuleDropdownOpen(!isModuleDropdownOpen);
                    setIsTypeDropdownOpen(false);
                  }}
                  className={`w-full p-2.5 bg-background border rounded-xl text-xs font-bold text-foreground flex items-center justify-between  transition-all cursor-pointer group ${isModuleDropdownOpen
                    ? 'border-primary ring-2 ring-primary/20 shadow-primary-sm'
                    : 'border-border hover:border-primary/40'
                    }`}
                >
                  <div className="flex items-center space-x-2.5 truncate min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate text-left">
                      <span className="font-sans font-bold text-foreground block truncate">
                        {selectedModule?.title || 'Select a target module'}
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ml-1.5 ${isModuleDropdownOpen ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground group-hover:text-foreground'
                    }`}>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${isModuleDropdownOpen ? 'rotate-180 text-primary' : 'rotate-0'
                        }`}
                    />
                  </div>
                </button>

                {isModuleDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 dropdown-panel p-2 z-50 animate-dropdown">
                    <div className="px-2.5 py-1.5 border-b border-border/70 mb-1.5">
                      <span className="text-[12px] font-semibold text-muted-foreground">
                        Select module unit
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                      {sortedModules.map(mod => {
                        const isSelected = mod.id === targetModuleId;
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => {
                              setTargetModuleId(mod.id);
                              setIsModuleDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer group ${isSelected
                              ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-xs'
                              : 'text-foreground hover:bg-muted/80 hover:translate-x-0.5 font-medium'
                              }`}
                          >
                            <div className="flex items-center space-x-2.5 truncate min-w-0">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                                }`}>
                                {mod.order}
                              </div>
                              <div className="truncate">
                                <span className="font-sans font-bold block truncate">{mod.title}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 ml-1.5">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Resource Type Custom Dropdown */}
              <div className="relative" ref={typeDropdownRef}>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Resource type
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsTypeDropdownOpen(!isTypeDropdownOpen);
                    setIsModuleDropdownOpen(false);
                  }}
                  className={`w-full p-2.5 bg-background border rounded-xl text-xs font-bold text-foreground flex items-center justify-between  transition-all cursor-pointer group ${isTypeDropdownOpen
                    ? 'border-primary ring-2 ring-primary/20 shadow-primary-sm'
                    : 'border-border hover:border-primary/40'
                    }`}
                >
                  <div className="flex items-center space-x-2.5 truncate min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${currentResourceType.iconBg}`}>
                      <currentResourceType.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate text-left">
                      <div className="flex items-center space-x-2">
                        <span className="font-sans font-bold text-foreground truncate">
                          {currentResourceType.label}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-sans font-bold rounded-md border shrink-0 ${currentResourceType.badgeColor}`}>
                          {currentResourceType.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ml-1.5 ${isTypeDropdownOpen ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground group-hover:text-foreground'
                    }`}>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${isTypeDropdownOpen ? 'rotate-180 text-primary' : 'rotate-0'
                        }`}
                    />
                  </div>
                </button>

                {isTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 dropdown-panel p-2 z-50 animate-dropdown">
                    <div className="px-2.5 py-1.5 border-b border-border/70 mb-1.5">
                      <span className="text-[12px] font-semibold text-muted-foreground">
                        Select resource type
                      </span>
                    </div>
                    <div className="space-y-1">
                      {RESOURCE_TYPES.map(res => {
                        const isSelected = res.type === itemType;
                        const Icon = res.icon;
                        return (
                          <button
                            key={res.type}
                            type="button"
                            onClick={() => {
                              setItemType(res.type);
                              setIsTypeDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer group ${isSelected
                              ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-xs'
                              : 'text-foreground hover:bg-muted/80 hover:translate-x-0.5 font-medium'
                              }`}
                          >
                            <div className="flex items-center space-x-2.5 truncate min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${res.iconBg}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-sans font-bold block truncate">{res.label}</span>
                                  <span className={`px-1.5 py-0.2 text-[9px] font-sans font-bold rounded-md border shrink-0 ${res.badgeColor}`}>
                                    {res.badge}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 ml-1.5">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generic title/content — replaced by the Activities / Quizzes
                inputs below when an assessment resource type is selected. */}
            {(itemType !== 'activity' && itemType !== 'quiz') && (
              <>
                <div>
                  <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                    Resource title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Chapter 4: Neural Architectures & Heuristic Search"
                    className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-[13px] outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                    Content / syllabus instructions / URL
                  </label>
                  <textarea
                    rows={5}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Provide instructions, summary notes, reading objectives, or external URL links..."
                    className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-[13px] font-sans placeholder:text-muted-foreground outline-none resize-y"
                  />
                </div>
              </>
            )}
          </div>

          {/* Assessment sections — the SAME inputs as the Activities page:
              Classic activity form or New Question Set builder. */}
          {itemType === 'activity' && (
            <div className="space-y-4">
              <div>
                <div className="p-1 w-full bg-muted/60 border border-border rounded-2xl grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setActivityMode('classic')}
                    className={`p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                      activityMode === 'classic'
                        ? 'bg-primary/[0.04] text-foreground border border-primary/30 ring-1 ring-primary/15'
                        : 'text-muted-foreground border border-border/70 hover:bg-muted/40'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4 text-muted-foreground" />
                    <span>Classic activity</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityMode('question_set')}
                    className={`p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                      activityMode === 'question_set'
                        ? 'bg-primary/[0.04] text-foreground border border-primary/30 ring-1 ring-primary/15'
                        : 'text-muted-foreground border border-border/70 hover:bg-muted/40'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span>New question set</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium mt-1.5">
                  {activityMode === 'classic'
                    ? 'File upload / text entry activity with rubric and deadlines.'
                    : 'Quiz-style question set (Multiple Choice, Identification, True/False, Essay) auto-scored on submit.'}
                </p>
              </div>

              {activityMode === 'classic' ? (
                <ActivityFormFields
                  courseId={courseId}
                  value={activityForm}
                  onChange={setActivityForm}
                />
              ) : (
                <QuestionSetFields
                  value={questionSet}
                  onChange={setQuestionSet}
                  questionsEditable={!linkedActivity}
                  courseId={courseId}
                />
              )}
            </div>
          )}

          {/* ... and the SAME builder as the Quizzes page. */}
          {itemType === 'quiz' && (
            <div className="space-y-4">
              {!linkedQuiz && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('quiz-builder:toggle-upload'))}
                    className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-98 flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                  </button>
                </div>
              )}
              <QuizBuilderFields
                value={quizBuilder}
                onChange={setQuizBuilder}
                questionsEditable={!linkedQuiz}
                courseId={courseId}
              />
            </div>
          )}

          {/* Section 2: File Attachment (Faculty Can Attach a File) — hidden for
              assessment types (the activity form carries its own handout attach;
              quizzes take no file on this page, same as the Quizzes page). */}
          {(itemType !== 'activity' && itemType !== 'quiz') && (
          <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-[12px] font-semibold text-muted-foreground">
                  File attachment
                </h3>
              </div>
              {attachedFileName && (
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-sans flex items-center space-x-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove File</span>
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Attach syllabus documents, lecture slides, code archives, or lab manuals. Students can download or preview attached files directly from this module item.
            </p>

            {/* Attached File Preview Card */}
            {attachedFileName ? (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 ">
                    {getFileIcon(attachedFileType, attachedFileName)}
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-xs text-foreground block truncate">
                      {attachedFileName}
                    </span>
                    <div className="flex items-center space-x-2 text-[10px] font-sans text-muted-foreground mt-0.5">
                      <span>{attachedFileSize || 'Document'}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                        <Check className="w-3 h-3 inline" />
                        <span>Ready to attach</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilePickerOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                  >
                    Browse Uploaded
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    if (!upload.isUploading) setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => { if (!upload.isUploading) fileInputRef.current?.click(); }}
                  aria-disabled={upload.isUploading}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${isDragging
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }${upload.isUploading ? ' opacity-60 cursor-wait pointer-events-none' : ''}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-foreground">
                    Upload a file from your device
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Drag and drop file here, or click to browse (PDF, PPTX, DOCX, ZIP, Code, Media up to 50MB)
                  </p>
                </div>

                {upload.isUploading && upload.fileName && (
                  <UploadProgress fileName={upload.fileName} progress={upload.progress} hint="Uploading file..." />
                )}

                {/* Browse uploaded files */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsFilePickerOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 border border-primary/30 bg-primary/5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse Uploaded Files</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-border/70">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                void handleSave(true);
              }}
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
            >
              {isSaving ? (
                <span className="block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save & add another'}</span>
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            title={isSaving ? 'Saving...' : 'Save item'}
            className="px-6 py-2.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSaving ? (
              <span className="block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Save & add to module'}</span>
          </button>
        </div>
      </form>

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

export default AddModuleItemPage;
