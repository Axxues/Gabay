// src/utils/quizImport.test.ts
import { describe, expect, it } from 'vitest';
import {
  applyQuizTextLimit,
  classifyQuizImportFile,
  isQuizImportTooLarge,
  parseQuizText,
  QUIZ_IMPORT_MAX_BYTES,
  QUIZ_IMPORT_TEXT_LIMIT,
} from './quizImport';

describe('parseQuizText JSON', () => {
  it('parses a JSON array of questions', () => {
    const drafts = parseQuizText(
      JSON.stringify([
        { text: 'Capital of France?', type: 'identification', correctAnswer: 'Paris', points: 5 },
      ])
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].text).toBe('Capital of France?');
    expect(drafts[0].type).toBe('identification');
    expect(drafts[0].correctAnswer).toBe('Paris');
  });
  it('parses a { questions } wrapper object', () => {
    const drafts = parseQuizText(
      JSON.stringify({ questions: [{ text: '2+2?', type: 'identification', correctAnswer: '4', points: 2 }] })
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].correctAnswer).toBe('4');
  });
});

describe('parseQuizText line parser', () => {
  it('parses a numbered MC block with options and answer key', () => {
    const drafts = parseQuizText('1. What is 2+2?\nA) 3\nB) 4\nC) 5\nAnswer: B');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('multiple_choice');
    expect(drafts[0].text).toBe('What is 2+2?');
    expect(drafts[0].options).toEqual(['3', '4', '5']);
    expect(drafts[0].correctAnswer).toBe('B');
  });
  it('detects true/false via an Answer key', () => {
    const drafts = parseQuizText('1. The sky is blue\nAnswer: True');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('true_false');
    expect(drafts[0].correctAnswer).toBe('True');
    expect(drafts[0].options).toEqual(['True', 'False']);
  });
  it('reads points hints', () => {
    const drafts = parseQuizText('1. Define gravity (10 pts)\nA) Force\nB) Energy\nAnswer: A');
    expect(drafts[0].points).toBe(10);
  });
  it('maps a lone prompt with no options or key to identification', () => {
    const drafts = parseQuizText('What is the capital of France?');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('identification');
    expect(drafts[0].options).toEqual([]);
  });
  it('maps numbered prompts without options to identifications', () => {
    const drafts = parseQuizText('1. Capital of France?\n2. Largest planet?');
    expect(drafts).toHaveLength(2);
    expect(drafts.every(d => d.type === 'identification')).toBe(true);
  });
  it('merges continuation lines into the prompt', () => {
    const drafts = parseQuizText('1. Explain photosynthesis\nin green plants');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].text).toContain('green plants');
  });
  it('maps garbage input to a single identification fallback', () => {
    const drafts = parseQuizText('asdf jkl');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('identification');
  });
  it('returns no drafts for empty input', () => {
    expect(parseQuizText('   \n  ')).toEqual([]);
  });
});

describe('file guards', () => {
  it('classifies quiz file kinds', () => {
    expect(classifyQuizImportFile('quiz.pdf')).toBe('pdf');
    expect(classifyQuizImportFile('Quiz.DOCX')).toBe('docx');
    expect(classifyQuizImportFile('q.txt')).toBe('text');
    expect(classifyQuizImportFile('q.md')).toBe('text');
    expect(classifyQuizImportFile('q.json')).toBe('text');
    expect(classifyQuizImportFile('q.csv')).toBe('text');
    expect(classifyQuizImportFile('legacy.doc')).toBe('unsupported');
    expect(classifyQuizImportFile('sheet.xls')).toBe('unsupported');
  });
  it('enforces the 10 MB cap', () => {
    expect(QUIZ_IMPORT_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(isQuizImportTooLarge(10 * 1024 * 1024 + 1)).toBe(true);
    expect(isQuizImportTooLarge(10 * 1024 * 1024)).toBe(false);
  });
  it('flags truncation at the text limit', () => {
    const big = 'x'.repeat(QUIZ_IMPORT_TEXT_LIMIT + 100);
    const out = applyQuizTextLimit(big);
    expect(out.truncated).toBe(true);
    expect(out.text).toHaveLength(QUIZ_IMPORT_TEXT_LIMIT);
    expect(applyQuizTextLimit('small').truncated).toBe(false);
  });
});

describe('parseQuizText real-world formats', () => {
  it('splits multiple options sharing one line', () => {
    const drafts = parseQuizText(
      '1. It is defined as the set of people living together.\na.) science b.) society c.) community'
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('multiple_choice');
    expect(drafts[0].options).toEqual(['science', 'society', 'community']);
  });
  it('splits options glued to the stem without spacing', () => {
    const drafts = parseQuizText(
      '1.Which of the following is an attribute?\na. It governs territory. b. It imposes sovereignty.'
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].text).toBe('Which of the following is an attribute?');
    expect(drafts[0].options).toEqual(['It governs territory.', 'It imposes sovereignty.']);
  });
  it('accepts a space between the option letter and its closer', () => {
    const drafts = parseQuizText(
      '1. Which enzyme is not involved?\nA.Glucokinase\nB. Galactokinase\nC . Galactose-1-Phosphate'
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].text).toBe('Which enzyme is not involved?');
    expect(drafts[0].options).toEqual(['Glucokinase', 'Galactokinase', 'Galactose-1-Phosphate']);
  });
  it('parses blank-prefixed True/False items under their header', () => {
    const drafts = parseQuizText(
      'True or False.\n__________1. Science can be traced 2,000 years ago.\n__________2. Technology affects society.'
    );
    const questions = drafts.filter(d => d.type !== 'description' && d.type !== 'page_break');
    expect(questions).toHaveLength(2);
    expect(questions.every(d => d.type === 'true_false')).toBe(true);
    expect(questions[0].text).toBe('Science can be traced 2,000 years ago.');
  });
  it('turns section headers into layout cards instead of questions', () => {
    const drafts = parseQuizText(
      'Midterm Examination\nTest I. MULTIPLE CHOICE\n1. Rizal Traders provided data.\na. 781,250\nb. 735,294'
    );
    expect(drafts[0].type).toBe('description');
    expect(drafts[0].text).toBe('Midterm Examination');
    expect(drafts[1].type).toBe('page_break');
    const last = drafts[drafts.length - 1];
    expect(last.type).toBe('multiple_choice');
    expect(last.text).toBe('Rizal Traders provided data.');
    expect(last.options).toEqual(['781,250', '735,294']);
  });
  it('classifies "1.)" command prompts as essay without marker residue', () => {
    const drafts = parseQuizText(
      '1.) Compare and contrast the differences between Jesuit and Dominican education.'
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('essay');
    expect(drafts[0].text).not.toContain(')');
    expect(drafts[0].points).toBe(1);
  });
  it('ignores minute counts in titles when reading points', () => {
    const drafts = parseQuizText(
      'Level I Ethics Quiz 1 (44 questions, 66 minutes)\n1. What is 2+2?\nA) 3\nB) 4\nAnswer: B'
    );
    const mc = drafts.find(d => d.type === 'multiple_choice');
    expect(mc?.points).toBe(1);
  });
  it('reads a trailing inline answer key without polluting the prompt', () => {
    const drafts = parseQuizText('1. What is 2+2?\nA) 3\nB) 4 Answer: B');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].options).toEqual(['3', '4']);
    expect(drafts[0].correctAnswer).toBe('B');
  });
  it('appends wrapped option text to the option, not the prompt', () => {
    const drafts = parseQuizText(
      '1. Jill Jones is under investigation.\nA. Must accept the sanctions.\nB. Can reject the sanctions in which case the matter is referred\nto a hearing panel\nAnswer: B'
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].text).toBe('Jill Jones is under investigation.');
    expect(drafts[0].options[1]).toContain('hearing panel');
  });
  it('maps enumeration items to identification, not essay', () => {
    const drafts = parseQuizText('ENUMERATION.\n1. UN prime judicial organ\n2. ASEAN motto');
    const questions = drafts.filter(d => d.type !== 'description' && d.type !== 'page_break');
    expect(questions).toHaveLength(2);
    expect(questions.every(d => d.type === 'identification')).toBe(true);
  });
  it('ignores lowercase keyword continuations as section headers', () => {
    const drafts = parseQuizText(
      '1. This is the central deliberative organ where members have representation in\ndiscussion and consideration, and policymaking.\na. Court\nb. Assembly\nAnswer: B'
    );
    expect(drafts.filter(d => d.type === 'description' || d.type === 'page_break')).toHaveLength(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('multiple_choice');
    expect(drafts[0].text).toContain('policymaking');
  });
  it('ignores long unterminated fragments as section headers', () => {
    const drafts = parseQuizText(
      '1. UN is appreciated regarding how its convening capacity is utilized to help\nDiscussion funnel and consolidate knowledge from outside and ensure its dissemination among\ngovernments.\na. True\nb. False'
    );
    expect(drafts.filter(d => d.type === 'description' || d.type === 'page_break')).toHaveLength(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].text).toContain('governments');
  });
  it('ignores command keywords buried mid-sentence for essay typing', () => {
    const drafts = parseQuizText(
      '1. UN is appreciated regarding how its convening capacity is utilized to help funnel and discuss knowledge?'
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('identification');
  });
  it('keeps shared-stem blocks as instruction cards', () => {
    const drafts = parseQuizText(
      '1. First question.\na. Opt A\nb. Opt B\nFor items 12-16, use the following problem to answer.\n12. Net sales were\na. P755,000\nb. P725,000'
    );
    expect(drafts.some(d => d.type === 'description' && /For items 12-16/i.test(d.text))).toBe(true);
    expect(drafts.filter(d => d.type === 'multiple_choice')).toHaveLength(2);
  });
});
