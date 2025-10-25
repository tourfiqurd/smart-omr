// A4 paper aspect ratio (210mm x 297mm)
export const CANVAS_WIDTH = 2100;
export const CANVAS_HEIGHT = 2970;

export const SHEET_MARGIN = 100;
export const HEADER_HEIGHT = 400;

export const DEFAULT_NUM_QUESTIONS = 20;
export const MAX_QUESTIONS = 50; // To ensure it fits on a single A4 page without crowding.
export const QUESTIONS_PER_COLUMN = 25;
export const NUM_OPTIONS = 4;
export const OPTIONS_LABELS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

export const BUBBLE_RADIUS = 30;
export const BUBBLE_SPACING = 120; // Horizontal space between bubbles
export const QUESTION_SPACING = 95; // Vertical space between questions

// Calculated constants
export const CONTENT_WIDTH = CANVAS_WIDTH - 2 * SHEET_MARGIN;
export const START_Y = HEADER_HEIGHT + SHEET_MARGIN;

// Detector constants
export const DARKNESS_THRESHOLD = 120; // Grayscale value (0-255) to consider a bubble filled. Adjust based on scan quality.