import React, { useState, useRef } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { QuizQuestion, QuizItemType, TermId } from '@/services/lms/types/lms.types';
import type { QuizImportDraft } from '@/utils/quizImport';
import { applyQuizTextLimit, classifyQuizImportFile, isQuizImportTooLarge, parseQuizText } from '@/utils/quizImport';
import { extractDocxText, extractPdfText } from '@/utils/quizExtract';
import { useSimulatedUpload } from '@/hooks/useSimulatedUpload';
import { UploadProgress } from '@/components/shared/UploadProgress';
import { TermSelect } from '@/components/shared/TermSelect';
import {
  ArrowLeft,
  HelpCircle,
  Clock,
  Trash2,
  Check,
  AlignLeft,
  AlignJustify,
  PenTool,
  ToggleLeft,
  FileText,
  Layers,
  Copy,
  GripVertical,
  X,
  PlusCircle,
  CheckCircle2,
  CircleDot,
  Type,
  Heading,
  Split,
  ChevronDown,
  RefreshCcw,
  Upload,
  Loader2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface CreateExamPageProps {
  courseId: string;
  onBack: () => void;
  onExamCreated: (newExamId: string) => void;
}

interface QuestionDraft {
  id: string;
  text: string;
  type: QuizItemType;
  options: string[];
  correctAnswer: string;
  points: number;
  description?: string;
  rubricNotes?: string;
  required?: boolean;
}

interface QuestionTypeOption {
  value: QuizItemType;
  label: string;
  group: 'questions' | 'layout';
  icon: React.ElementType;
}

const QUESTION_TYPE_OPTIONS: QuestionTypeOption[] = [
  {
    value: 'multiple_choice',
    label: 'Multiple Choice',
    group: 'questions',
    icon: CircleDot,
  },
  {
    value: 'identification',
    label: 'Short Answer / Identification',
    group: 'questions',
    icon: Type,
  },
  {
    value: 'true_false',
    label: 'True / False',
    group: 'questions',
    icon: ToggleLeft,
  },
  {
    value: 'essay',
    label: 'Paragraph / Essay',
    group: 'questions',
    icon: AlignJustify,
  },
  {
    value: 'description',
    label: 'Title & Description',
    group: 'layout',
    icon: Heading,
  },
  {
    value: 'page_break',
    label: 'Section / Page Break',
    group: 'layout',
    icon: Split,
  },
];

export const CreateExamPage: React.FC<CreateExamPageProps> = ({
  courseId,
  onBack,
  onExamCreated
}) => {
  const { db, createExam, showAlert, effectiveTermsForCourse } = useLMS();
  const course = db.courses.find(c => c.id === courseId);

  // General Exam Information (Google Form Header Card)
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);

  // Exam term — syllabus-driven options, defaulting to the first effective
  // term. Always sent; the server 400s without it.
  const examTerms: TermId[] =
    typeof effectiveTermsForCourse === 'function'
      ? effectiveTermsForCourse(courseId)
      : ['midterm', 'finals'];
  const [term, setTerm] = useState<TermId>(() => examTerms[0] ?? 'midterm');
  const safeTerm: TermId = examTerms.includes(term) ? term : (examTerms[0] ?? 'midterm');

  // Active selected card index (for highlighting with left border and positioning floating toolbar)
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  // Open question type dropdown index
  const [openTypeDropdownIndex, setOpenTypeDropdownIndex] = useState<number | null>(null);

  // Exam Items / Cards List
  const [items, setItems] = useState<QuestionDraft[]>(() => [
    {
      id: 'item-initial-1',
      text: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correctAnswer: 'A',
      points: 1,
      required: true
    }
  ]);

  // Exam File Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const upload = useSimulatedUpload();
  const [extractedQuestions, setExtractedQuestions] = useState<QuestionDraft[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const toQuestionDraft = (q: QuizImportDraft, idx: number): QuestionDraft => ({
    id: `item-${Date.now()}-${idx + 1}`,
    text: q.text,
    type: q.type,
    options: q.options,
    correctAnswer: q.correctAnswer,
    points: q.points,
    required: true,
  });
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Which save is in flight (null when idle). One shared flag so the
  // clicked button can spin while every save button disables — and
  // double-clicks can't double-submit.
  const [savingAction, setSavingAction] = useState<'publish' | 'draft' | null>(null);

  const handleAddItem = (type: QuizItemType, insertAfterIndex?: number) => {
    let newItem: QuestionDraft;
    const newId = `item-${Date.now()}-${items.length + 1}`;

    if (type === 'multiple_choice') {
      newItem = {
        id: newId,
        text: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correctAnswer: 'A',
        points: 1,
        required: true
      };
    } else if (type === 'identification') {
      newItem = {
        id: newId,
        text: '',
        type: 'identification',
        options: [],
        correctAnswer: '',
        points: 1,
        description: 'Short answer prompt. Responses are matched against the answer key.',
        required: true
      };
    } else if (type === 'true_false') {
      newItem = {
        id: newId,
        text: '',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        points: 1,
        required: true
      };
    } else if (type === 'essay') {
      newItem = {
        id: newId,
        text: '',
        type: 'essay',
        options: [],
        correctAnswer: '',
        points: 1,
        rubricNotes: 'Graded based on clarity, depth, and relevance to the topic.',
        required: true
      };
    } else if (type === 'description') {
      newItem = {
        id: newId,
        text: 'Title and Description',
        type: 'description',
        options: [],
        correctAnswer: '',
        points: 0,
        description: 'Read the following section carefully before answering the succeeding questions.'
      };
    } else {
      // page_break (Section / New Page)
      const pageCount = items.filter(i => i.type === 'page_break').length + 2;
      newItem = {
        id: newId,
        text: `Section ${pageCount}`,
        type: 'page_break',
        options: [],
        correctAnswer: '',
        points: 0,
        description: 'Questions below this break will be presented on a new page for test-takers.'
      };
    }

    const targetIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : items.length;
    setItems(prev => {
      const next = [...prev];
      next.splice(targetIndex, 0, newItem);
      return next;
    });
    setActiveCardIndex(targetIndex);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showAlert({
        title: 'At Least One Item Required',
        message: 'An exam must contain at least one question or card.',
        type: 'warning'
      });
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
    setActiveCardIndex(prev => Math.max(0, prev - 1));
  };

  const dragFromIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleMoveItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setActiveCardIndex(to);
  };

  const handleDuplicateItem = (index: number) => {
    setItems(prev => {
      const itemToDup = prev[index];
      if (!itemToDup) return prev;
      const duplicated: QuestionDraft = {
        ...itemToDup,
        id: `item-${Date.now()}-${prev.length + 1}`,
        options: [...itemToDup.options]
      };
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
    setActiveCardIndex(index + 1);
  };

  const handleUpdateItem = (index: number, updates: Partial<QuestionDraft>) => {
    setItems(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item))
    );
  };

  const handleChangeItemType = (index: number, newType: QuizItemType) => {
    setItems(prev =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        let points = item.points;
        if (newType === 'description' || newType === 'page_break') {
          points = 0;
        } else if (points === 0) {
          points = 1;
        }

        let options = item.options;
        if (newType === 'multiple_choice' && options.length === 0) {
          options = ['', '', '', ''];
        } else if (newType === 'true_false') {
          options = ['True', 'False'];
        }

        let correctAnswer = item.correctAnswer;
        if (newType === 'true_false') {
          correctAnswer = 'True';
        } else if (newType === 'multiple_choice' && !correctAnswer) {
          correctAnswer = 'A';
        }

        return {
          ...item,
          type: newType,
          points,
          options,
          correctAnswer
        };
      })
    );
  };

  const handleUpdateOption = (itemIndex: number, optIndex: number, val: string) => {
    setItems(prev =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const newOpts = [...item.options];
        newOpts[optIndex] = val;
        return { ...item, options: newOpts };
      })
    );
  };

  const handleAddOption = (itemIndex: number) => {
    setItems(prev =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        return { ...item, options: [...item.options, ''] };
      })
    );
  };

  const handleRemoveOption = (itemIndex: number, optIndex: number) => {
    setItems(prev =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        if (item.options.length <= 2) {
          showAlert({
            title: 'Minimum 2 Options',
            message: 'Multiple choice questions must have at least 2 choices.',
            type: 'warning'
          });
          return item;
        }
        const newOpts = item.options.filter((_, oIdx) => oIdx !== optIndex);
        return { ...item, options: newOpts };
      })
    );
  };

  const totalPoints = items.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
  const totalQuestions = items.filter(
    i => i.type !== 'description' && i.type !== 'page_break'
  ).length;
  const totalPages = items.filter(i => i.type === 'page_break').length + 1;

  const handleSaveExam = async (published: boolean) => {
    if (savingAction) return;
    if (!title.trim()) {
      showAlert({
        title: 'Missing Exam Title',
        message: 'Please provide a title for this assessment exam before saving.',
        type: 'warning'
      });
      return;
    }

    if (totalQuestions === 0) {
      showAlert({
        title: 'Questions Required',
        message: 'Please add at least one gradable question (Multiple Choice, Identification, True/False, or Essay).',
        type: 'warning'
      });
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.text.trim()) {
        showAlert({
          title: `Item ${i + 1} Incomplete`,
          message: `Please fill in the title or prompt for card #${i + 1}.`,
          type: 'warning'
        });
        return;
      }

      if (item.type === 'multiple_choice') {
        if (item.options.length < 2) {
          showAlert({
            title: `Question ${i + 1} Options Required`,
            message: `Question ${i + 1} requires at least 2 choices.`,
            type: 'warning'
          });
          return;
        }
      }

      if (item.type === 'identification' && !item.correctAnswer.trim()) {
        showAlert({
          title: `Question ${i + 1} Answer Key Missing`,
          message: `Please specify the expected correct answer for Identification Question #${i + 1}.`,
          type: 'warning'
        });
        return;
      }
    }

    const compiledQuestions: QuizQuestion[] = items.map((item, idx) => {
      if (item.type === 'true_false') {
        return {
          id: item.id || `q-${Date.now()}-${idx + 1}`,
          text: item.text.trim(),
          type: 'true_false',
          options: ['True', 'False'],
          correctAnswer: item.correctAnswer === 'False' ? 'False' : 'True',
          points: Number(item.points) || 1
        };
      }

      if (item.type === 'identification') {
        return {
          id: item.id || `q-${Date.now()}-${idx + 1}`,
          text: item.text.trim(),
          type: 'identification',
          correctAnswer: item.correctAnswer.trim(),
          points: Number(item.points) || 1,
          description: item.description?.trim()
        };
      }

      if (item.type === 'essay') {
        return {
          id: item.id || `q-${Date.now()}-${idx + 1}`,
          text: item.text.trim(),
          type: 'essay',
          points: Number(item.points) || 1,
          rubricNotes: item.rubricNotes?.trim()
        };
      }

      if (item.type === 'description') {
        return {
          id: item.id || `q-${Date.now()}-${idx + 1}`,
          text: item.text.trim(),
          type: 'description',
          points: 0,
          description: item.description?.trim()
        };
      }

      if (item.type === 'page_break') {
        return {
          id: item.id || `q-${Date.now()}-${idx + 1}`,
          text: item.text.trim(),
          type: 'page_break',
          points: 0,
          description: item.description?.trim()
        };
      }

      // multiple_choice
      const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
      const selectedIndex = letterMap[item.correctAnswer] ?? 0;
      const validOptions = item.options.map(opt => opt.trim()).filter(Boolean);
      const correctAns = validOptions[selectedIndex] || validOptions[0] || 'Choice A';

      return {
        id: item.id || `q-${Date.now()}-${idx + 1}`,
        text: item.text.trim(),
        type: 'multiple_choice',
        options: validOptions,
        correctAnswer: correctAns,
        points: Number(item.points) || 1
      };
    });

    setSavingAction(published ? 'publish' : 'draft');
    try {
      const created = await createExam({
        courseId,
        title: title.trim(),
        instructions: instructions.trim() || 'Answer all questions carefully within the allotted time limit.',
        timeLimitMinutes: Number(timeLimitMinutes) || 30,
        published,
        term: safeTerm,
        questions: compiledQuestions
      });

      showAlert({
        title: published ? 'Exam Published' : 'Exam Draft Saved',
        message: `"${title.trim()}" created with ${totalQuestions} question(s) across ${totalPages} page(s), totaling ${totalPoints} pts.`,
        type: 'success'
      });

      onExamCreated(created.id);
    } finally {
      setSavingAction(null);
    }
  };

  const handleUploadExamFile = async (file: File) => {
    if (isQuizImportTooLarge(file.size)) {
      showAlert({
        title: 'File too large',
        message: `"${file.name}" exceeds the 10 MB limit. Please split the document and try again.`,
        type: 'error'
      });
      return;
    }
    const kind = classifyQuizImportFile(file.name);
    if (kind === 'unsupported') {
      showAlert({
        title: 'Unsupported file type',
        message: 'Upload a PDF, DOCX, TXT, MD, JSON, or CSV file. Legacy .doc files must be re-saved as .docx first.',
        type: 'error'
      });
      return;
    }
    if (upload.isUploading) return;
    upload.start(file.name);
    setUploadFile(file);
    try {
      let raw: string;
      let truncated = false;
      if (kind === 'pdf') {
        const out = await extractPdfText(file);
        raw = out.text;
        truncated = out.truncated;
      } else if (kind === 'docx') {
        const out = await extractDocxText(file);
        raw = out.text;
        truncated = out.truncated;
      } else {
        const limited = applyQuizTextLimit(await file.text());
        raw = limited.text;
        truncated = limited.truncated;
      }
      setExtractedQuestions(parseQuizText(raw).map(toQuestionDraft));
      setShowPasteFallback(false);
      upload.complete();
      if (truncated) {
        showAlert({
          title: 'Large document truncated',
          message: 'Only the first portion was parsed to protect local storage. Review the drafts, then paste any remaining questions manually.',
          type: 'warning'
        });
      }
    } catch (err) {
      setExtractedQuestions([]);
      upload.fail();
      const message = err instanceof Error ? err.message : 'Could not read the uploaded file.';
      const needsPaste = /paste/i.test(message);
      if (needsPaste) setShowPasteFallback(true);
      showAlert({
        title: needsPaste ? 'No extractable text' : 'Error reading file',
        message,
        type: needsPaste ? 'warning' : 'error'
      });
    } finally {
      setShowFileSelector(true);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pt-4 sm:pt-6 pb-28 px-2 sm:px-4 font-sans select-none">
      {/* Top Header & Breadcrumb */}
      <div className="pb-4 border-b border-border/70">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground font-sans">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-primary transition-colors cursor-pointer flex items-center space-x-1.5 font-medium group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Examzes</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-semibold truncate max-w-[240px]">
              {course?.code || 'Course'}
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full bg-muted border border-border text-[11px]">
              Exam builder
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div className="space-y-1">
              <h1 className="text-[22px] font-extrabold tracking-tight text-foreground flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span>Create assessment exam</span>
              </h1>
              <p className="text-[13px] text-muted-foreground pl-0.5">
                Author multiple choice, identification, true/false, and essay items with options and floating actions.
              </p>
            </div>

            {/* Quick Action Top Bar */}
            <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowFileSelector(prev => !prev)}
                className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-98 flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload file</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveExam(false)}
                disabled={savingAction !== null}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-wait flex items-center space-x-1.5"
              >
                {savingAction === 'draft' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{savingAction === 'draft' ? 'Saving…' : 'Save draft'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveExam(true)}
                disabled={savingAction !== null}
                className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-98 flex items-center space-x-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {savingAction === 'publish'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
                <span>{savingAction === 'publish' ? 'Publishing…' : 'Publish exam'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Container (Cards Column + Google Forms Floating Side Actions) */}
      <div className="relative flex flex-col md:flex-row gap-6 items-start">
        {/* Main Form Content Cards Column */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSaveExam(true);
          }}
          className="w-full flex-1 space-y-4 text-xs"
        >
          {/* Exam File Upload Section */}
          {showFileSelector && (
            <div className="p-4 bg-card border border-border rounded-2xl  space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground">Upload Exam Document</p>
                  <p className="text-xs text-muted-foreground">
                    Upload a PDF, DOCX, TXT, or JSON file to auto-populate exam questions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFileSelector(false)}
                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 rounded-lg hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* File Drop Zone or Browse Button */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    setUploadFile(file);
                    handleUploadExamFile(file);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDraggingFile
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <Upload className="w-8 h-8 text-primary mb-2" />
                <p className="font-semibold text-foreground text-xs mb-1">Click to browse or drag & drop</p>
                <p className="text-[11px] text-muted-foreground">
                  Supports PDF, DOCX, TXT, MD, JSON (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.json,.csv"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      e.target.value = '';
                      setUploadFile(file);
                      handleUploadExamFile(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Upload Status */}
              {uploadFile && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-primary text-xs">
                      {uploadFile.name}
                    </p>
                    <p className="text-[10px] text-primary/80">
                      {uploadFile.size > 1024 * 1024
                        ? `${(uploadFile.size / 1024 / 1024).toFixed(1)} MB`
                        : `${(uploadFile.size / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                  {!upload.isUploading && (
                    <button
                      type="button"
                      onClick={() => handleUploadExamFile(uploadFile)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      <span>Re-parse</span>
                    </button>
                  )}
                </div>
              )}

              {/* Extraction Progress */}
              {upload.isUploading && upload.fileName && (
                <UploadProgress fileName={upload.fileName} progress={upload.progress} hint="Parsing document & extracting questions..." />
              )}

              {!upload.isUploading && (showPasteFallback ? (
                <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-2">
                  <p className="text-xs font-bold text-foreground">Paste question text instead</p>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder={"1. What is 2+2?\nA) 3\nB) 4\nAnswer: B"}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground font-sans focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    disabled={!pastedText.trim()}
                    onClick={() => {
                      setExtractedQuestions(parseQuizText(pastedText).map(toQuestionDraft));
                      setShowFileSelector(true);
                    }}
                    className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    Parse pasted text
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPasteFallback(true)}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Or paste text instead
                </button>
              ))}

              {/* Extracted Questions Preview & Actions */}
              {extractedQuestions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-foreground">
                      Extracted Questions ({extractedQuestions.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => setExtractedQuestions([])}
                      className="text-[11px] text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="p-3 bg-card/80 rounded-xl border border-border/50 max-h-[260px] overflow-y-auto custom-scrollbar space-y-2">
                    {extractedQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-2.5 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border/40 flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start space-x-2 overflow-hidden">
                          <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {q.text || 'Untitled Question'}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-sans">
                              Type: {q.type.replace('_', ' ')} • Points: {q.points}
                              {q.options && q.options.length > 0 && ` • ${q.options.length} options`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setExtractedQuestions(prev =>
                              prev.filter((_, i) => i !== idx)
                            );
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Apply Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setItems(prev => [...prev, ...extractedQuestions]);
                        setShowFileSelector(false);
                        setExtractedQuestions([]);
                        setUploadFile(null);
                        showAlert({
                          title: 'Questions Added',
                          message: `Added ${extractedQuestions.length} extracted question(s) to the exam.`,
                          type: 'success'
                        });
                      }}
                      className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl transition-all shadow-primary-sm cursor-pointer flex items-center justify-center space-x-1.5 active:scale-98"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Append ({extractedQuestions.length}) to Exam</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItems(extractedQuestions);
                        setShowFileSelector(false);
                        setExtractedQuestions([]);
                        setUploadFile(null);
                        showAlert({
                          title: 'Exam Replaced',
                          message: `Loaded ${extractedQuestions.length} question(s) from document into the exam.`,
                          type: 'success'
                        });
                      }}
                      className="py-2 px-3 bg-card hover:bg-muted/60 border border-border text-foreground text-xs font-bold rounded-xl transition-all  cursor-pointer active:scale-98"
                    >
                      <span>Replace All</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Google Form Top Header Card */}
          <div
            onClick={() => setActiveCardIndex(-1)}
            className={`bg-card rounded-2xl p-6 space-y-4 transition-all border ${
              activeCardIndex === -1
                ? 'border-primary/30 ring-1 ring-primary/15'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <div>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Untitled Exam"
                className="w-full text-2xl font-black text-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary outline-none pb-1.5 transition-all placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <textarea
                rows={2}
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Exam description / General instructions..."
                className="w-full text-xs text-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-border outline-none pb-1 resize-y transition-all placeholder:text-muted-foreground leading-relaxed font-sans"
              />
            </div>

            <div className="pt-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Time limit */}
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[12px] font-semibold text-muted-foreground">Time limit:</span>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={timeLimitMinutes}
                    onChange={e => setTimeLimitMinutes(Math.max(1, Number(e.target.value)))}
                    className="w-16 px-2 py-1 bg-background border border-border rounded-xl text-foreground text-[12.5px] tabular-nums outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  />
                  <span className="text-muted-foreground">mins</span>
                </div>

                {/* Exam term picker (syllabus-driven options) */}
                <TermSelect terms={examTerms} value={safeTerm} onChange={setTerm} id="exam-term-select" />
              </div>

              <div className="flex items-center space-x-2 text-[11px] font-sans">
                <span className="px-2.5 py-0.5 rounded-md bg-muted text-foreground border border-border font-bold">
                  {totalQuestions} Qs
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-muted text-foreground border border-border font-bold">
                  {totalPages} Page{totalPages !== 1 ? 's' : ''}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
                  {totalPoints} Total Pts
                </span>
              </div>
            </div>
          </div>

          {/* Cards List in Google Forms Style */}
          <div className="space-y-4">
            {items.map((item, itemIdx) => {
              const isActive = activeCardIndex === itemIdx;
              const isSectionBreak = item.type === 'page_break';
              const isDescription = item.type === 'description';

              // Section Break (New Page) Card in Google Forms
              if (isSectionBreak) {
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveCardIndex(itemIdx)}
                    className={`bg-card rounded-2xl border transition-all p-5 space-y-3 cursor-pointer ${
                      isActive
                        ? 'border-primary/30 ring-1 ring-primary/15'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                      <div className="flex items-center space-x-2 text-muted-foreground font-semibold text-xs">
                        <Layers className="w-4 h-4" />
                        <span>Section {items.slice(0, itemIdx + 1).filter(i => i.type === 'page_break').length + 1} of {totalPages}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleDuplicateItem(itemIdx);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                          title="Duplicate Section"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveItem(itemIdx);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10"
                            title="Delete Section"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        required
                        value={item.text}
                        onChange={e => handleUpdateItem(itemIdx, { text: e.target.value })}
                        placeholder="Section title (e.g. Part II: Hands-on Laboratory Scenario)"
                        className="w-full text-base font-bold text-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary outline-none pb-1"
                      />
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={e => handleUpdateItem(itemIdx, { description: e.target.value })}
                        placeholder="Description (optional instructions for this page)"
                        className="w-full text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-border outline-none pb-1"
                      />
                    </div>

                    <div className="pt-2 text-[11px] text-muted-foreground font-sans flex items-center space-x-1.5">
                      <span>After section {items.slice(0, itemIdx + 1).filter(i => i.type === 'page_break').length}:</span>
                      <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                        Continue to next page
                      </span>
                    </div>
                  </div>
                );
              }

              // Title & Description Card in Google Forms
              if (isDescription) {
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveCardIndex(itemIdx)}
                    className={`bg-card rounded-2xl border transition-all p-5 space-y-3 cursor-pointer ${
                      isActive
                        ? 'border-primary/30 ring-1 ring-primary/15'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                      <div className="flex items-center space-x-2 text-muted-foreground font-semibold text-xs">
                        <FileText className="w-4 h-4" />
                        <span>Title & description card</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleDuplicateItem(itemIdx);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveItem(itemIdx);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        required
                        value={item.text}
                        onChange={e => handleUpdateItem(itemIdx, { text: e.target.value })}
                        placeholder="Untitled Title"
                        className="w-full text-sm font-bold text-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary outline-none pb-1"
                      />
                      <textarea
                        rows={2}
                        value={item.description || ''}
                        onChange={e => handleUpdateItem(itemIdx, { description: e.target.value })}
                        placeholder="Description text / Case study guidelines / Reference details..."
                        className="w-full text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-border outline-none pb-1 resize-y font-sans leading-relaxed"
                      />
                    </div>
                  </div>
                );
              }

              // Standard Question Card (Google Forms Style)
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveCardIndex(itemIdx)}
                  onDragOver={e => {
                    e.preventDefault();
                    if (dragFromIndex.current !== null && dragFromIndex.current !== itemIdx) {
                      setDragOverIndex(itemIdx);
                    }
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    const from = dragFromIndex.current;
                    dragFromIndex.current = null;
                    setDragOverIndex(null);
                    if (from !== null) handleMoveItem(from, itemIdx);
                  }}
                  onDragEnd={() => {
                    dragFromIndex.current = null;
                    setDragOverIndex(null);
                  }}
                  className={`bg-card rounded-2xl border transition-all p-5 sm:p-6 space-y-4 cursor-pointer ${
                    isActive
                      ? 'border-primary/30 ring-1 ring-primary/15'
                      : 'border-border hover:border-primary/40'
                  } ${dragOverIndex === itemIdx ? 'ring-2 ring-primary/40 border-primary/60' : ''}`}
                >
                  {/* Top Row: Question Prompt & Question Type Dropdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Drag Grip + move controls */}
                    <div className="hidden sm:flex items-center gap-1 text-muted-foreground/40 -ml-2">
                      <div
                        draggable
                        onDragStart={e => {
                          dragFromIndex.current = itemIdx;
                          e.dataTransfer.effectAllowed = 'move';
                          try { e.dataTransfer.setData('text/plain', String(itemIdx)); } catch { /* ignore */ }
                        }}
                        onClick={e => e.stopPropagation()}
                        title="Drag to reorder"
                        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted hover:text-foreground touch-none select-none"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleMoveItem(itemIdx, itemIdx - 1); }}
                          disabled={itemIdx === 0}
                          title="Move up"
                          className="p-0.5 rounded hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleMoveItem(itemIdx, itemIdx + 1); }}
                          disabled={itemIdx === items.length - 1}
                          title="Move down"
                          className="p-0.5 rounded hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt Input Field */}
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        value={item.text}
                        onChange={e => handleUpdateItem(itemIdx, { text: e.target.value })}
                        placeholder={`Question ${itemIdx + 1}`}
                        className="w-full px-3 py-2 bg-muted/30 hover:bg-muted/50 focus:bg-background border-b-2 border-transparent focus:border-primary rounded-t-lg text-xs sm:text-sm font-bold text-foreground outline-none transition-all placeholder:text-muted-foreground"
                      />
                    </div>

                    {/* Question Type Selector Custom Dropdown */}
                    <div className="shrink-0 relative">
                      {openTypeDropdownIndex === itemIdx && (
                        <div
                          className="fixed inset-0 z-40"
                          onClick={e => {
                            e.stopPropagation();
                            setOpenTypeDropdownIndex(null);
                          }}
                        />
                      )}

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenTypeDropdownIndex(openTypeDropdownIndex === itemIdx ? null : itemIdx);
                        }}
                        className={`w-full sm:w-60 px-3 py-2 bg-card hover:bg-muted/50 border rounded-xl text-xs font-bold text-foreground flex items-center justify-between gap-2  transition-all cursor-pointer ${
                          openTypeDropdownIndex === itemIdx
                            ? 'border-primary ring-2 ring-primary/20 bg-muted/30'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {(() => {
                            const currentOpt =
                              QUESTION_TYPE_OPTIONS.find(o => o.value === item.type) ||
                              QUESTION_TYPE_OPTIONS[0];
                            const IconComp = currentOpt.icon;
                            return (
                              <>
                                <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
                                  <IconComp className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate text-xs font-semibold">{currentOpt.label}</span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                            openTypeDropdownIndex === itemIdx ? 'rotate-180 text-primary' : ''
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu Popup */}
                      {openTypeDropdownIndex === itemIdx && (
                        <div
                          onClick={e => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 w-64 sm:w-72 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-elevated p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                        >
                          <div className="px-2.5 py-1 text-[12px] font-semibold text-muted-foreground font-sans">
                            Question formats
                          </div>
                          <div className="space-y-0.5">
                            {QUESTION_TYPE_OPTIONS.filter(o => o.group === 'questions').map(opt => {
                              const isSelected = item.type === opt.value;
                              const IconComp = opt.icon;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    handleChangeItemType(itemIdx, opt.value);
                                    setOpenTypeDropdownIndex(null);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all ${
                                    isSelected
                                      ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                                      : 'hover:bg-muted/60 text-foreground'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <div
                                      className={`p-1.5 rounded-lg shrink-0 ${
                                        isSelected
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      <IconComp className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-semibold truncate">{opt.label}</span>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <div className="border-t border-border/80 my-1.5" />

                          <div className="px-2.5 py-1 text-[12px] font-semibold text-muted-foreground font-sans">
                            Layout & breaks
                          </div>
                          <div className="space-y-0.5">
                            {QUESTION_TYPE_OPTIONS.filter(o => o.group === 'layout').map(opt => {
                              const isSelected = item.type === opt.value;
                              const IconComp = opt.icon;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    handleChangeItemType(itemIdx, opt.value);
                                    setOpenTypeDropdownIndex(null);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all ${
                                    isSelected
                                      ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                                      : 'hover:bg-muted/60 text-foreground'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <div
                                      className={`p-1.5 rounded-lg shrink-0 ${
                                        isSelected
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      <IconComp className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-semibold truncate">{opt.label}</span>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inside Body: Options Layout according to Google Forms */}
                  {/* 1. Multiple Choice Options (Google Forms Style) */}
                  {item.type === 'multiple_choice' && (
                    <div className="space-y-2.5 pt-2 pl-1 sm:pl-4">
                      {item.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isCorrect = item.correctAnswer === letter;

                        return (
                          <div
                            key={optIdx}
                            className="flex items-center space-x-3 group/opt py-0.5"
                          >
                            {/* Clickable Radio Button that designates correct Answer Key */}
                            <label
                              title="Click to set as correct answer"
                              className="flex items-center space-x-1.5 cursor-pointer shrink-0"
                            >
                              <input
                                type="radio"
                                name={`correct_${item.id}`}
                                checked={isCorrect}
                                onChange={() => handleUpdateItem(itemIdx, { correctAnswer: letter })}
                                className="w-4 h-4 accent-primary cursor-pointer"
                              />
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isCorrect
                                    ? 'bg-primary/[0.04] text-foreground border border-primary/30'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {letter}
                              </span>
                            </label>

                            {/* Option Text Input (Clean Google Forms style borderless with bottom border on hover/focus) */}
                            <div className="flex-1">
                              <input
                                type="text"
                                value={opt}
                                onChange={e => handleUpdateOption(itemIdx, optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                className={`w-full py-1.5 px-2 bg-transparent text-xs text-foreground outline-none border-b transition-colors placeholder:text-muted-foreground ${
                                  isCorrect
                                    ? 'border-primary/40 font-semibold'
                                    : 'border-transparent hover:border-border/80 focus:border-primary'
                                }`}
                              />
                            </div>

                            {/* Remove Option ✕ Button */}
                            {item.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(itemIdx, optIdx)}
                                className="p-1 text-muted-foreground/60 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                                title="Remove Option"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Google Forms "Add option" Action Button */}
                      <div className="flex items-center space-x-3 pt-1.5">
                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 shrink-0 ml-0.5" />
                        <button
                          type="button"
                          onClick={() => handleAddOption(itemIdx)}
                          className="text-xs text-muted-foreground hover:text-primary font-medium hover:underline flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <span>Add option</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. Identification (Short Answer) Google Forms Style */}
                  {item.type === 'identification' && (
                    <div className="space-y-3 pt-2 pl-1 sm:pl-4">
                      <div className="py-2.5 px-3 bg-muted/20 border-b-2 border-dashed border-border rounded-t-lg max-w-md">
                        <span className="text-xs text-muted-foreground font-sans">
                          Short answer text (Student response placeholder)
                        </span>
                      </div>

                      {/* Answer Key Box */}
                      <div className="p-3 bg-primary/[0.04] border border-primary/30 rounded-xl space-y-2 max-w-lg">
                        <div className="flex items-center space-x-2 text-foreground font-semibold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                          <span>Correct answer key:</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={item.correctAnswer}
                          onChange={e => handleUpdateItem(itemIdx, { correctAnswer: e.target.value })}
                          placeholder="e.g. Hypertext Transfer Protocol Secure"
                          className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-[12.5px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Evaluated automatically on student submission (case-insensitive).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 3. True / False Google Forms Style */}
                  {item.type === 'true_false' && (
                    <div className="space-y-2.5 pt-2 pl-1 sm:pl-4">
                      {['True', 'False'].map(val => {
                        const isCorrect = item.correctAnswer === val;
                        return (
                          <div
                            key={val}
                            onClick={() => handleUpdateItem(itemIdx, { correctAnswer: val })}
                            className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer max-w-md ${
                              isCorrect
                                ? 'bg-primary/[0.04] border-primary/30 ring-1 ring-primary/15'
                                : 'bg-background border-border/70 hover:bg-muted/40 text-foreground'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`tf_correct_${item.id}`}
                              checked={isCorrect}
                              onChange={() => handleUpdateItem(itemIdx, { correctAnswer: val })}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                            <span className="font-semibold text-xs">{val}</span>
                            {isCorrect && (
                              <span className="ml-auto text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-md">
                                Correct answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. Essay (Paragraph) Google Forms Style */}
                  {item.type === 'essay' && (
                    <div className="space-y-3 pt-2 pl-1 sm:pl-4">
                      <div className="py-4 px-3 bg-muted/20 border-b-2 border-dashed border-border rounded-t-lg max-w-lg">
                        <span className="text-xs text-muted-foreground font-sans">
                          Long answer text (Paragraph response area)
                        </span>
                      </div>

                      <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1.5 max-w-lg">
                        <label className="block text-[12px] font-semibold text-muted-foreground">
                          Rubric / grading criteria (optional)
                        </label>
                        <input
                          type="text"
                          value={item.rubricNotes || ''}
                          onChange={e => handleUpdateItem(itemIdx, { rubricNotes: e.target.value })}
                          placeholder="e.g. 5 pts clarity, 3 pts real-world application, 2 pts conciseness."
                          className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-[12.5px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                        />
                      </div>
                    </div>
                  )}

                  {/* Google Forms Bottom Control Footer */}
                  <div className="pt-3 border-t border-border/70 flex items-center justify-end space-x-3 text-xs">
                    {/* Points Input */}
                    <div className="flex items-center space-x-1.5 bg-muted/40 px-2.5 py-1 rounded-xl border border-border mr-auto">
                      <label className="text-[12px] font-semibold text-muted-foreground">Points:</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={item.points}
                        onChange={e =>
                          handleUpdateItem(itemIdx, { points: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-12 px-1 py-0.5 bg-background border border-border rounded-xl text-foreground text-[12.5px] tabular-nums text-center outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                      />
                    </div>

                    {/* Duplicate Button */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateItem(itemIdx)}
                      title="Duplicate Question"
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(itemIdx)}
                        title="Delete Question"
                        className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="h-5 w-px bg-border mx-1" />

                    {/* Required Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer text-[11px] font-bold text-muted-foreground hover:text-foreground">
                      <span>Required</span>
                      <input
                        type="checkbox"
                        checked={item.required !== false}
                        onChange={e => handleUpdateItem(itemIdx, { required: e.target.checked })}
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Form Actions Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer w-full sm:w-auto"
            >
              Discard & return to exams
            </button>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSaveExam(false)}
                disabled={savingAction !== null}
                className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center space-x-2"
              >
                {savingAction === 'draft' && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{savingAction === 'draft' ? 'Saving…' : 'Save as unpublished draft'}</span>
              </button>
              <button
                type="submit"
                disabled={savingAction !== null}
                className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-wait"
              >
                {savingAction === 'publish'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Check className="w-4 h-4" />}
                <span>{savingAction === 'publish' ? 'Publishing…' : 'Publish exam form'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Floating Action Sidebar (Right-side on Desktop, Sticky) */}
        <div className="sticky top-6 z-10 w-full md:w-14 bg-card border border-border rounded-2xl p-1.5 flex flex-row md:flex-col items-center justify-around md:justify-start gap-2 shrink-0">
          {/* 1. Add Question Button */}
          <button
            type="button"
            onClick={() => handleAddItem('multiple_choice', activeCardIndex >= 0 ? activeCardIndex : undefined)}
            className="p-2.5 rounded-xl bg-primary/[0.04] border border-primary/30 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 group relative"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="pointer-events-none hidden md:group-hover:flex items-center absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-foreground text-background text-[11px] font-bold rounded-lg whitespace-nowrap shadow-elevated z-50 animate-scale-in">
              Add question
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
            </span>
          </button>

          {/* 2. Add Identification */}
          <button
            type="button"
            onClick={() => handleAddItem('identification', activeCardIndex >= 0 ? activeCardIndex : undefined)}
            className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 group relative"
          >
            <PenTool className="w-5 h-5" />
            <span className="pointer-events-none hidden md:group-hover:flex items-center absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-foreground text-background text-[11px] font-bold rounded-lg whitespace-nowrap shadow-elevated z-50 animate-scale-in">
              Add identification
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
            </span>
          </button>

          {/* 3. Add True / False */}
          <button
            type="button"
            onClick={() => handleAddItem('true_false', activeCardIndex >= 0 ? activeCardIndex : undefined)}
            className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 group relative"
          >
            <ToggleLeft className="w-5 h-5" />
            <span className="pointer-events-none hidden md:group-hover:flex items-center absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-foreground text-background text-[11px] font-bold rounded-lg whitespace-nowrap shadow-elevated z-50 animate-scale-in">
              Add True / False
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
            </span>
          </button>

          {/* 4. Add Essay */}
          <button
            type="button"
            onClick={() => handleAddItem('essay', activeCardIndex >= 0 ? activeCardIndex : undefined)}
            className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 group relative"
          >
            <AlignLeft className="w-5 h-5" />
            <span className="pointer-events-none hidden md:group-hover:flex items-center absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-foreground text-background text-[11px] font-bold rounded-lg whitespace-nowrap shadow-elevated z-50 animate-scale-in">
              Add Essay
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
            </span>
          </button>

          <div className="h-px md:w-8 w-px bg-border my-1" />

          {/* 5. Add Title and Description */}
          <button
            type="button"
            onClick={() => handleAddItem('description', activeCardIndex >= 0 ? activeCardIndex : undefined)}
            className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 group relative"
          >
            <FileText className="w-5 h-5" />
            <span className="pointer-events-none hidden md:group-hover:flex items-center absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-foreground text-background text-[11px] font-bold rounded-lg whitespace-nowrap shadow-elevated z-50 animate-scale-in">
              Add title & description
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
            </span>
          </button>

          {/* 6. Add Section Break */}
          <button
            type="button"
            onClick={() => handleAddItem('page_break', activeCardIndex >= 0 ? activeCardIndex : undefined)}
            className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 group relative"
          >
            <Layers className="w-5 h-5" />
            <span className="pointer-events-none hidden md:group-hover:flex items-center absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-foreground text-background text-[11px] font-bold rounded-lg whitespace-nowrap shadow-elevated z-50 animate-scale-in">
              Add section break
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateExamPage;
