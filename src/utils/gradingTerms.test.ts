// client/src/utils/gradingTerms.test.ts
import { describe, expect, it, test } from 'vitest';
import { effectiveTerms, normalizeGradesReleased, normalizeTermId, resolveCourseTerms } from './gradingTerms';

const outline = (title: string, topics: string[] = []) => ({ title, topics });

describe('resolveCourseTerms', () => {
  it('detects midterm + finals from exam-period entries', () => {
    expect(resolveCourseTerms({ courseOutline: [
      outline('Foundation'),
      outline('Midterm Examination Period', ['Midterm Examination']),
      outline('Final Examination Period', ['Final Examination']),
    ] })).toEqual(['midterm', 'finals']);
  });
  it('detects prelim when present, preserving outline order', () => {
    expect(resolveCourseTerms({ courseOutline: [
      outline('Preliminary Examination', ['Prelim Exam']),
      outline('Midterm Examination Period'),
      outline('Final Examination Period'),
    ] })).toEqual(['prelim', 'midterm', 'finals']);
  });
  it('defaults to midterm + finals when nothing detected', () => {
    expect(resolveCourseTerms({ courseOutline: [outline('Intro')] })).toEqual(['midterm', 'finals']);
    expect(resolveCourseTerms(null)).toEqual(['midterm', 'finals']);
  });
  it('maps legacy final to finals', () => {
    expect(normalizeTermId('final')).toBe('finals');
    expect(normalizeTermId('midterm')).toBe('midterm');
  });
});

describe('effectiveTerms', () => {
  it('prefers the per-course override', () => {
    expect(effectiveTerms({ gradingTerms: ['midterm'] }, { courseOutline: [outline('Final Examination Period')] }))
      .toEqual(['midterm']);
  });
  it('falls back to detection with no override', () => {
    expect(effectiveTerms({}, { courseOutline: [outline('Midterm Examination Period')] }))
      .toEqual(['midterm']);
  });
});

describe('normalizeGradesReleased', () => {
  test('parses a JSON map, drops unknown terms and non-boolean values', () => {
    expect(
      normalizeGradesReleased(JSON.stringify({ midterm: true, finals: 1, quarter: true }))
    ).toEqual({ midterm: true });
  });

  test('accepts an object, null, garbage, and undefined as unreleased', () => {
    expect(normalizeGradesReleased({ prelim: true })).toEqual({ prelim: true });
    expect(normalizeGradesReleased(null)).toEqual({});
    expect(normalizeGradesReleased('{bad json')).toEqual({});
    expect(normalizeGradesReleased(undefined)).toEqual({});
  });
});
