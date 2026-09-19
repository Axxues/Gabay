import { describe, expect, it } from 'vitest';
import { emptyQuestionSetValue, compileActivityQuestions } from './QuestionSetFields';
import { emptyQuizBuilderValue, compileQuizQuestions } from './QuizBuilderFields';
import { parseQuizText } from '@/utils/quizImport';

describe('default question points should be 1', () => {
  it('activity: empty set defaults to 1 point', () => {
    expect(emptyQuestionSetValue().items[0].points).toBe(1);
  });

  it('activity: compiled questions fall back to 1 point', () => {
    const compiled = compileActivityQuestions({
      title: 'T',
      instructions: '',
      dueDate: '',
      items: [
        { id: '1', text: 'MC?', type: 'multiple_choice', options: ['A', 'B'], correctAnswer: 'A', points: 0 } as any,
        { id: '2', text: 'Essay?', type: 'essay', options: [], correctAnswer: '', points: 0 } as any,
      ],
    });
    expect(compiled[0].points).toBe(1);
    expect(compiled[1].points).toBe(1);
  });

  it('quiz: empty builder defaults to 1 point', () => {
    expect(emptyQuizBuilderValue().items[0].points).toBe(1);
  });

  it('quiz: compiled questions fall back to 1 point', () => {
    const compiled = compileQuizQuestions({
      title: 'T',
      instructions: '',
      timeLimitMinutes: 30,
      delayPosting: false,
      delayedDate: '',
      items: [
        { id: '1', text: 'MC?', type: 'multiple_choice', options: ['A', 'B'], correctAnswer: 'A', points: 0 } as any,
        { id: '2', text: 'Essay?', type: 'essay', options: [], correctAnswer: '', points: 0 } as any,
      ],
    });
    expect(compiled[0].points).toBe(1);
    expect(compiled[1].points).toBe(1);
  });

  it('exam/quiz import: parsed questions default to 1 point', () => {
    const drafts = parseQuizText('1. What is 2+2?\nA) 3\nB) 4\nAnswer: B');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].points).toBe(1);
  });

  it('exam/quiz import: essay without explicit points defaults to 1', () => {
    const drafts = parseQuizText('1.) Compare and contrast the differences between Jesuit and Dominican education.');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('essay');
    expect(drafts[0].points).toBe(1);
  });
});
