import { describe, it, expect } from 'vitest';
import {
  detectQueryCategory,
  generateDynamicProgress,
  generateInterruptedProgress,
  isErrorReply,
  getLiveStagesForPrompt,
} from './ragTaskStages';

describe('ragTaskStages dynamic classification', () => {
  it('classifies scribbles and gibberish dynamically', () => {
    const category = detectQueryCategory(
      'fguukufo',
      'I am sorry, but I can only answer questions related to the LIKHA School System. My scope is strictly limited to school management matters such as student records, academic programs, scholarships and fees, and campus operations. How can I assist you with the school system today?'
    );
    expect(category).toBe('gibberish');

    const progress = generateDynamicProgress(
      'fguukufo',
      'I am sorry, but I can only answer questions related to the LIKHA School System...',
      18300
    );
    expect(progress.tasks).toHaveLength(2);
    expect(progress.tasks[0].label).toContain('Parsing input structure & syntax');
    expect(progress.tasks[1].label).toContain('Evaluating against system vocabulary');
    expect(progress.tasks.some((t) => t.label.includes('vector database'))).toBe(false);
  });

  it('classifies greetings dynamically', () => {
    const category = detectQueryCategory(
      'hello',
      'Hello! I am GABAY, the official AI assistant for the LIKHA School System ERP. I can help you with inquiries regarding student records, academic courses, scholarships and tuition, and school operations. How may I assist you today?'
    );
    expect(category).toBe('greeting');

    const progress = generateDynamicProgress(
      'hello',
      'Hello! I am GABAY, the official AI assistant for the LIKHA School System ERP...',
      9300
    );
    expect(progress.tasks).toHaveLength(2);
    expect(progress.tasks[0].label).toContain('Evaluating conversational intent');
    expect(progress.tasks[1].label).toContain('Formulating GABAY assistant guidance');
    expect(progress.tasks.some((t) => t.label.includes('vector database'))).toBe(false);
  });

  it('classifies out of scope questions dynamically even with analytical phrases like "generate report"', () => {
    const prompt = 'generate report on what is sine and cosine';
    const category = detectQueryCategory(prompt);
    expect(category).toBe('out_of_scope');

    const progress = generateDynamicProgress(
      prompt,
      'I am sorry, but I can only answer questions related to the LIKHA School System. My scope is strictly limited to school management matters such as student records, academic programs, scholarships and fees, and campus operations. How can I assist you with the school system today?',
      9100
    );
    expect(progress.tasks).toHaveLength(2);
    expect(progress.tasks[0].label).toContain('Coordinator Agent');
    expect(progress.tasks[1].label).toContain('Verifying school system boundaries');
    expect(progress.tasks.some((t) => t.label.includes('vector database'))).toBe(false);
    expect(progress.tasks.some((t) => t.label.includes('sub-agent'))).toBe(false);
  });

  it('classifies multi-agent enrollment analytical queries dynamically', () => {
    const prompt = 'How many students are currently enrolled in the school system?';
    const reply =
      '| Student Name | Student ID | Status |\n|---|---|---|\n| Edrich Josh | 23109093 | Returning |';
    const category = detectQueryCategory(prompt, reply);
    expect(category).toBe('analytical');

    const progress = generateDynamicProgress(prompt, reply, 40000);
    expect(progress.tasks).toHaveLength(4);
    expect(progress.tasks[0].label).toContain('Coordinator Agent');
    expect(progress.tasks[1].label).toContain('Dispatching sub-agent tasks');
    expect(progress.tasks[2].label).toContain('Fetching documents from vector database');
    expect(progress.tasks[3].label).toContain('Synthesizing report & compiling analytics');
  });

  it('provides dynamic live stages for pending prompt', () => {
    const greetingStages = getLiveStagesForPrompt('hello');
    expect(greetingStages).toHaveLength(2);
    expect(greetingStages[0].label).toContain('Evaluating conversational intent');

    const oosStages = getLiveStagesForPrompt('generate report on what is sine and cosine');
    expect(oosStages).toHaveLength(2);
    expect(oosStages[0].label).toContain('Coordinator Agent: Evaluating query domain & scope');

    const analyticalStages = getLiveStagesForPrompt('How many students are enrolled?');
    expect(analyticalStages).toHaveLength(4);
    expect(analyticalStages[2].label).toContain('Fetching documents from vector database');
  });

  describe('generateInterruptedProgress for interrupted/failed tasks', () => {
    it('accurately attributes 100% of duration to Coordinator Agent when stopped at coordinator', () => {
      const prompt = 'How many students are currently enrolled in the school system?';
      const errorMsg =
        'Sorry, the Gabay RAG is currently unavailable. Please check that the n8n backend is running and activated. (RAG upstream failed (500): {"message":"Error in workflow"})';
      
      const progress = generateInterruptedProgress(prompt, errorMsg, 17600);
      expect(progress.isError).toBe(true);
      expect(progress.totalDurationMs).toBe(17600);
      expect(progress.interruptedAtStageId).toBe('an1');

      // The Coordinator Agent should have taken 100% of the elapsed time (17.6s)
      const coordTask = progress.tasks[0];
      expect(coordTask.id).toBe('an1');
      expect(coordTask.status).toBe('failed');
      expect(coordTask.durationMs).toBe(17600);
      expect(coordTask.error).toContain('RAG upstream failed (500)');

      // Downstream tasks must NOT have random divided times and must NOT be marked completed
      const downstream = progress.tasks.slice(1);
      expect(downstream.length).toBeGreaterThan(0);
      for (const t of downstream) {
        expect(t.status).toBe('cancelled');
        expect(t.durationMs).toBe(0);
      }
    });

    it('detects error replies in generateDynamicProgress and returns interrupted progress', () => {
      const prompt = 'How many students are enrolled?';
      const errorReply =
        'Sorry, the Gabay RAG is currently unavailable. Please check that the n8n backend is running and activated. (RAG upstream failed (500): {"message":"Error in workflow"})';

      expect(isErrorReply(errorReply)).toBe(true);

      const progress = generateDynamicProgress(prompt, errorReply, 17600);
      expect(progress.isError).toBe(true);
      expect(progress.tasks[0].status).toBe('failed');
      expect(progress.tasks[0].durationMs).toBe(17600);
      expect(progress.tasks[1].status).toBe('cancelled');
      expect(progress.tasks[1].durationMs).toBe(0);
    });
  });
});
