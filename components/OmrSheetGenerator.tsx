import React, { useRef, useEffect, useState } from 'react';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, SHEET_MARGIN, HEADER_HEIGHT,
  NUM_OPTIONS, OPTIONS_LABELS, BUBBLE_RADIUS,
  BUBBLE_SPACING, QUESTION_SPACING, CONTENT_WIDTH, START_Y,
  DEFAULT_NUM_QUESTIONS, MAX_QUESTIONS, QUESTIONS_PER_COLUMN
} from '../constants';
import { DownloadIcon } from './icons';

const OmrSheetGenerator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sheetId, setSheetId] = useState('');
  const [numQuestions, setNumQuestions] = useState(DEFAULT_NUM_QUESTIONS);

  const generateSheetId = () => `OMR-${Date.now()}`;

  useEffect(() => {
    setSheetId(generateSheetId());
  }, []);
  
  useEffect(() => {
    if (sheetId) {
        drawSheet();
    }
  }, [sheetId, numQuestions]);
  
  const drawSheet = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas and set background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    ctx.lineWidth = 3;

    // Draw border
    ctx.strokeRect(SHEET_MARGIN / 2, SHEET_MARGIN / 2, CANVAS_WIDTH - SHEET_MARGIN, CANVAS_HEIGHT - SHEET_MARGIN);

    // --- Header ---
    ctx.textAlign = 'left';
    ctx.font = 'bold 60px Arial';
    ctx.fillText('OMR Answer Sheet', SHEET_MARGIN, SHEET_MARGIN + 60);

    ctx.font = '40px Arial';
    const headerField = (label: string, y: number) => {
      ctx.fillText(label, SHEET_MARGIN, y);
      ctx.beginPath();
      ctx.moveTo(SHEET_MARGIN + 250, y + 10);
      ctx.lineTo(SHEET_MARGIN + 800, y + 10);
      ctx.stroke();
    };

    headerField('Name:', SHEET_MARGIN + 150);
    headerField('Roll No:', SHEET_MARGIN + 220);
    headerField('Subject:', SHEET_MARGIN + 290);
    headerField('Date:', SHEET_MARGIN + 360);
    
    // Sheet ID
    ctx.textAlign = 'right';
    ctx.font = '30px "Courier New", monospace';
    ctx.fillText(`Sheet ID: ${sheetId}`, CANVAS_WIDTH - SHEET_MARGIN, SHEET_MARGIN + 60);
    

    // --- Questions ---
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px Arial';

    for (let i = 0; i < numQuestions; i++) {
      const questionNumber = i + 1;
      
      const column = Math.floor(i / QUESTIONS_PER_COLUMN);
      const questionIndexInColumn = i % QUESTIONS_PER_COLUMN;
      
      const y = START_Y + questionIndexInColumn * QUESTION_SPACING;

      let questionNumX: number;
      let bubbleStartX: number;

      if (column === 0) { // Left column
        questionNumX = SHEET_MARGIN + 50;
        bubbleStartX = SHEET_MARGIN + 200;
      } else { // Right column
        const rightColumnOffset = CANVAS_WIDTH / 2;
        questionNumX = rightColumnOffset + 50;
        bubbleStartX = rightColumnOffset + 200;
      }
      
      // Draw question number
      ctx.textAlign = 'right';
      ctx.fillText(`${questionNumber}.`, questionNumX, y + (BUBBLE_RADIUS / 2));
      ctx.textAlign = 'center';

      // Draw bubbles and labels
      for (let j = 0; j < NUM_OPTIONS; j++) {
        const x = bubbleStartX + j * BUBBLE_SPACING;
        
        // Draw bubble
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_RADIUS, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw label below bubble
        ctx.fillText(OPTIONS_LABELS[j], x, y + BUBBLE_RADIUS + 40);
      }
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `OMR_Sheet_${sheetId}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  const handleGenerate = () => {
    const newId = generateSheetId();
    setSheetId(newId);
  };

  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
        setNumQuestions(1);
    } else {
        setNumQuestions(Math.min(MAX_QUESTIONS, Math.max(1, value)));
    }
  };

  return (
    <div className="flex flex-col items-center">
        <div className="w-full max-w-xs mb-6 p-4 bg-gray-50 border rounded-lg shadow-sm">
            <label htmlFor="num-questions" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Questions
            </label>
            <input
                type="number"
                id="num-questions"
                value={numQuestions}
                onChange={handleNumQuestionsChange}
                min="1"
                max={MAX_QUESTIONS}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Max {MAX_QUESTIONS} questions to fit on a single A4 page.</p>
        </div>
        <p className="text-center text-gray-600 mb-4">
            This is a preview of the A4-sized OMR sheet. Use the buttons below to generate a new sheet or download it.
        </p>
        <div className="w-full max-w-4xl p-4 bg-white rounded-lg shadow-inner border border-gray-200 mb-6">
            <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-auto border border-gray-300"
            />
        </div>
        <div className="flex gap-4">
             <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition-colors duration-200 flex items-center gap-2"
                >
                Generate New Sheet
            </button>
            <button
                onClick={handleDownload}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200 flex items-center gap-2"
                >
                <DownloadIcon />
                Download JPEG
            </button>
        </div>
    </div>
  );
};

export default OmrSheetGenerator;