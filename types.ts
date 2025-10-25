
export type Option = 'A' | 'B' | 'C' | 'D' | null;

export interface OmrResult {
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  scorePercentage: number;
  detectedAnswers: { question: number; answer: Option }[];
  gradedAnswers: { question: number; correct: boolean; detected: Option, correctAns: Option }[];
}
