// src/utils/quizImport.ts
import type { QuizItemType } from '@/services/lms/types/lms.types';

export interface QuizImportDraft {
  text: string;
  type: QuizItemType;
  options: string[];
  correctAnswer: string;
  points: number;
}

export interface ExtractedQuizText {
  text: string;
  truncated: boolean;
}

export const QUIZ_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const QUIZ_IMPORT_TEXT_LIMIT = 200_000;

export function isQuizImportTooLarge(sizeBytes: number): boolean {
  return sizeBytes > QUIZ_IMPORT_MAX_BYTES;
}

export function applyQuizTextLimit(text: string): ExtractedQuizText {
  if (text.length <= QUIZ_IMPORT_TEXT_LIMIT) return { text, truncated: false };
  return { text: text.slice(0, QUIZ_IMPORT_TEXT_LIMIT), truncated: true };
}

export function classifyQuizImportFile(fileName: string): 'pdf' | 'docx' | 'text' | 'unsupported' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.json') || lower.endsWith('.csv')) return 'text';
  return 'unsupported';
}

// ---------------------------------------------------------------------------
// Heuristic document parser.
//
// Real instructor PDFs/DOCXs (see file-samples/quiz-and-exam) use formats the
// old line parser could not handle: section headers ("Test I. MULTIPLE
// CHOICE", "True or False."), options sharing one line ("a.) science  b.)
// society"), spaced markers ("C . ..."), "1.)" numbering, blank-prefixed
// True/False items ("__________1. ..."), and documents without answer keys.
// Those fell through into prompt text (answers inside questions) or merged
// separate questions into one identification blob. The parser below handles
// each of those shapes while keeping the exported signatures unchanged.
// ---------------------------------------------------------------------------

type SectionKind = 'unknown' | 'multiple_choice' | 'true_false' | 'identification' | 'essay';

interface Builder {
  type: QuizItemType;
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
  sawOptions: boolean;
  sawKey: boolean;
  sawPoints: boolean;
  section: SectionKind;
  lastWasOption: boolean;
}

function freshBuilder(section: SectionKind = 'unknown'): Builder {
  return {
    type: 'multiple_choice',
    text: '',
    options: [],
    correctAnswer: 'A',
    points: 1,
    sawOptions: false,
    sawKey: false,
    sawPoints: false,
    section,
    lastWasOption: false,
  };
}

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Remove leading blank-fill runs ("__________", "~~~") used by T/F blocks. */
function stripBlankFill(t: string): string {
  return t.replace(/^[_─━*~\s]{2,}/, '').trim();
}

/**
 * Match a question start. Handles "1.", "1)", "1:", "1.)", "(1)", "Q1.",
 * "Question 12:", with or without a space after the marker, and blank-fill
 * prefixes. Returns the prompt remainder, or null when not a question start.
 */
function matchQuestionStart(t: string): string | null {
  const s = stripBlankFill(t);
  if (!s) return null;
  let m = s.match(/^(?:Q(?:uestion)?\s*)?\(?\d{1,3}\s*[.\)\]:]+\)?\s*:?\s*(.*)$/i);
  if (m) {
    const num = s.match(/^(?:Q(?:uestion)?\s*)?\(?(\d{1,3})/i);
    const n = num ? parseInt(num[1], 10) : 0;
    if (n >= 1 && n <= 300) return (m[1] ?? '').trim();
    return null;
  }
  m = s.match(/^\(\s*(\d{1,3})\s*\)\s+(.*)$/);
  if (m) return (m[2] ?? '').trim();
  return null;
}

/** Strip a leading question marker from already-extracted text (safety net). */
function cleanPrompt(t: string): string {
  let s = collapseSpaces(stripBlankFill(t));
  const m = s.match(/^(?:Q(?:uestion)?\s*)?\(?\d{1,3}\s*[.\)\]:]+\)?\s*:?\s*(.*)$/i);
  if (m && (m[1] ?? '').trim()) s = (m[1] ?? '').trim();
  s = s.replace(/^[\)\].:;\-]+\s*/, '').trim();
  return s;
}

const OPTION_LETTERS = 'A-Fa-f';

/**
 * Match a line that is exactly one option ("A. ...", "b) ...", "C . ...",
 * "a.) ...", "(d) ...", "[a] ..."). Tolerates a space between the letter
 * and its closer ("C .") and a doubled closer ("a.)").
 */
function matchSingleOption(t: string): string | null {
  const m = t.match(new RegExp(`^[\\(\\[]?\\s*([${OPTION_LETTERS}])\\s*[\\)\\].:]\\s*\\)?\\s*:?\\s*(.+)$`));
  if (!m) return null;
  const rest = (m[2] ?? '').replace(/^[\s\)\].:;]+/, '').trim();
  if (!rest) return null;
  return rest;
}

interface InlineSplit {
  stem: string;
  options: string[];
}

/**
 * Split "stem  a.) opt1  b.) opt2  c.) opt3" shapes: two or more option
 * markers on one line. Returns null when fewer than two markers are found.
 */
function splitInlineOptions(t: string): InlineSplit | null {
  if (/\be\.g\./i.test(t)) return null;
  const re = new RegExp(`\\(?([${OPTION_LETTERS}])\\s*[\\)\\].:]\\s*\\)?\\s*:?\\s*`, 'g');
  const marks: { index: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    // Skip a marker glued inside a word (e.g. the "a." in "U.S.A.").
    const before = m.index > 0 ? t[m.index - 1] : ' ';
    if (/[A-Za-z0-9]/.test(before) && !/\s/.test(before)) continue;
    marks.push({ index: m.index, end: m.index + m[0].length });
  }
  if (marks.length < 2) return null;
  const stem = collapseSpaces(t.slice(0, marks[0].index).replace(/^[\s\)\].:;]+/, ''));
  const options: string[] = [];
  for (let i = 0; i < marks.length; i++) {
    const seg = collapseSpaces(t.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].index : t.length));
    if (seg) options.push(seg);
  }
  if (options.length < 2) return null;
  return { stem, options };
}

/** Match an "Answer: B" / "Key - True" / "Correct answer: Paris" line. */
function matchAnswerKey(t: string): string | null {
  const m = t.match(/^(?:Answer|Ans\.?|Key|Correct(?:\s*Answer)?|Solution)\s*[:=\-–—]\s*(.+)$/i);
  if (!m) return null;
  return (m[1] ?? '').replace(/[\s.]+$/, '').trim() || null;
}

/** Split a trailing inline key ("... stem Answer: B") from its line. */
function splitTrailingKey(t: string): { rest: string; key: string } | null {
  const m = t.match(/^(.*?)\b(?:Answer|Ans\.?|Key|Correct(?:\s*Answer)?)\s*[:=\-–—]\s*([A-Fa-f]|True|False)\s*\.?$/i);
  if (!m || !collapseSpaces(m[1] ?? '')) return null;
  return { rest: collapseSpaces(m[1]), key: m[2].trim() };
}

function extractPoints(t: string): { points: number | null; clean: string } {
  const m =
    t.match(/\(\s*(\d{1,3})\s*(?:pts?|points?)\s*\)/i) ??
    t.match(/\[\s*(\d{1,3})\s*(?:pts?|points?)\s*\]/i) ??
    t.match(/\b(\d{1,3})\s*(?:pts?|points?)\b/i);
  if (!m) return { points: null, clean: t };
  const clean = collapseSpaces(t.replace(m[0], ' '));
  return { points: parseInt(m[1], 10) || 1, clean };
}

function applyKey(b: Builder, val: string): void {
  const v = val.replace(/^[\(\[]\s*|\s*[\)\]]$/g, '').trim();
  b.sawKey = true;
  if (/^(?:True|False)$/i.test(v)) {
    b.type = 'true_false';
    b.correctAnswer = v.toLowerCase() === 'false' ? 'False' : 'True';
  } else if (/^[A-Fa-f]$/.test(v)) {
    if (b.type !== 'true_false') b.type = 'multiple_choice';
    b.correctAnswer = v.toUpperCase();
  } else if (b.options.length === 0) {
    b.correctAnswer = v;
  } else {
    const idx = b.options.findIndex(o => o.toLowerCase() === v.toLowerCase());
    if (idx >= 0) b.correctAnswer = String.fromCharCode(65 + idx);
  }
}

const ESSAY_RE =
  /compare\s+and\s+contrast|discuss|elaborate|illustrate|justify|analy[sz]e|evaluate|critique|\breflect\b|write\s+(a|an|your)?\s*(paragraph|essay|reflection|composition)/i;

function finalizeBuilder(b: Builder): QuizImportDraft {
  // A lone "option" with no siblings is prompt spillover, not a choice list.
  if (b.options.length === 1 && !b.sawKey) {
    b.text = b.text ? `${b.text} ${b.options[0]}` : b.options[0];
    b.options = [];
    b.sawOptions = false;
  }
  const cleanText = cleanPrompt(b.text) || 'Untitled Question';

  if (b.type === 'true_false') {
    return {
      text: cleanText,
      type: 'true_false',
      options: ['True', 'False'],
      correctAnswer: b.correctAnswer === 'False' ? 'False' : 'True',
      points: b.points,
    };
  }
  if (b.sawOptions && b.options.length >= 2) {
    if (b.options.length === 2 && b.options.every(o => /^(true|false)$/i.test(o.trim()))) {
      return {
        text: cleanText,
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        points: b.points,
      };
    }
    const options = b.options;
    const correctAnswer = ['A', 'B', 'C', 'D', 'E', 'F'].includes(b.correctAnswer) ? b.correctAnswer : 'A';
    return { text: cleanText, type: 'multiple_choice', options, correctAnswer, points: b.points };
  }
  if (b.sawKey && b.type === 'multiple_choice' && /^[A-F]$/.test(b.correctAnswer)) {
    return {
      text: cleanText,
      type: 'multiple_choice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: b.correctAnswer,
      points: b.points,
    };
  }
  if (b.section === 'true_false') {
    return {
      text: cleanText,
      type: 'true_false',
      options: ['True', 'False'],
      correctAnswer: b.correctAnswer === 'False' ? 'False' : 'True',
      points: b.points,
    };
  }
  if (b.section === 'essay' || ESSAY_RE.test(cleanText.slice(0, 80))) {
    return {
      text: cleanText,
      type: 'essay',
      options: [],
      correctAnswer: '',
      points: b.points,
    };
  }
  if (b.sawKey && b.correctAnswer) {
    return { text: cleanText, type: 'identification', options: [], correctAnswer: b.correctAnswer, points: b.points };
  }
  return { text: cleanText, type: 'identification', options: [], correctAnswer: '', points: b.points };
}

interface SectionHeader {
  kind: SectionKind;
  layout: 'page_break' | 'description';
  title: string;
  subtitle: string;
}

/** Classify a section header ("Test I. MULTIPLE CHOICE", "True or False."). */
function detectSectionHeader(t: string): SectionHeader | null {
  const s = collapseSpaces(t);
  if (!s || s.length > 220) return null;
  // Shared-stem blocks ("For items 12-16, use the following ...").
  if (/^for\s+(items?|numbers?|questions?)\s+\d+\s*[-–—]\s*\d+/i.test(s)) {
    return { kind: 'unknown', layout: 'description', title: 'Instructions', subtitle: s };
  }
  const labelMatch =
    s.match(/^(?:test|part|section|set|phase|questionnaire)\s+[ivx\d]+[.\)\:\-]?\s*(.*)$/i) ??
    s.match(/^[IVX]{1,5}[.\)\:\-]\s+(.*)$/) ??
    s.match(/^(?:test|part|section)\s+[A-Z]\b\s*(.*)$/i);
  const hasLabel = labelMatch !== null;
  const rest = collapseSpaces(hasLabel ? (labelMatch as RegExpMatchArray)[1] ?? '' : s);
  if (!rest) return null;
  // Without a section label, only title-cased keyword lines are headers: a
  // wrapped sentence continuation ("discussion and consideration, ...")
  // starts lowercase and must never flip the section for later questions.
  if (!hasLabel && !/^[A-ZÑÁÉÍÓÚ]/.test(rest)) return null;
  // Labelless headers are short titles ("True or False.", "Enumeration") or
  // end with terminal punctuation. A long run-on fragment without ending
  // punctuation ("Discussion funnel and consolidate knowledge ... among")
  // is a wrapped sentence, not a new section.
  if (!hasLabel && rest.length >= 25 && !/[.:!?…]$/.test(rest)) return null;
  const mc = rest.match(/multiple\s*choice/i);
  const tf = rest.match(/true\s*[\/\-]?\s*false|true\s+or\s+false|^t\s*\/\s*f\b/i);
  const ident = rest.match(/identification|short\s*answer|fill\s*(in|up)|completion|matching\s*type|enumeration/i);
  const essay = rest.match(/\bessay\b|paragraph|discussion|problem\s*solving/i);
  const hit = mc ?? tf ?? ident ?? essay;
  if (!hit) return null;
  // Without a section label, only short keyword lines are headers — a long
  // sentence that merely mentions "true"/"false" is a question, not a title.
  if (!hasLabel && rest.length > 110) return null;
  const kind: SectionKind = mc ? 'multiple_choice' : tf ? 'true_false' : ident ? 'identification' : 'essay';
  const keyword = hit[0].replace(/\s+/g, ' ').trim();
  const title = keyword.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const subtitle = collapseSpaces(rest.replace(hit[0], '').replace(/^[\s:.\-–—]+/, ''));
  return { kind, layout: hasLabel ? 'page_break' : 'description', title, subtitle };
}

/** Repeated page chrome (copyright bars, running heads) carries no content. */
function isPageChrome(t: string): boolean {
  const s = t.trim();
  return (
    /copyright|all rights reserved/i.test(s) ||
    /^page\s+\d+/i.test(s) ||
    /^www\./i.test(s) ||
    /\(\d+\s*questions?,\s*\d+\s*minutes?\)/i.test(s)
  );
}

/** Blank answer-sheet metadata ("Name: ___ Score: ___ ...") is not a prompt. */
function isFormMetadata(t: string): boolean {
  const s = t.trim();
  if (!/:/.test(s)) return false;
  const labels = ['name', 'score', 'course', 'subject', 'date', 'class id', 'section', 'year level', 'yr', 'term'];
  const hits = labels.filter(l => new RegExp(`\\b${l}\\s*:`, 'i').test(s));
  return hits.length >= 2 || (/^(name|course|score|date)\s*:/i.test(s) && /_{3,}/.test(s));
}

function tryParseJson(text: string): QuizImportDraft[] | null {
  try {
    const parsed: any = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : Array.isArray(parsed?.items) ? parsed.items : null;
    if (!list || list.length === 0) return null;
    return list.map((item: any) => {
      const type = (item.type as QuizItemType) || 'multiple_choice';
      return {
        text: String(item.text ?? item.question ?? item.prompt ?? 'Untitled Question').trim(),
        type,
        options: Array.isArray(item.options) ? item.options.map(String) : type === 'multiple_choice' ? ['Option A', 'Option B', 'Option C', 'Option D'] : type === 'true_false' ? ['True', 'False'] : [],
        correctAnswer: String(item.correctAnswer ?? (type === 'multiple_choice' ? 'A' : type === 'true_false' ? 'True' : '')),
        points: Number(item.points) || 1,
      } as QuizImportDraft;
    });
  } catch {
    return null;
  }
}

export function parseQuizText(text: string): QuizImportDraft[] {
  const fromJson = tryParseJson(text);
  if (fromJson) return fromJson;

  const drafts: QuizImportDraft[] = [];
  let section: SectionKind = 'unknown';
  let cur = freshBuilder(section);
  let structureSeen = false;
  let pendingPreamble: string[] = [];
  const seenLines = new Map<string, number>();

  const push = () => {
    if (!cur.text.trim() && cur.options.length === 0) {
      cur = freshBuilder(section);
      return;
    }
    drafts.push(finalizeBuilder(cur));
    cur = freshBuilder(section);
  };

  /** First structural element converts the pending header block to a card. */
  const markStructure = () => {
    if (!structureSeen) {
      structureSeen = true;
      const joined = collapseSpaces(pendingPreamble.join(' '));
      pendingPreamble = [];
      if (joined && joined.length >= 3) {
        const title = joined.length > 220 ? `${joined.slice(0, 220)}…` : joined;
        drafts.push({ text: title, type: 'description', options: [], correctAnswer: '', points: 0 });
      }
    }
  };

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) {
      // Blank line ends a question only once an answer key was seen: DOCX
      // extraction (mammoth) emits blank lines between every paragraph,
      // including between a question's own options — pushing there would
      // split the question before its key arrives.
      if (cur.text.trim() && cur.sawKey) push();
      continue;
    }
    let t = collapseSpaces(trimmed);
    if (isPageChrome(t) || isFormMetadata(t)) continue;

    // De-duplicate running heads repeated on every PDF page.
    const key = t.toLowerCase();
    const seen = seenLines.get(key) ?? 0;
    seenLines.set(key, seen + 1);
    if (seen >= 2 && t.length < 150) continue;

    // A trailing inline key ("... stem Answer: B") belongs to the key slot,
    // not to the prompt or the last option.
    let trailingKey: string | null = null;
    const split = splitTrailingKey(t);
    if (split) {
      t = split.rest;
      trailingKey = split.key;
    }

    const header = detectSectionHeader(t);
    if (header) {
      markStructure();
      push();
      if (header.layout === 'page_break') {
        drafts.push({ text: header.title, type: 'page_break', options: [], correctAnswer: '', points: 0 });
        if (header.subtitle) {
          drafts.push({ text: header.subtitle, type: 'description', options: [], correctAnswer: '', points: 0 });
        }
      } else {
        drafts.push({
          text: collapseSpaces(`${header.title}${header.subtitle ? ` — ${header.subtitle}` : ''}`),
          type: 'description',
          options: [],
          correctAnswer: '',
          points: 0,
        });
      }
      if (header.kind !== 'unknown') section = header.kind;
      cur = freshBuilder(section);
      continue;
    }

    // A points-only line ("(10 points)") scores the current question.
    const ptsOnly = extractPoints(t);
    if (ptsOnly.points !== null && !ptsOnly.clean) {
      markStructure();
      cur.points = ptsOnly.points;
      cur.sawPoints = true;
      continue;
    }

    const qStart = matchQuestionStart(t);
    if (qStart !== null) {
      markStructure();
      push();
      cur.section = section;
      const pts = extractPoints(qStart);
      let prompt = pts.clean;
      if (pts.points !== null) {
        cur.points = pts.points;
        cur.sawPoints = true;
      }
      const inline = splitInlineOptions(prompt);
      if (inline) {
        cur.text = inline.stem || prompt;
        cur.options.push(...inline.options);
        cur.sawOptions = true;
        cur.lastWasOption = true;
      } else {
        cur.text = prompt;
        cur.lastWasOption = false;
      }
      if (trailingKey) applyKey(cur, trailingKey);
      continue;
    }

    // Options that share one line with (or without) their stem.
    const inlineOnly = splitInlineOptions(t);
    if (inlineOnly) {
      markStructure();
      if (inlineOnly.stem) {
        if (!cur.text.trim() && cur.options.length === 0) cur.text = inlineOnly.stem;
        else if (cur.lastWasOption && cur.options.length > 0) {
          cur.options[cur.options.length - 1] = `${cur.options[cur.options.length - 1]} ${inlineOnly.stem}`;
        } else cur.text = cur.text ? `${cur.text} ${inlineOnly.stem}` : inlineOnly.stem;
      }
      cur.options.push(...inlineOnly.options);
      cur.sawOptions = true;
      if (cur.type !== 'true_false') cur.type = 'multiple_choice';
      cur.lastWasOption = true;
      if (trailingKey) applyKey(cur, trailingKey);
      continue;
    }

    const opt = matchSingleOption(t);
    if (opt) {
      markStructure();
      const pts = extractPoints(opt);
      cur.options.push(pts.clean || opt);
      if (pts.points !== null && !cur.sawPoints) {
        cur.points = pts.points;
        cur.sawPoints = true;
      }
      cur.sawOptions = true;
      if (cur.type !== 'true_false') cur.type = 'multiple_choice';
      cur.lastWasOption = true;
      if (trailingKey) applyKey(cur, trailingKey);
      continue;
    }

    const ans = matchAnswerKey(t);
    if (ans) {
      markStructure();
      applyKey(cur, ans);
      cur.lastWasOption = false;
      continue;
    }

    if (/^(?:True\s*[\/\-]\s*False|T\s*\/\s*F)\b/i.test(t)) {
      markStructure();
      cur.type = 'true_false';
      cur.sawKey = true;
      const rest = t.replace(/^(?:True\s*[\/\-]\s*False|T\s*\/\s*F)\b/i, '').trim();
      cur.correctAnswer = /^false/i.test(rest) ? 'False' : 'True';
      cur.lastWasOption = false;
      continue;
    }

    // Plain continuation: wrapped option text extends the last option,
    // everything else extends the prompt.
    const pts = extractPoints(t);
    const clean = pts.clean;
    if (pts.points !== null && !cur.sawPoints) {
      cur.points = pts.points;
      cur.sawPoints = true;
    }
    if (!structureSeen) {
      if (clean) pendingPreamble.push(clean);
      if (trailingKey) {
        markStructure();
        applyKey(cur, trailingKey);
      }
      continue;
    }
    if (trailingKey) applyKey(cur, trailingKey);
    if (!clean) continue;
    if (cur.sawOptions && cur.lastWasOption && cur.options.length > 0) {
      cur.options[cur.options.length - 1] = `${cur.options[cur.options.length - 1]} ${clean}`;
    } else {
      cur.text = cur.text ? `${cur.text} ${clean}` : clean;
      cur.lastWasOption = false;
    }
  }
  push();

  if (!structureSeen) {
    // No questions, headers, options, or keys anywhere: either empty input
    // or one marker-less blob. Paragraph-split blobs preserve the previous
    // blank-line behaviour for unnumbered lists.
    const paras = pendingPreamble.filter(p => p.trim());
    if (paras.length === 0 && drafts.length === 0) return [];
    if (paras.length <= 1 && drafts.length <= 1) {
      const single = collapseSpaces([...paras, ...drafts.map(d => d.text)].join(' '));
      if (!single) return [];
      return [{ text: single.slice(0, 150), type: 'identification', options: [], correctAnswer: '', points: 1 }];
    }
    return paras.map(p => ({ text: p, type: 'identification' as QuizItemType, options: [], correctAnswer: '', points: 1 }));
  }

  if (drafts.length === 0 && text.trim()) {
    return [{ text: text.trim().slice(0, 150), type: 'identification', options: [], correctAnswer: '', points: 1 }];
  }
  return drafts;
}
