// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  db: null as any,
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    activeUser: { id: 'u-fac-1', name: 'Faculty', role: 'faculty' },
    db: mocks.db,
  }),
}));

import { useCourseFiles } from './useCourseFiles';

beforeEach(() => {
  mocks.db = {
    courseFiles: [],
    courseFolders: [],
    modules: [],
    announcements: [],
    activities: [],
    quizzes: [],
    submissions: [],
  };
});

describe('useCourseFiles assessment-backed entries', () => {
  test('emits no quiz-sourced entries (quizzes save no files)', () => {
    mocks.db.quizzes = [
      {
        id: 'quiz-1',
        courseId: 'c1',
        title: 'Quiz 1 Midterm',
        instructions: 'Answer all.',
        published: true,
        questions: [{ id: 'q1', text: 'Q?', type: 'multiple_choice', options: ['A'], points: 1 }],
      },
    ];
    const { result } = renderHook(() => useCourseFiles('c1'));
    expect(result.current.allFiles.filter(f => (f as any).source === 'quizzes')).toHaveLength(0);
    expect((result.current.sourceCounts as any).quizzes).toBeUndefined();
  });

  test('lists a question-set activity created via Add module item even with no file attachment', () => {
    mocks.db.activities = [
      {
        id: 'act-1',
        format: 'questionset',
        courseId: 'c1',
        title: 'Activity 1 Midterm',
        instructions: 'Do it.',
        questions: [],
        pointsPossible: 8,
        published: true,
      },
    ];
    const { result } = renderHook(() => useCourseFiles('c1'));
    const activities = result.current.allFiles.filter(f => f.source === 'activities');
    expect(activities.length).toBeGreaterThan(0);
    expect(result.current.sourceCounts.activities).toBeGreaterThan(0);
  });
});

describe('useCourseFiles module-folder placement', () => {
  beforeEach(() => {
    mocks.db.courseFolders = [
      { id: 'fld-area', courseId: 'c1', parentId: null, name: 'Modules', autoKey: 'area:modules' },
      { id: 'fld-mod-1', courseId: 'c1', parentId: 'fld-area', name: 'Week 1', autoKey: 'module:mod-1' },
    ];
    mocks.db.modules = [
      {
        id: 'mod-1',
        courseId: 'c1',
        title: 'Week 1',
        items: [
          { id: 'item-a', type: 'activity', title: 'Activity 1', activityId: 'asg-activity-act-1', published: true },
        ],
      },
    ];
  });

  test('question-set activity linked via asg-activity-<id> resolves into that module folder', () => {
    mocks.db.activities = [
      {
        id: 'act-1',
        format: 'questionset',
        courseId: 'c1',
        title: 'Activity 1',
        instructions: 'Do it.',
        questions: [],
        pointsPossible: 8,
        published: true,
      },
    ];
    const { result } = renderHook(() => useCourseFiles('c1'));
    const entry = result.current.allFiles.find(f => f.id === 'act-virtual-act-1');
    expect(entry).toBeDefined();
    expect(entry?.folderId).toBe('fld-mod-1');
  });

  test('classic activity linked from a module item resolves into that module folder', () => {
    mocks.db.modules = [
      {
        id: 'mod-1',
        courseId: 'c1',
        title: 'Week 1',
        items: [{ id: 'item-c', type: 'activity', title: 'Lab 1', activityId: 'asg-1', published: true }],
      },
    ];
    mocks.db.activities = [
      {
        id: 'asg-1',
        format: 'classic',
        courseId: 'c1',
        title: 'Lab 1',
        instructions: 'Do the lab.',
        pointsPossible: 100,
        dueDate: new Date().toISOString(),
        submissionTypes: ['online_text'],
        published: true,
        category: 'Activities',
        weight: 20,
        rubric: [],
      },
    ];
    const { result } = renderHook(() => useCourseFiles('c1'));
    const entry = result.current.allFiles.find(f => f.id === 'asg-virtual-asg-1');
    expect(entry).toBeDefined();
    expect(entry?.folderId).toBe('fld-mod-1');
  });

  test('classic activity with no linked module files under its term folder, not root', () => {
    mocks.db.modules = [];
    mocks.db.activities = [
      {
        id: 'asg-9',
        format: 'classic',
        courseId: 'c1',
        title: 'Direct Lab',
        instructions: 'Do the lab.',
        term: 'finals',
        pointsPossible: 100,
        dueDate: new Date().toISOString(),
        submissionTypes: ['online_text'],
        published: true,
        category: 'Activities',
        weight: 20,
        rubric: [],
      },
    ];
    const { result } = renderHook(() => useCourseFiles('c1'));
    const entry = result.current.allFiles.find(f => f.id === 'asg-virtual-asg-9');
    expect(entry).toBeDefined();
    expect(entry?.folderId).toBe('vf-activities-finals');
  });
});

describe('useCourseFiles Activities term folders', () => {
  test('synthesizes an Activities root with a child per term of page-created activities', () => {
    mocks.db.activities = [
      {
        id: 'asg-m',
        courseId: 'c1',
        title: 'Midterm Lab',
        instructions: '',
        term: 'midterm',
        format: 'classic',
        pointsPossible: 100,
        dueDate: new Date().toISOString(),
        submissionTypes: ['online_text'],
        published: true,
        category: 'Activities',
        weight: 20,
        rubric: [],
      },
      {
        id: 'act-f',
        courseId: 'c1',
        title: 'Finals Set',
        instructions: '',
        term: 'finals',
        format: 'questionset',
        questions: [],
        pointsPossible: 8,
        published: true,
      },
    ];
    const { result } = renderHook(() => useCourseFiles('c1'));
    const folders = result.current.virtualFolders;
    const root = folders.find(f => f.id === 'vf-activities');
    expect(root).toMatchObject({ name: 'Activities', parentId: null });
    const mid = folders.find(f => f.id === 'vf-activities-midterm');
    const fin = folders.find(f => f.id === 'vf-activities-finals');
    expect(mid).toMatchObject({ name: 'Midterm', parentId: 'vf-activities' });
    expect(fin).toMatchObject({ name: 'Finals', parentId: 'vf-activities' });
    expect(folders.find(f => f.id === 'vf-activities-prelim')).toBeUndefined();
    expect(result.current.allFiles.find(f => f.id === 'asg-virtual-asg-m')?.folderId).toBe(
      'vf-activities-midterm'
    );
    expect(result.current.allFiles.find(f => f.id === 'act-virtual-act-f')?.folderId).toBe(
      'vf-activities-finals'
    );
  });

  test('legacy untagged activities file under a Midterm folder', () => {
    mocks.db.activities = [
      {
        id: 'asg-old',
        format: 'classic',
        courseId: 'c1',
        title: 'Old Lab',
        instructions: '',
        pointsPossible: 50,
        dueDate: new Date().toISOString(),
        submissionTypes: ['online_text'],
        published: true,
        category: 'Activities',
        weight: 20,
        rubric: [],
      },
    ];
    const { result } = renderHook(() => useCourseFiles('c1'));
    expect(result.current.allFiles.find(f => f.id === 'asg-virtual-asg-old')?.folderId).toBe(
      'vf-activities-midterm'
    );
    expect(
      result.current.virtualFolders.find(f => f.id === 'vf-activities-midterm')
    ).toBeDefined();
  });

  test('no virtual folders when every activity is module-linked', () => {
    mocks.db.courseFolders = [
      { id: 'fld-area', courseId: 'c1', parentId: null, name: 'Modules', autoKey: 'area:modules' },
      { id: 'fld-mod-1', courseId: 'c1', parentId: 'fld-area', name: 'Week 1', autoKey: 'module:mod-1' },
    ];
    mocks.db.modules = [
      {
        id: 'mod-1',
        courseId: 'c1',
        title: 'Week 1',
        items: [
          { id: 'item-a', type: 'activity', title: 'Activity 1', activityId: 'asg-activity-act-1', published: true },
        ],
      },
    ];
    mocks.db.activities = [
      {
        id: 'act-1',
        format: 'questionset',
        courseId: 'c1',
        title: 'Activity 1',
        instructions: '',
        term: 'midterm',
        questions: [],
        pointsPossible: 8,
        published: true,
      },
    ];
    const { result } = renderHook(() => useCourseFiles('c1'));
    expect(result.current.virtualFolders).toHaveLength(0);
    expect(result.current.allFiles.find(f => f.id === 'act-virtual-act-1')?.folderId).toBe(
      'fld-mod-1'
    );
  });
});
