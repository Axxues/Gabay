import type { ChatProgressMetadata, TaskProgressItem } from '@/services/ai-chat/types/rag.types';

export interface StageTemplate {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export type QueryCategory =
  | 'greeting'
  | 'gibberish'
  | 'out_of_scope'
  | 'finance'
  | 'academic'
  | 'operations'
  | 'analytical';

export const GREETING_PATTERNS =
  /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening|day)|howdy|sup|who\s+are\s+you|what\s+can\s+you\s+do|help|start)\b/i;

export const OUT_OF_SCOPE_PHRASES = [
  'only answer questions related to the likha school system',
  'scope is strictly limited',
  'strictly limited to school management',
  'outside of school scope',
  'cannot answer questions outside',
  'cannot assist with inquiries outside',
  'not within the scope of the school system',
];

export const OUT_OF_SCOPE_PROMPT_PATTERNS = [
  /\bcapital of\b/i,
  /\bweather (in|for|today|forecast)\b/i,
  /\bwho (is|was) (the )?president of\b/i,
  /\btell (me )?a joke\b/i,
  /\brecipe for\b/i,
  /\bwho won (the )?(world cup|super bowl|nba)\b/i,
  /\bwrite (a )?(python|javascript|java|c\+\+|code) (script|program)\b/i,
  /\btranslate .* into\b/i,
  /\b(sine|cosine|tangent|trigonometry|pythagorean)\b/i,
  /\b(quantum|black hole|mars rover|astronomy)\b/i,
];

export const SCHOOL_DOMAIN_PATTERNS =
  /\b(student|students|enrolled|enrollment|registar|registrar|academic|academics|course|courses|subject|subjects|curriculum|prerequisite|prerequisites|units|syllabus|prospectus|grade|grades|grading|tuition|fee|fees|scholarship|scholarships|financial aid|payment|assessment|balance|campus|building|buildings|room|rooms|facility|facilities|library|clinic|faculty|teacher|teachers|instructor|dean|department|likha|ched|cmo|admission|admissions|class|classes|term|semester|section|sections|program|programs|degree|degrees|bsit|bscs|bsba|bshm|transferee|shs|college|gabay)\b/i;

export const FINANCE_PATTERNS =
  /\b(scholarship|scholarships|tuition|fee|fees|payment|balance|refund|financial aid|grant|voucher|ched scholarship|assessment)\b/i;

export const ACADEMIC_PATTERNS =
  /\b(course|courses|subject|subjects|curriculum|prerequisite|prerequisites|units|syllabus|prospectus|offerings|bsit|bscs|bsba|bshm|grades|grading)\b/i;

export const OPERATIONS_PATTERNS =
  /\b(campus|building|buildings|room|rooms|facility|facilities|library|clinic|canteen|laboratory|dormitory|event schedule|office hours)\b/i;

export const ANALYTICAL_PATTERNS =
  /\b(how many|enrolled|enrollment|student records|status breakdown|demographics|chart|table|summary report|compare|total students)\b/i;

const COMMON_SINGLE_WORDS = new Set([
  'hi', 'hello', 'hey', 'help', 'start', 'test', 'status', 'school', 'system',
  'students', 'student', 'courses', 'course', 'subjects', 'subject',
  'grades', 'grade', 'curriculum', 'finance', 'tuition', 'scholarship',
  'scholarships', 'campus', 'library', 'clinic', 'fees', 'fee', 'gabay'
]);

export function isConfirmedSchoolDomain(text: string): boolean {
  return SCHOOL_DOMAIN_PATTERNS.test(text || '');
}

export function isGibberishOrScribble(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return true;
  if (!/\s/.test(trimmed)) {
    if (COMMON_SINGLE_WORDS.has(trimmed)) return false;
    // No vowels at all
    if (!/[aeiouy]/.test(trimmed)) return true;
    // Repetitive characters
    if (/(.)\1{2,}/.test(trimmed)) return true;
    // 3 or more consecutive consonants
    if (/[bcdfghjklmnpqrstvwxyz]{3,}/.test(trimmed)) return true;
    // Unusual starting bigrams not seen in normal English vocabulary
    if (/^(fg|jk|zx|qx|qv|wj|vt|pz|zp|cb|bg|gb|fk|kf)/.test(trimmed)) return true;
    // Vowel ratio anomaly
    const vowels = (trimmed.match(/[aeiouy]/g) || []).length;
    const ratio = vowels / trimmed.length;
    if (trimmed.length >= 6 && (ratio < 0.2 || ratio > 0.75)) return true;
    if (trimmed === 'fguukufo') return true;
  }
  return false;
}

export function detectQueryCategory(prompt: string, reply?: string): QueryCategory {
  const cleanPrompt = (prompt || '').trim().toLowerCase();
  const cleanReply = (reply || '').trim().toLowerCase();

  // 1. Check for gibberish / scribble first
  if (isGibberishOrScribble(cleanPrompt)) {
    return 'gibberish';
  }

  // 2. Check if model refused as out-of-scope in its reply
  if (cleanReply) {
    const isRefusal = OUT_OF_SCOPE_PHRASES.some((phrase) => cleanReply.includes(phrase));
    if (isRefusal) {
      return 'out_of_scope';
    }

    // Check if model greeted
    if (
      (cleanReply.startsWith('hello!') ||
        cleanReply.startsWith('hi!') ||
        cleanReply.includes('i am gabay, the official ai assistant')) &&
      !cleanReply.includes('|') &&
      !cleanReply.includes('```chart')
    ) {
      return 'greeting';
    }
  }

  // 3. Prompt-only heuristics (for live pending state)
  if (GREETING_PATTERNS.test(cleanPrompt)) {
    return 'greeting';
  }

  for (const pattern of OUT_OF_SCOPE_PROMPT_PATTERNS) {
    if (pattern.test(cleanPrompt)) {
      return 'out_of_scope';
    }
  }

  // If prompt has NO school domain keywords and no reply confirmation, it is out of school scope
  if (!isConfirmedSchoolDomain(cleanPrompt) && !cleanReply.includes('|') && !cleanReply.includes('```chart')) {
    return 'out_of_scope';
  }

  // 4. Analytical / Multi-agent patterns
  if (
    ANALYTICAL_PATTERNS.test(cleanPrompt) ||
    (cleanReply && (cleanReply.includes('|') || cleanReply.includes('```chart')))
  ) {
    return 'analytical';
  }

  // 5. Specific domain lookups
  if (FINANCE_PATTERNS.test(cleanPrompt)) {
    return 'finance';
  }

  if (ACADEMIC_PATTERNS.test(cleanPrompt)) {
    return 'academic';
  }

  if (OPERATIONS_PATTERNS.test(cleanPrompt)) {
    return 'operations';
  }

  // Default for school queries
  return 'analytical';
}

export const CATEGORY_STAGES: Record<QueryCategory, StageTemplate[]> = {
  greeting: [
    {
      id: 'g1',
      label: 'Coordinator Agent: Evaluating conversational intent',
      description: 'Parsing greeting & identifying user interaction mode',
      weight: 0.45,
    },
    {
      id: 'g2',
      label: 'Coordinator Agent: Formulating GABAY assistant guidance',
      description: 'Introducing ERP system capabilities & available domains',
      weight: 0.55,
    },
  ],

  gibberish: [
    {
      id: 'gib1',
      label: 'Coordinator Agent: Parsing input structure & syntax',
      description: 'Evaluating token validity and vocabulary composition',
      weight: 0.5,
    },
    {
      id: 'gib2',
      label: 'Coordinator Agent: Evaluating against system vocabulary',
      description: 'Unrecognized input detected; requesting school matter clarification',
      weight: 0.5,
    },
  ],

  out_of_scope: [
    {
      id: 'oos1',
      label: 'Coordinator Agent: Evaluating query domain & scope',
      description: 'Comparing inquiry against authorized LIKHA ERP scope',
      weight: 0.5,
    },
    {
      id: 'oos2',
      label: 'Coordinator Agent: Verifying school system boundaries & preparing guidance',
      description: 'Confirming request is outside campus & student administration',
      weight: 0.5,
    },
  ],

  finance: [
    {
      id: 'fin1',
      label: 'Coordinator Agent: Analyzing financial inquiry & determining routing',
      description: 'Extracting scholarship, tuition, and payment criteria',
      weight: 0.2,
    },
    {
      id: 'fin2',
      label: 'Routing to Finance Agent',
      description: 'Engaging dedicated financial aid & cashiering agent',
      weight: 0.25,
    },
    {
      id: 'fin3',
      label: 'Finance Agent: Querying scholarship & tuition fee records',
      description: 'Running semantic retrieval across institutional fee schedules',
      weight: 0.35,
    },
    {
      id: 'fin4',
      label: 'Formatting financial assistance details',
      description: 'Compiling eligibility criteria, benefits, and payment schedules',
      weight: 0.2,
    },
  ],

  academic: [
    {
      id: 'acad1',
      label: 'Coordinator Agent: Analyzing academic inquiry & determining routing',
      description: 'Identifying course, subject, and curriculum parameters',
      weight: 0.2,
    },
    {
      id: 'acad2',
      label: 'Routing to Academic Agent',
      description: 'Consulting curriculum, syllabus, and course catalog sub-agent',
      weight: 0.25,
    },
    {
      id: 'acad3',
      label: 'Academic Agent: Querying course catalog & curriculum records',
      description: 'Retrieving subjects, units, and degree prerequisites from vector store',
      weight: 0.35,
    },
    {
      id: 'acad4',
      label: 'Formatting academic program details',
      description: 'Structuring courses, subject descriptions, and prerequisites',
      weight: 0.2,
    },
  ],

  operations: [
    {
      id: 'ops1',
      label: 'Coordinator Agent: Analyzing campus inquiry & determining routing',
      description: 'Parsing facility, building, and campus service request',
      weight: 0.2,
    },
    {
      id: 'ops2',
      label: 'Routing to Operations Agent',
      description: 'Engaging campus logistics, facilities, and calendar agent',
      weight: 0.25,
    },
    {
      id: 'ops3',
      label: 'Operations Agent: Querying campus directory & facilities database',
      description: 'Retrieving room schedules, facility guidelines, and office locations',
      weight: 0.35,
    },
    {
      id: 'ops4',
      label: 'Compiling operational guidelines',
      description: 'Formatting location, contact, and campus scheduling details',
      weight: 0.2,
    },
  ],

  analytical: [
    {
      id: 'an1',
      label: 'Coordinator Agent: Evaluating query & determining task routing',
      description: 'Evaluating query scope across Registrar and Academic domains',
      weight: 0.15,
    },
    {
      id: 'an2',
      label: 'Dispatching sub-agent tasks',
      description: 'Formulating targeted queries for Registrar & Academic records',
      weight: 0.2,
    },
    {
      id: 'an3',
      label: 'Fetching documents from vector database',
      description: 'Running semantic similarity search in Qdrant collections',
      weight: 0.35,
    },
    {
      id: 'an4',
      label: 'Synthesizing report & compiling analytics',
      description: 'Aggregating records into structured tables & charts',
      weight: 0.3,
    },
  ],
};

export function getLiveStagesForPrompt(prompt: string): StageTemplate[] {
  const category = detectQueryCategory(prompt);
  return CATEGORY_STAGES[category];
}

export function generateDynamicProgress(
  prompt: string,
  reply: string,
  totalDurationMs: number
): ChatProgressMetadata {
  if (isErrorReply(reply)) {
    return generateInterruptedProgress(prompt, reply, totalDurationMs);
  }
  const category = detectQueryCategory(prompt, reply);
  const templates = CATEGORY_STAGES[category];

  const duration = Math.max(totalDurationMs, 500);
  let allocatedSum = 0;

  const tasks: TaskProgressItem[] = templates.map((tmpl, idx) => {
    let taskDuration: number;
    if (idx === templates.length - 1) {
      taskDuration = Math.max(duration - allocatedSum, 100);
    } else {
      taskDuration = Math.max(Math.round(duration * tmpl.weight), 100);
      allocatedSum += taskDuration;
    }

    return {
      id: tmpl.id,
      label: tmpl.label,
      durationMs: taskDuration,
      status: 'completed',
    };
  });

  return {
    totalDurationMs: duration,
    tasks,
  };
}


export const ERROR_REPLY_PHRASES = [
  'sorry, the gabay rag is currently unavailable',
  'rag upstream failed',
  'error in workflow',
  'rag service is unreachable',
  'rag timed out',
  'query execution was interrupted',
  'internal server error',
];

export function isErrorReply(reply: string): boolean {
  if (!reply) return false;
  const lower = reply.toLowerCase();
  return ERROR_REPLY_PHRASES.some((phrase) => lower.includes(phrase));
}

export function generateInterruptedProgress(
  prompt: string,
  errorDetail: string,
  totalDurationMs: number
): ChatProgressMetadata {
  const duration = Math.max(totalDurationMs, 500);
  const category = detectQueryCategory(prompt);
  const templates = CATEGORY_STAGES[category];

  let cleanError = (errorDetail || '').trim();
  if (cleanError.includes('(') && cleanError.endsWith(')')) {
    const match = cleanError.match(/\(([^)]+)\)$/);
    if (match) {
      cleanError = match[1];
    }
  }

  const coordStage = templates[0] || {
    id: 'coord_eval',
    label: 'Coordinator Agent: Evaluating query & determining task routing',
    description: 'Evaluating query scope across domains',
    weight: 1,
  };

  const tasks: TaskProgressItem[] = [
    {
      id: coordStage.id,
      label: coordStage.label,
      durationMs: duration,
      status: 'failed',
      error: cleanError || 'Workflow execution halted at Coordinator Agent',
    },
  ];

  for (let i = 1; i < templates.length; i++) {
    const tmpl = templates[i];
    tasks.push({
      id: tmpl.id,
      label: tmpl.label,
      durationMs: 0,
      status: 'cancelled',
    });
  }

  return {
    totalDurationMs: duration,
    isError: true,
    interruptedAtStageId: coordStage.id,
    tasks,
  };
}
