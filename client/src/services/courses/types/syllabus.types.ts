export interface GraduateAttribute {
  number: number;
  title: string;
  description: string;
}

export interface CoreValue {
  acronym: string;
  keyword: string;
  description: string;
}

export interface ProgramOutcome {
  number: number;
  description: string;
}

export interface CourseOutcome {
  number: number;
  statement: string;
}

export interface RubricRow {
  category: string;
  levels: {
    1: string;
    2: string;
    3: string;
    4: string;
  };
}

export interface LearningPlanWeek {
  week: string;
  hoursLab: number;
  hoursLec: number;
  learningOutcomes: string[];
  topics: string[];
  sdgCoherence?: {
    goal: string;
    title: string;
    description: string;
    target?: string;
  };
  methodology: string[];
  resources: string[];
  assessment: string[];
}

export interface CourseMapEntry {
  coNumber: number;
  coStatement: string;
  poAlignments: Record<number, 'I' | 'P' | 'D' | ''>;
}

export interface FacultySchedule {
  name: string;
  sections: Array<{
    section: string;
    schedule: string;
    room: string;
  }>;
  consultation: string;
}

export interface OfficialSyllabusData {
  courseId?: string;
  institution: {
    university: string;
    college: string;
    formCode: string;
    revision: string;
  };
  courseInfo: {
    code: string;
    title: string;
    semester: string;
    academicYear: string;
    type: string;
    credit: string;
    lectureHours: string;
    labHours: string;
    prerequisite: string;
    description: string;
  };
  facultyMembers: FacultySchedule[];
  institutionalStatements: {
    philosophy: string;
    vision: string;
    mission: string;
    goal: string;
    coreValues: CoreValue[];
    graduateAttributes: GraduateAttribute[];
  };
  programOutcomes: ProgramOutcome[];
  courseOutcomes: CourseOutcome[];
  courseRequirements: {
    major: string[];
    other: string[];
  };
  gradingSystem: {
    termFormula: string;
    finalFormula: string;
    classStandingComponents: string[];
    passingGrade: string;
  };
  projectRubrics: RubricRow[];
  classroomPolicies: string[];
  courseOutline: Array<{
    timeFrame: string;
    title: string;
    topics: string[];
  }>;
  learningPlan: LearningPlanWeek[];
  courseMap: CourseMapEntry[];
  references: Array<{
    citation: string;
    year: string;
    doiOrPublisher?: string;
  }>;
  signatories: {
    preparedBy: Array<{ name: string; title: string }>;
    recommendingApproval: { name: string; title: string };
    approved: { name: string; title: string };
  };
  sourceDocument?: {
    fileName: string;
    fileSize: string;
    fileType: 'pdf' | 'docx';
    fileDataUrl?: string;
    uploadedAt: string;
  };
}
