// src/utils/sprExport.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ sheets: [] as Array<Array<string | number>>[] }));

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn((rows: Array<Array<string | number>>) => {
      captured.sheets.push(rows);
      return { capturedRows: rows };
    }),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

import { exportSPRToExcel } from './sprExport';
import type { Course, SPRColumn, User } from '@/services/lms/types/lms.types';

function col(id: string, title: string, perfectScore = 100): SPRColumn {
  return { id, title, perfectScore };
}

function course(): Course {
  return {
    id: 'c1',
    code: 'CS101',
    title: 'Intro',
    section: 'BSIT-1A',
    instructorName: 'Prof X',
  } as Course;
}

function roster(): User[] {
  return [
    {
      id: 's1',
      name: 'Student One',
      email: 's1@example.com',
      courseSections: { c1: 'BSIT-1A' },
    } as unknown as User,
  ];
}

function aoaRows(): Array<Array<string | number>> {
  return captured.sheets[captured.sheets.length - 1];
}

beforeEach(() => {
  captured.sheets.length = 0;
});

describe('exportSPRToExcel prelim bucket', () => {
  it('keeps 2-term exports byte-identical when no prelim bucket is passed', () => {
    const mt = [col('m1', 'MT Quiz 1')];
    const ft = [col('f1', 'FT Quiz 1')];
    const baseResolve = () => ({
      mtCells: [90],
      mtExam: 80,
      ftCells: [70],
      ftExam: 60,
      mtGrade: 85,
      ftGrade: 75,
      finalPercent: 79,
      numerical: '2.50',
    });

    exportSPRToExcel({
      course: course(),
      roster: roster(),
      config: { courseId: 'c1', midtermColumns: mt, finalColumns: ft, mtExamPerfect: 100, ftExamPerfect: 100 },
      resolveStudent: baseResolve,
    });
    const withoutPrelim = aoaRows();

    exportSPRToExcel({
      course: course(),
      roster: roster(),
      // Explicit empty prelim bucket must not change 2-term output.
      config: { courseId: 'c1', midtermColumns: mt, finalColumns: ft, mtExamPerfect: 100, ftExamPerfect: 100, prelimColumns: [] },
      resolveStudent: baseResolve,
    });
    const withEmptyPrelim = aoaRows();

    expect(withEmptyPrelim).toEqual(withoutPrelim);
  });

  it('includes prelim columns and grade in export output for a 3-term course', () => {
    const prelim = [col('p1', 'Prelim Quiz 1'), col('p2', 'Prelim Quiz 2')];
    const mt = [col('m1', 'MT Quiz 1')];
    const ft = [col('f1', 'FT Quiz 1')];

    exportSPRToExcel({
      course: course(),
      roster: roster(),
      config: {
        courseId: 'c1',
        midtermColumns: mt,
        finalColumns: ft,
        mtExamPerfect: 100,
        ftExamPerfect: 100,
        prelimColumns: prelim,
      },
      resolveStudent: () => ({
        mtCells: [90],
        mtExam: 80,
        ftCells: [70],
        ftExam: 60,
        mtGrade: 85,
        ftGrade: 75,
        finalPercent: 79,
        numerical: '2.50',
        prelimCells: [88, 92],
        prelimGrade: 90,
      }),
    });
    const rows = aoaRows();
    const header = rows[2] as Array<string | number>;
    const perfectRow = rows[3] as Array<string | number>;
    const studentRow = rows[4] as Array<string | number>;

    // Prelim block sits before the midterm block (chronological, mirrors UI).
    expect(header).toEqual([
      'No.',
      'Name of Student',
      'Course, Year & Section',
      'Prelim Quiz 1',
      'Prelim Quiz 2',
      'Prelim Grade',
      'MT Quiz 1',
      'MT Exam',
      'MT Grade',
      'FT Quiz 1',
      'FT Exam',
      'FT Grade',
      'Final Grade Percentage',
      'Final Grade Numerical',
    ]);
    expect(perfectRow.slice(3, 3 + prelim.length)).toEqual([100, 100]);
    expect(studentRow.slice(3, 3 + prelim.length + 1)).toEqual([88, 92, 90]);
  });
});
