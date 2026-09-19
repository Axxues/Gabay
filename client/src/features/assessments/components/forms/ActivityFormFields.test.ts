import { describe, expect, test } from 'vitest';
import {
  buildActivityPayload,
  emptyActivityFormValue,
  validateActivityForm,
  type ActivityFormValue,
} from './ActivityFormFields';

const base: ActivityFormValue = {
  ...emptyActivityFormValue(),
  title: 'Activity 1',
};

describe('classic activity rubric opt-in', () => {
  test('defaults to no rubric', () => {
    const v = emptyActivityFormValue();
    expect(v.includeRubric).toBe(false);
    expect(v.rubric).toEqual([]);
  });

  test('unchecked rubric needs no rubric validation', () => {
    expect(validateActivityForm(base)).toBeNull();
  });

  test('checked rubric requires at least one criterion', () => {
    expect(validateActivityForm({ ...base, includeRubric: true, rubric: [] })).toMatchObject({
      title: 'Rubric Required',
    });
  });

  test('criterion requires a title', () => {
    const v: ActivityFormValue = {
      ...base,
      includeRubric: true,
      pointsPossible: 50,
      rubric: [
        { id: 'c1', title: '  ', description: '', points: 50, ratings: [{ points: 50, description: 'Great' }] },
      ],
    };
    expect(validateActivityForm(v)).toMatchObject({ title: 'Rubric Criterion Incomplete' });
  });

  test('rating requires a label', () => {
    const v: ActivityFormValue = {
      ...base,
      includeRubric: true,
      pointsPossible: 50,
      rubric: [
        { id: 'c1', title: 'Quality', description: '', points: 50, ratings: [{ points: 50, description: '  ' }] },
      ],
    };
    expect(validateActivityForm(v)).toMatchObject({ title: 'Rubric Rating Incomplete' });
  });

  test('criteria points must match total points', () => {
    const v: ActivityFormValue = {
      ...base,
      includeRubric: true,
      pointsPossible: 100,
      rubric: [
        { id: 'c1', title: 'Quality', description: '', points: 50, ratings: [{ points: 50, description: 'Great' }] },
      ],
    };
    const err = validateActivityForm(v);
    expect(err).toMatchObject({ title: 'Rubric Points Mismatch' });
    expect(err?.message).toContain('50');
    expect(err?.message).toContain('100');
  });

  test('valid custom rubric passes', () => {
    const v: ActivityFormValue = {
      ...base,
      includeRubric: true,
      pointsPossible: 100,
      rubric: [
        {
          id: 'c1',
          title: 'Correctness',
          description: 'Solves the problem',
          points: 60,
          ratings: [
            { points: 60, description: 'Fully correct' },
            { points: 30, description: 'Partial' },
          ],
        },
        {
          id: 'c2',
          title: 'Clarity',
          description: '',
          points: 40,
          ratings: [{ points: 40, description: 'Clear' }],
        },
      ],
    };
    expect(validateActivityForm(v)).toBeNull();
  });

  test('payload carries the grading term when set', () => {
    const payload = buildActivityPayload('c1', { ...base, term: 'prelim' }, true);
    expect(payload.term).toBe('prelim');
  });

  test('payload carries empty rubric when unchecked', () => {
    const payload = buildActivityPayload('c1', base, true);
    expect(payload.rubric).toEqual([]);
  });

  test('payload carries the custom rubric when checked', () => {
    const v: ActivityFormValue = {
      ...base,
      includeRubric: true,
      pointsPossible: 60,
      rubric: [
        { id: 'c1', title: 'Correctness', description: '', points: 60, ratings: [{ points: 60, description: 'Fully correct' }] },
      ],
    };
    const payload = buildActivityPayload('c1', v, true);
    expect(payload.rubric).toHaveLength(1);
    expect(payload.rubric?.[0].title).toBe('Correctness');
  });
});
