// src/utils/activities.test.ts
import { describe, expect, it } from 'vitest';
import { activityPointsPossible, scoreActivityQuestions } from './activities';
import type { QuizQuestion } from '@/services/lms/types/lms.types';

const mc: QuizQuestion = { id: 'q1', text: 'MC', type: 'multiple_choice', options: ['A', 'B'], correctAnswer: 'A', points: 10 };
const tf: QuizQuestion = { id: 'q2', text: 'TF', type: 'true_false', options: ['True', 'False'], correctAnswer: 'True', points: 5 };
const iden: QuizQuestion = { id: 'q3', text: 'ID', type: 'identification', correctAnswer: 'Manila', points: 5 };
const essay: QuizQuestion = { id: 'q4', text: 'ES', type: 'essay', points: 20 };

describe('scoreActivityQuestions', () => {
  it('scores MC and true/false by exact match', () => {
    const r = scoreActivityQuestions([mc, tf], { q1: 'A', q2: 'False' });
    expect(r.earned).toBe(10);
    expect(r.possible).toBe(15);
    expect(r.percent).toBe(67);
    expect(r.needsReview).toBe(false);
  });
  it('scores identification case-insensitively with trim', () => {
    const r = scoreActivityQuestions([iden], { q3: '  manila ' });
    expect(r.earned).toBe(5);
    expect(r.needsReview).toBe(false);
  });
  it('never auto-scores essays and flags review', () => {
    const r = scoreActivityQuestions([mc, essay], { q1: 'A', q4: 'a very long essay answer' });
    expect(r.earned).toBe(10);
    expect(r.possible).toBe(30);
    expect(r.needsReview).toBe(true);
    expect(r.perQuestion['q4'].auto).toBe(false);
    expect(r.perQuestion['q4'].earned).toBe(0);
  });
  it('treats blank answers as zero without review', () => {
    const r = scoreActivityQuestions([mc, iden], {});
    expect(r.earned).toBe(0);
    expect(r.needsReview).toBe(false);
  });
  it('skips description and page_break items', () => {
    const desc: QuizQuestion = { id: 'qx', text: 'Read this', type: 'description', points: 99 };
    const r = scoreActivityQuestions([mc, desc], { q1: 'B' });
    expect(r.possible).toBe(10);
    expect(r.earned).toBe(0);
  });
});

describe('activityPointsPossible', () => {
  it('sums gradable points only', () => {
    expect(activityPointsPossible([mc, tf, iden, essay])).toBe(40);
  });
});
