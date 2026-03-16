/**
 * Conductor Agent — Central orchestrator for the solving pipeline
 * INGEST → PARSE → ROUTE → SOLVE → REVIEW → OUTPUT
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_PROMPT = readFileSync(join(__dirname, '../prompts/conductor.txt'), 'utf-8');

const PIPELINE_STAGES = ['uploaded', 'ingesting', 'parsing', 'routing', 'solving', 'reviewing', 'generating', 'complete'];

export class ConductorAgent {
  constructor({ ingestionAgent, parserAgent, routerAgent, solverAgent, reviewerAgent, outputAgent }) {
    this.agents = { ingestionAgent, parserAgent, routerAgent, solverAgent, reviewerAgent, outputAgent };
    this.sessions = new Map();
  }

  /**
   * Process a complete homework submission through the pipeline
   */
  async processSubmission(submission, onProgress) {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      submissionId: submission.id,
      studentId: submission.studentId,
      country: submission.country || 'IN',
      grade: submission.grade,
      board: submission.board,
      language: submission.language || 'en',
      uploadType: submission.uploadType,
      questions: [],
      pipelineStage: 'uploaded',
      errors: [],
      startedAt: new Date().toISOString(),
      currentAgent: null,
    };

    this.sessions.set(sessionId, session);

    try {
      // Stage 1: INGEST
      this.updateStage(session, 'ingesting', onProgress);
      const ingestionResult = await this.agents.ingestionAgent.process(submission);

      if (ingestionResult.confidence_score < 0.6) {
        throw new PipelineError('Could not read your homework clearly. Please re-upload a clearer photo.', 'INGESTION_LOW_CONFIDENCE');
      }

      // Stage 2: PARSE
      this.updateStage(session, 'parsing', onProgress);
      const questions = await this.agents.parserAgent.process(ingestionResult);

      if (questions.length === 0) {
        throw new PipelineError('No questions found. Please make sure your upload contains homework questions.', 'NO_QUESTIONS_FOUND');
      }

      session.questions = questions.map((q) => ({
        id: q.question_id,
        status: 'pending',
        retryCount: 0,
      }));

      onProgress?.({
        stage: 'parsing',
        message: session.language === 'hi'
          ? `${questions.length} sawal mile!`
          : `Found ${questions.length} questions!`,
        totalQuestions: questions.length,
      });

      // Stage 3: ROUTE
      this.updateStage(session, 'routing', onProgress);
      const routedQuestions = await this.agents.routerAgent.process(questions, {
        country: session.country,
        grade: session.grade,
        board: session.board,
      });

      // Check if any need confirmation
      const needsConfirmation = routedQuestions.filter((q) => q.needs_confirmation);
      if (needsConfirmation.length > 0) {
        onProgress?.({
          stage: 'routing',
          message: 'Please confirm your grade and board',
          needsConfirmation: true,
        });
        // In production: wait for student confirmation via WebSocket
      }

      // Stage 4: SOLVE (all questions in parallel)
      this.updateStage(session, 'solving', onProgress);
      const solutions = await this.solveAllParallel(routedQuestions, session, onProgress);

      // Stage 5: REVIEW (each solution as it arrives)
      this.updateStage(session, 'reviewing', onProgress);
      const reviewedSolutions = await this.reviewAll(solutions, routedQuestions, session, onProgress);

      // Stage 6: OUTPUT (generate PDF)
      this.updateStage(session, 'generating', onProgress);
      const pdfResult = await this.agents.outputAgent.process(reviewedSolutions, {
        student: { id: session.studentId, country: session.country, grade: session.grade },
        board: session.board,
        language: session.language,
      });

      this.updateStage(session, 'complete', onProgress);

      return {
        sessionId,
        submissionId: submission.id,
        questions: reviewedSolutions,
        pdfUrl: pdfResult.pdfUrl,
        totalQuestions: questions.length,
        solvedQuestions: reviewedSolutions.filter((s) => s.reviewStatus === 'pass').length,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      session.errors.push({ message: error.message, timestamp: new Date().toISOString() });
      session.pipelineStage = 'error';
      onProgress?.({ stage: 'error', message: error.userMessage || error.message });
      throw error;
    }
  }

  /**
   * Solve all questions in parallel
   */
  async solveAllParallel(questions, session, onProgress) {
    const solutions = await Promise.all(
      questions.map(async (question, index) => {
        const questionState = session.questions.find((q) => q.id === question.question_id);
        if (questionState) questionState.status = 'solving';

        onProgress?.({
          stage: 'solving',
          message: session.language === 'hi'
            ? `Sawal ${index + 1}/${questions.length} solve ho raha hai...`
            : `Solving question ${index + 1} of ${questions.length}...`,
          currentQuestion: index + 1,
          totalQuestions: questions.length,
        });

        try {
          const solution = await this.agents.solverAgent.process(question);
          if (questionState) questionState.status = 'solved';
          return { ...solution, question };
        } catch (error) {
          logger.error(`Failed to solve question ${question.question_id}:`, error);
          if (questionState) questionState.status = 'error';
          return { question, error: error.message, steps: [], finalAnswer: 'Error solving this question' };
        }
      })
    );

    return solutions;
  }

  /**
   * Review all solutions, retry failures up to 2 times
   */
  async reviewAll(solutions, questions, session, onProgress) {
    const reviewed = [];

    for (const solution of solutions) {
      if (solution.error) {
        reviewed.push({ ...solution, reviewStatus: 'needs_manual_review' });
        continue;
      }

      let review = await this.agents.reviewerAgent.process(solution);
      let retries = 0;

      while (review.verdict === 'FAIL' && retries < 2) {
        retries++;
        logger.info(`Retrying question ${solution.question.question_id} (attempt ${retries + 1})`);

        onProgress?.({
          stage: 'reviewing',
          message: `Improving answer for question ${solution.question.question_id}...`,
        });

        // Re-solve with error context
        const improved = await this.agents.solverAgent.process(solution.question, {
          previousErrors: review.issues,
          retryCount: retries,
        });

        review = await this.agents.reviewerAgent.process({ ...improved, question: solution.question });
      }

      if (review.verdict === 'FAIL') {
        reviewed.push({ ...solution, reviewStatus: 'needs_manual_review', reviewNotes: review.issues });
      } else {
        reviewed.push({ ...solution, reviewStatus: review.verdict.toLowerCase(), qualityScore: review.quality_score });
      }
    }

    return reviewed;
  }

  updateStage(session, stage, onProgress) {
    session.pipelineStage = stage;
    session.currentAgent = stage;
    logger.info(`Pipeline stage: ${stage} for session ${session.sessionId}`);
    onProgress?.({ stage, timestamp: new Date().toISOString() });
  }
}

class PipelineError extends Error {
  constructor(userMessage, code) {
    super(userMessage);
    this.userMessage = userMessage;
    this.code = code;
  }
}
