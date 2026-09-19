// src/utils/sprExport.ts
import * as XLSX from 'xlsx';
import type { Course, SPRConfig, User } from '@/services/lms/types/lms.types';
import { round2 } from './spr';

export function exportSPRToExcel(args: {
  course: Course;
  roster: User[];
  config: SPRConfig;
  resolveStudent: (studentId: string) => {
    prelimCells?: Array<number | null>; prelimGrade?: number | null;
    mtCells: Array<number | null>; mtExam: number | null;
    ftCells: Array<number | null>; ftExam: number | null;
    mtGrade: number | null; ftGrade: number | null;
    finalPercent: number | null; numerical: string;
  };
}): void {
  const { course, roster, config, resolveStudent } = args;
  const prelimCols = config.prelimColumns ?? [];
  // Prelim is class-standing-only (no exam column), mirroring the gradebook UI.
  // An absent/empty prelim bucket keeps 2-term exports byte-identical.
  const hasPrelim = prelimCols.length > 0;
  const mtCols = config.midtermColumns;
  const ftCols = config.finalColumns;

  const headerRow: Array<string | number> = [
    'No.',
    'Name of Student',
    'Course, Year & Section',
    ...prelimCols.map(c => c.title),
    ...(hasPrelim ? ['Prelim Grade'] : []),
    ...mtCols.map(c => c.title),
    'MT Exam',
    'MT Grade',
    ...ftCols.map(c => c.title),
    'FT Exam',
    'FT Grade',
    'Final Grade Percentage',
    'Final Grade Numerical',
  ];
  const totalCols = headerRow.length;
  const pad = (n: number): Array<string | number> => Array<string | number>(n).fill('');

  const blank = (v: number | null | undefined): number | string =>
    v === null || v === undefined ? '' : round2(v);

  const padCells = (vals: Array<number | null>, n: number): Array<string | number> => {
    const out: Array<string | number> = [];
    for (let i = 0; i < n; i += 1) out.push(i < vals.length ? blank(vals[i]) : '');
    return out;
  };

  const rows: Array<Array<string | number>> = [];
  rows.push(["STUDENT'S PERFORMANCE RECORD", ...pad(totalCols - 1)]);
  rows.push([`${course.code}: ${course.title}`, '', `Schedule: ${course.section}`, ...pad(totalCols - 3)]);
  rows.push(headerRow);
  rows.push([
    '', '', '',
    ...prelimCols.map(c => c.perfectScore),
    ...(hasPrelim ? [''] : []),
    ...mtCols.map(c => c.perfectScore),
    config.mtExamPerfect, '',
    ...ftCols.map(c => c.perfectScore),
    config.ftExamPerfect, '', '', '',
  ]);

  const sorted = [...roster].sort((a, b) => a.name.localeCompare(b.name));
  for (const student of sorted) {
    const v = resolveStudent(student.id);
    const section = student.courseSections?.[course.id] ?? course.section;
    rows.push([
      '',
      student.name,
      section,
      ...padCells(v.prelimCells ?? [], prelimCols.length),
      ...(hasPrelim ? [blank(v.prelimGrade)] : []),
      ...padCells(v.mtCells, mtCols.length),
      blank(v.mtExam),
      blank(v.mtGrade),
      ...padCells(v.ftCells, ftCols.length),
      blank(v.ftExam),
      blank(v.ftGrade),
      blank(v.finalPercent),
      v.finalPercent === null || v.finalPercent === undefined || v.numerical === '' || v.numerical === '—'
        ? ''
        : v.numerical,
    ]);
  }

  rows.push(pad(totalCols));
  rows.push([`Prepared by: ${course.instructorName}`, ...pad(totalCols - 1)]);
  rows.push(['Professor', ...pad(totalCols - 1)]);
  rows.push(['Verified by:', ...pad(totalCols - 1)]);
  rows.push(['Program Chair', ...pad(totalCols - 1)]);
  rows.push(['Approved:', ...pad(totalCols - 1)]);
  rows.push(['Dean', ...pad(totalCols - 1)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
  ws['!freeze'] = { xSplit: 3, ySplit: 4 };
  const gradeColCount = prelimCols.length + (hasPrelim ? 1 : 0) + mtCols.length + 2 + ftCols.length + 2;
  ws['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 18 },
    ...Array(gradeColCount).fill({ wch: 10 }),
    { wch: 12 },
    { wch: 12 },
  ];
  ws['!printSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SPR');
  XLSX.writeFile(wb, `${course.code}_SPR.xlsx`);
}
