import React, { useState, useEffect, useRef } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { QuizQuestion, QuizItemType, Quiz } from '@/services/lms/types/lms.types';
import type { TermId } from '@/utils/gradingTerms';
import type { QuizImportDraft } from '@/utils/quizImport';
import { applyQuizTextLimit, classifyQuizImportFile, isQuizImportTooLarge, parseQuizText } from '@/utils/quizImport';
import { extractDocxText, extractPdfText } from '@/utils/quizExtract';
import { useSimulatedUpload } from '@/hooks/useSimulatedUpload';
import { UploadProgress } from '@/components/shared/UploadProgress';
import { TermSelect } from '@/components/shared/TermSelect';
import {
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
  Calendar,
  CircleDot,
  Type,
  Heading,
  Split,
  ChevronDown,
  RefreshCcw,
  Upload,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export interface QuestionDraft {
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

export interface QuizBuilderValue {
  title: string;
  instructions: string;
  timeLimitMinutes: number;
  delayPosting: boolean;
  delayedDate: string;
  term?: TermId;
  items: QuestionDraft[];
}

export function emptyQuizBuilderValue(): QuizBuilderValue {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return {
    title: '',
    instructions: '',
    timeLimitMinutes: 30,
    delayPosting: false,
    delayedDate: d.toISOString().slice(0, 16),
    items: [
      {
        id: 'item-initial-1',
        text: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correctAnswer: 'A',
        points: 1,
        required: true
      }
    ]
  };
}

export function quizTotals(v: QuizBuilderValue): { totalPoints: number; totalQuestions: number; totalPages: number } {
  const totalPoints = v.items.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
  const totalQuestions = v.items.filter(
    i => i.type !== 'description' && i.type !== 'page_break'
  ).length;
  const totalPages = v.items.filter(i => i.type === 'page_break').length + 1;
  return { totalPoints, totalQuestions, totalPages };
}

export function validateQuizBuilder(v: QuizBuilderValue): { title: string; message: string } | null {
  if (!v.title.trim()) {
    return {
      title: 'Missing Quiz Title',
      message: 'Please provide a title for this assessment quiz before saving.'
    };
  }

  const gradableCount = v.items.filter(
    i => i.type !== 'description' && i.type !== 'page_break'
  ).length;
  if (gradableCount === 0) {
    return {
      title: 'Questions Required',
      message: 'Please add at least one gradable question (Multiple Choice, Identification, True/False, or Essay).'
    };
  }

  for (let i = 0; i < v.items.length; i++) {
    const item = v.items[i];
    if (!item.text.trim()) {
      return {
        title: `Item ${i + 1} Incomplete`,
        message: `Please fill in the title or prompt for card #${i + 1}.`
      };
    }

    if (item.type === 'multiple_choice') {
      if (item.options.length < 2) {
        return {
          title: `Question ${i + 1} Options Required`,
          message: `Question ${i + 1} requires at least 2 choices.`
        };
      }
    }

    if (item.type === 'identification' && !item.correctAnswer.trim()) {
      return {
        title: `Question ${i + 1} Answer Key Missing`,
        message: `Please specify the expected correct answer for Identification Question #${i + 1}.`
      };
    }
  }

  return null;
}

export function compileQuizQuestions(v: QuizBuilderValue): QuizQuestion[] {
  return v.items.map((item, idx) => {
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
}

export function buildQuizPayload(courseId: string, v: QuizBuilderValue, published: boolean): Partial<Quiz> {
  return {
    courseId,
    title: v.title.trim(),
    instructions: v.instructions.trim() || 'Answer all questions carefully within the allotted time limit.',
    timeLimitMinutes: Number(v.timeLimitMinutes) || 30,
    published: v.delayPosting ? false : published,
    ...(v.term !== undefined ? { term: v.term } : {}),
    delayedUntil: v.delayPosting && v.delayedDate ? new Date(v.delayedDate).toISOString() : undefined,
    questions: compileQuizQuestions(v)
  };
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

export const QuizBuilderFields: React.FC<{ value: QuizBuilderValue; onChange: (v: QuizBuilderValue) => void; questionsEditable?: boolean; courseId?: string; }> = ({
  value,
  onChange,
  // False when editing an already-published quiz (the quizzes PATCH endpoint
  // replaces header fields only, never questions): header stays editable,
  // the question set renders as a locked summary instead.
  questionsEditable = true,
  // Host course for the syllabus-driven term picker. When omitted the picker
  // falls back to the legacy Midterm/Finals pair.
  courseId
}) => {
  const { showAlert, effectiveTermsForCourse } = useLMS();
  const items = value.items;
  const terms: TermId[] =
    courseId && typeof effectiveTermsForCourse === 'function'
      ? effectiveTermsForCourse(courseId)
      : ['midterm', 'finals'];
  const safeTerm: TermId =
    value.term && terms.includes(value.term) ? value.term : (terms[0] ?? 'midterm');

  // Active selected card index (for highlighting with left border and positioning floating toolbar)
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  // Open question type dropdown index
  const [openTypeDropdownIndex, setOpenTypeDropdownIndex] = useState<number | null>(null);

  // Quiz File Upload State
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
  const dragFromIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleMoveItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ ...value, items: next });
    setActiveCardIndex(to);
  };

  // Allow a host page top action bar to toggle the upload section without extra props.
  useEffect(() => {
    const handler = () => setShowFileSelector(prev => !prev);
    window.addEventListener('quiz-builder:toggle-upload', handler);
    return () => window.removeEventListener('quiz-builder:toggle-upload', handler);
  }, []);

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
    const next = [...items];
    next.splice(targetIndex, 0, newItem);
    onChange({ ...value, items: next });
    setActiveCardIndex(targetIndex);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showAlert({
        title: 'At Least One Item Required',
        message: 'A quiz must contain at least one question or card.',
        type: 'warning'
      });
      return;
    }
    onChange({ ...value, items: items.filter((_, idx) => idx !== index) });
    setActiveCardIndex(prev => Math.max(0, prev - 1));
  };

  const handleDuplicateItem = (index: number) => {
    const itemToDup = items[index];
    if (!itemToDup) return;
    const duplicated: QuestionDraft = {
      ...itemToDup,
      id: `item-${Date.now()}-${items.length + 1}`,
      options: [...itemToDup.options]
    };
    const next = [...items];
    next.splice(index + 1, 0, duplicated);
    onChange({ ...value, items: next });
    setActiveCardIndex(index + 1);
  };

  const handleUpdateItem = (index: number, updates: Partial<QuestionDraft>) => {
    onChange({
      ...value,
      items: items.map((item, idx) => (idx === index ? { ...item, ...updates } : item))
    });
  };

  const handleChangeItemType = (index: number, newType: QuizItemType) => {
    onChange({
      ...value,
      items: items.map((item, idx) => {
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
    });
  };

  const handleUpdateOption = (itemIndex: number, optIndex: number, val: string) => {
    onChange({
      ...value,
      items: items.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const newOpts = [...item.options];
        newOpts[optIndex] = val;
        return { ...item, options: newOpts };
      })
    });
  };

  const handleAddOption = (itemIndex: number) => {
    onChange({
      ...value,
      items: items.map((item, idx) => {
        if (idx !== itemIndex) return item;
        return { ...item, options: [...item.options, ''] };
      })
    });
  };

  const handleRemoveOption = (itemIndex: number, optIndex: number) => {
    const target = items[itemIndex];
    if (target && target.options.length <= 2) {
      showAlert({
        title: 'Minimum 2 Options',
        message: 'Multiple choice questions must have at least 2 choices.',
        type: 'warning'
      });
      return;
    }
    onChange({
      ...value,
      items: items.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const newOpts = item.options.filter((_, oIdx) => oIdx !== optIndex);
        return { ...item, options: newOpts };
      })
    });
  };

  const totalPoints = items.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
  const totalQuestions = items.filter(
    i => i.type !== 'description' && i.type !== 'page_break'
  ).length;
  const totalPages = items.filter(i => i.type === 'page_break').length + 1;

  const handleUploadQuizFile = async (file: File) => {
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
    <div className="relative flex flex-col md:flex-row gap-6 items-start">
      {/* Main Form Content Cards Column */}
      <div className="w-full flex-1 space-y-4 text-xs">
        {/* Quiz File Upload Section (creation only — locked once published) */}
        {showFileSelector && questionsEditable && (
          <div className="p-4 bg-card border border-border rounded-2xl shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-foreground">Upload Quiz Document</p>
                <p className="text-xs text-muted-foreground">
                  Upload a PDF, DOCX, TXT, or JSON file to auto-populate quiz questions
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
                  handleUploadQuizFile(file);
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
                    handleUploadQuizFile(file);
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
                    onClick={() => handleUploadQuizFile(uploadFile)}
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
                      onChange({ ...value, items: [...items, ...extractedQuestions] });
                      setShowFileSelector(false);
                      setExtractedQuestions([]);
                      setUploadFile(null);
                      showAlert({
                        title: 'Questions Added',
                        message: `Added ${extractedQuestions.length} extracted question(s) to the quiz.`,
                        type: 'success'
                      });
                    }}
                    className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl transition-all shadow-primary-sm cursor-pointer flex items-center justify-center space-x-1.5 active:scale-98"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Append ({extractedQuestions.length}) to Quiz</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...value, items: extractedQuestions });
                      setShowFileSelector(false);
                      setExtractedQuestions([]);
                      setUploadFile(null);
                      showAlert({
                        title: 'Quiz Replaced',
                        message: `Loaded ${extractedQuestions.length} question(s) from document into the quiz.`,
                        type: 'success'
                      });
                    }}
                    className="py-2 px-3 bg-card hover:bg-muted/60 border border-border text-foreground text-xs font-bold rounded-xl transition-all shadow-subtle cursor-pointer active:scale-98"
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
          className={`bg-card rounded-2xl p-6 shadow-subtle space-y-4 transition-all border ${
            activeCardIndex === -1
              ? 'border-l-4 border-l-primary border-t-8 border-t-primary border-r border-b border-border shadow-elevated'
              : 'border-t-8 border-t-primary border-x border-b border-border hover:border-primary/40'
          }`}
        >
          <div>
            <input
              type="text"
              required
              value={value.title}
              onChange={e => onChange({ ...value, title: e.target.value })}
              placeholder="Untitled Quiz"
              className="w-full text-2xl font-black text-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary outline-none pb-1.5 transition-all placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <textarea
              rows={2}
              value={value.instructions}
              onChange={e => onChange({ ...value, instructions: e.target.value })}
              placeholder="Quiz description / General instructions..."
              className="w-full text-xs text-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-border outline-none pb-1 resize-y transition-all placeholder:text-muted-foreground leading-relaxed font-sans"
            />
          </div>

          <div className="pt-3 border-t border-border/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Time limit */}
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">Time Limit:</span>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={value.timeLimitMinutes}
                  onChange={e => onChange({ ...value, timeLimitMinutes: Math.max(1, Number(e.target.value)) })}
                  className="w-16 px-2 py-1 bg-background border border-border rounded-lg text-foreground font-bold text-center outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-muted-foreground">mins</span>
              </div>

              {/* Grading term picker (syllabus-driven options) */}
              <TermSelect terms={terms} value={safeTerm} onChange={t => onChange({ ...value, term: t })} id="quiz-term-select" />

              {/* Delayed Posting (Schedule Release) Toggle */}
              <div className="flex items-center space-x-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={value.delayPosting}
                    onChange={e => onChange({ ...value, delayPosting: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Delay Posting (Schedule Release)</span>
                </label>

                {value.delayPosting && (
                  <input
                    type="datetime-local"
                    required={value.delayPosting}
                    value={value.delayedDate}
                    onChange={e => onChange({ ...value, delayedDate: e.target.value })}
                    className="px-2 py-1 bg-background border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-amber-500/30 ml-2 cursor-pointer"
                  />
                )}
              </div>
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

        {/* Cards List in Google Forms Style (locked summary when questions are not editable) */}
        {questionsEditable ? (
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
                  className={`bg-card rounded-2xl border transition-all p-5 shadow-subtle space-y-3 cursor-pointer ${
                    isActive
                      ? 'border-l-4 border-l-rose-500 border-y border-r border-border shadow-elevated'
                      : 'border-border hover:border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                    <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
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
                      className="w-full text-base font-bold text-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-rose-500 outline-none pb-1"
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
                  className={`bg-card rounded-2xl border transition-all p-5 shadow-subtle space-y-3 cursor-pointer ${
                    isActive
                      ? 'border-l-4 border-l-sky-500 border-y border-r border-border shadow-elevated'
                      : 'border-border hover:border-sky-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                    <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
                      <FileText className="w-4 h-4" />
                      <span>Title & Description Card</span>
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
                      className="w-full text-sm font-bold text-foreground bg-transparent border-b border-transparent hover:border-border/60 focus:border-sky-500 outline-none pb-1"
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
                className={`bg-card rounded-2xl border transition-all p-5 sm:p-6 shadow-subtle space-y-4 cursor-pointer ${
                  isActive
                    ? 'border-l-4 border-l-primary border-y border-r border-border shadow-elevated ring-1 ring-primary/10'
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
                      className={`w-full sm:w-60 px-3 py-2 bg-card hover:bg-muted/50 border rounded-xl text-xs font-bold text-foreground flex items-center justify-between gap-2 shadow-subtle transition-all cursor-pointer ${
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
                        <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-sans">
                          Question Formats
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

                        <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-sans">
                          Layout & Breaks
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
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                            />
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isCorrect
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
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
                                  ? 'border-emerald-500/50 font-semibold'
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
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 max-w-lg">
                      <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Correct Answer Key:</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={item.correctAnswer}
                        onChange={e => handleUpdateItem(itemIdx, { correctAnswer: e.target.value })}
                        placeholder="e.g. Hypertext Transfer Protocol Secure"
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-amber-500/30"
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
                          className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all cursor-pointer max-w-md ${
                            isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                              : 'bg-background border-border hover:bg-muted text-foreground'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`tf_correct_${item.id}`}
                            checked={isCorrect}
                            onChange={() => handleUpdateItem(itemIdx, { correctAnswer: val })}
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                          <span className="font-bold text-xs">{val}</span>
                          {isCorrect && (
                            <span className="ml-auto text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                              Correct Answer
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

                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1.5 max-w-lg">
                      <label className="block text-[11px] font-bold text-purple-700 dark:text-purple-400">
                        Rubric / Instructor Grading Criteria (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.rubricNotes || ''}
                        onChange={e => handleUpdateItem(itemIdx, { rubricNotes: e.target.value })}
                        placeholder="e.g. 5 pts clarity, 3 pts real-world application, 2 pts conciseness."
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:ring-2 focus:ring-purple-500/30"
                      />
                    </div>
                  </div>
                )}

                {/* Google Forms Bottom Control Footer */}
                <div className="pt-3 border-t border-border/70 flex items-center justify-end space-x-3 text-xs">
                  {/* Points Input */}
                  <div className="flex items-center space-x-1.5 bg-muted/40 px-2.5 py-1 rounded-xl border border-border mr-auto">
                    <label className="text-[11px] font-bold text-muted-foreground">Points:</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={item.points}
                      onChange={e =>
                        handleUpdateItem(itemIdx, { points: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-12 px-1 py-0.5 bg-background border border-border rounded-md text-foreground text-xs font-bold text-center outline-none focus:ring-2 focus:ring-primary/20"
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
        ) : (
        <div className="p-4 bg-muted/30 border border-border rounded-2xl text-xs text-muted-foreground space-y-1">
          {(() => {
            const totals = quizTotals(value);
            return (
              <p className="font-bold text-foreground text-sm">
                {totals.totalQuestions} question(s) • {totals.totalPoints} pts • {totals.totalPages} page(s)
              </p>
            );
          })()}
          <p>Questions are locked after publishing — edit them on the Quizzes page.</p>
        </div>
        )}
      </div>

      {/* Google Forms Floating Action Sidebar (Right-side on Desktop, Sticky) */}
      {questionsEditable && (
      <div className="sticky top-6 z-10 w-full md:w-14 bg-card border border-border rounded-2xl p-1.5 shadow-elevated flex flex-row md:flex-col items-center justify-around md:justify-start gap-2 shrink-0">
        {/* 1. Add Question Button */}
        <button
          type="button"
          onClick={() => handleAddItem('multiple_choice', activeCardIndex >= 0 ? activeCardIndex : undefined)}
          className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all cursor-pointer shadow-subtle active:scale-95 group relative"
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
          className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-amber-600 transition-all cursor-pointer active:scale-95 group relative"
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
          className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-all cursor-pointer active:scale-95 group relative"
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
          className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-purple-600 transition-all cursor-pointer active:scale-95 group relative"
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
          className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-sky-600 transition-all cursor-pointer active:scale-95 group relative"
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
          className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-rose-600 transition-all cursor-pointer active:scale-95 group relative"
        >
          <Layers className="w-5 h-5" />
          <span className="pointer-events-none hidden md:group-hover:flex items-center absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-foreground text-background text-[11px] font-bold rounded-lg whitespace-nowrap shadow-elevated z-50 animate-scale-in">
              Add section break
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
            </span>
          </button>
        </div>
      )}
      </div>
    );
  };
