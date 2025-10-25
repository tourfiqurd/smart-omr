import React, { useState, useRef, useCallback, useEffect } from 'react';
import { OmrResult, Option } from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, START_Y, SHEET_MARGIN,
  NUM_OPTIONS, OPTIONS_LABELS, BUBBLE_RADIUS,
  BUBBLE_SPACING, QUESTION_SPACING, DARKNESS_THRESHOLD, DEFAULT_NUM_QUESTIONS, QUESTIONS_PER_COLUMN, MAX_QUESTIONS
} from '../constants';
import { UploadIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon } from './icons';

const OmrSheetReader: React.FC = () => {
  const [numQuestions, setNumQuestions] = useState(DEFAULT_NUM_QUESTIONS);
  const [answerKey, setAnswerKey] = useState<Option[]>(Array(DEFAULT_NUM_QUESTIONS).fill(null));
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [results, setResults] = useState<OmrResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processingCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setAnswerKey(currentKey => {
      const newKey = Array(numQuestions).fill(null);
      const len = Math.min(currentKey.length, numQuestions);
      for (let i = 0; i < len; i++) {
        newKey[i] = currentKey[i];
      }
      return newKey;
    });
  }, [numQuestions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setResults(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnswerKeyChange = (index: number, value: Option) => {
    const newKey = [...answerKey];
    newKey[index] = value;
    setAnswerKey(newKey);
  };
  
  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
        setNumQuestions(1);
    } else {
        setNumQuestions(Math.min(MAX_QUESTIONS, Math.max(1, value)));
    }
  };

  const getBubbleDarkness = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): number => {
    const imageData = ctx.getImageData(x - radius, y - radius, radius * 2, radius * 2);
    const data = imageData.data;
    let darkPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const relX = (i / 4) % (radius * 2) - radius;
      const relY = Math.floor((i / 4) / (radius * 2)) - radius;
      
      if (relX * relX + relY * relY <= radius * radius) {
        totalPixels++;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const grayscale = (r + g + b) / 3;
        if (grayscale < DARKNESS_THRESHOLD) {
          darkPixels++;
        }
      }
    }
    return totalPixels > 0 ? (darkPixels / totalPixels) * 255 : 0;
  }, []);

  const processImage = useCallback(() => {
    if (!imageSrc) return;
    setIsLoading(true);
    setError(null);
    setResults(null);

    const process = async () => {
      const canvas = processingCanvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (!canvas || !ctx) {
          setError('Could not get canvas context.');
          setIsLoading(false);
          return;
      }

      const img = new Image();
      img.onload = () => {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const detectedAnswers: { question: number; answer: Option }[] = [];
        let correctCount = 0;
        let wrongCount = 0;
        let unansweredCount = 0;

        for (let i = 0; i < numQuestions; i++) {
          const column = Math.floor(i / QUESTIONS_PER_COLUMN);
          const questionIndexInColumn = i % QUESTIONS_PER_COLUMN;
          const y = START_Y + questionIndexInColumn * QUESTION_SPACING;

          let bubbleStartX: number;
          if (column === 0) { // Left column
            bubbleStartX = SHEET_MARGIN + 200;
          } else { // Right column
            const rightColumnOffset = CANVAS_WIDTH / 2;
            bubbleStartX = rightColumnOffset + 200;
          }

          let darkestBubbleIndex = -1;
          let maxDarkness = 0;
          let darknessValues = [];

          for (let j = 0; j < NUM_OPTIONS; j++) {
            const x = bubbleStartX + j * BUBBLE_SPACING;
            const darkness = getBubbleDarkness(ctx, x, y, BUBBLE_RADIUS);
            darknessValues.push(darkness);

            if (darkness > maxDarkness) {
              maxDarkness = darkness;
              darkestBubbleIndex = j;
            }
          }

          let detectedOption: Option = null;
          // Heuristic to check if a bubble is significantly darker than others
          const isClearlyMarked = darknessValues.some((d, index) => {
            const otherDarkness = darknessValues.filter((_, k) => k !== index).map(v => v || 0);
            const avgOther = otherDarkness.length > 0 ? otherDarkness.reduce((a, b) => a + b, 0) / otherDarkness.length : 0;
            return d > DARKNESS_THRESHOLD && d > avgOther * 2.5; // Bubble is filled and much darker than others
          });

          if (isClearlyMarked) {
             detectedOption = OPTIONS_LABELS[darkestBubbleIndex];
          }

          detectedAnswers.push({ question: i + 1, answer: detectedOption });

          if (detectedOption === null) {
            unansweredCount++;
          } else if (detectedOption === answerKey[i]) {
            correctCount++;
          } else {
            wrongCount++;
          }
        }
        
        const gradedAnswers = detectedAnswers.map((ans, i) => ({
            question: ans.question,
            detected: ans.answer,
            correctAns: answerKey[i],
            correct: ans.answer !== null && ans.answer === answerKey[i]
        }));

        const scorePercentage = (correctCount / numQuestions) * 100;
        
        setResults({
          totalQuestions: numQuestions,
          correct: correctCount,
          wrong: wrongCount,
          unanswered: unansweredCount,
          scorePercentage,
          detectedAnswers,
          gradedAnswers
        });

        setIsLoading(false);
      };
      img.onerror = () => {
        setError('Failed to load the image. Please try another file.');
        setIsLoading(false);
      }
      img.src = imageSrc;
    };
    // Use timeout to allow UI to update before heavy processing
    setTimeout(process, 100);
  }, [imageSrc, answerKey, getBubbleDarkness, numQuestions]);

  const isGradingDisabled = !imageSrc || isLoading || answerKey.some(k => k === null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column: Setup */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">1. Upload & Configure</h3>
          <label htmlFor="file-upload" className="cursor-pointer group">
            <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${imageSrc ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}>
              <UploadIcon className={`mx-auto h-12 w-12 ${imageSrc ? 'text-green-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
              <p className="mt-2 text-sm font-semibold text-gray-600">{imageSrc ? 'Image selected!' : 'Click to upload JPG or PNG'}</p>
              <p className="text-xs text-gray-500">{imageSrc ? 'Replace the current image by clicking again.' : 'Ensure the image is well-lit and aligned.'}</p>
            </div>
          </label>
          <input id="file-upload" type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleFileChange} />
        
          <div className="mt-4 max-w-xs">
            <label htmlFor="scan-num-questions" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Questions on Sheet
            </label>
            <input
                type="number"
                id="scan-num-questions"
                value={numQuestions}
                onChange={handleNumQuestionsChange}
                min="1"
                max={MAX_QUESTIONS}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`e.g., ${DEFAULT_NUM_QUESTIONS}`}
            />
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">2. Set Answer Key</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {answerKey.map((_, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-100 p-2 rounded-md">
                <span className="font-bold text-sm text-gray-700">{index + 1}.</span>
                <select 
                  value={answerKey[index] || ''} 
                  onChange={(e) => handleAnswerKeyChange(index, e.target.value as Option)}
                  className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="" disabled>--</option>
                  {OPTIONS_LABELS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div>
            <button 
                onClick={processImage}
                disabled={isGradingDisabled}
                className={`w-full py-4 text-lg font-bold text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-3
                ${isGradingDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-1'}`}>
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Grading...
                    </>
                ) : 'Grade Sheet'}
            </button>
            {isGradingDisabled && !isLoading && <p className="text-xs text-center text-red-600 mt-2">Please upload a sheet and complete the answer key to enable grading.</p>}
        </div>
      </div>

      {/* Right Column: Results */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-800">3. View Results</h3>
        {error && <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}
        {!results && !isLoading && !imageSrc && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center h-full flex flex-col justify-center">
              <p className="text-gray-500">Upload an image and set the answer key to see results here.</p>
          </div>
        )}
        {isLoading && (
             <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center h-full flex flex-col justify-center items-center">
                <p className="text-gray-700 font-semibold text-lg">Processing image, please wait...</p>
                <p className="text-gray-500 text-sm mt-2">This may take a few moments.</p>
            </div>
        )}
        {results && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                <div className="text-center mb-4">
                    <p className="text-sm font-medium text-blue-800">Final Score</p>
                    <p className="text-6xl font-extrabold text-blue-600">{results.scorePercentage.toFixed(1)}%</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1"><CheckCircleIcon />{results.correct}</p>
                        <p className="text-xs text-gray-600">Correct</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1"><XCircleIcon />{results.wrong}</p>
                        <p className="text-xs text-gray-600">Wrong</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1"><QuestionMarkCircleIcon />{results.unanswered}</p>
                        <p className="text-xs text-gray-600">Unanswered</p>
                    </div>
                </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-3 text-gray-700">Detailed Breakdown:</h4>
              <div className="border border-gray-200 rounded-lg shadow-sm">
                <div className="max-h-[450px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q.No</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Answer</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.gradedAnswers.map((ans) => {
                        let resultText, textColor, bgColor, ResultIcon;
                        if (ans.detected === null) {
                          resultText = 'Unanswered';
                          textColor = 'text-yellow-800';
                          bgColor = 'bg-yellow-50';
                          ResultIcon = QuestionMarkCircleIcon;
                        } else if (ans.correct) {
                          resultText = 'Correct';
                          textColor = 'text-green-800';
                          bgColor = 'bg-green-50';
                          ResultIcon = CheckCircleIcon;
                        } else {
                          resultText = 'Wrong';
                          textColor = 'text-red-800';
                          bgColor = 'bg-red-50';
                          ResultIcon = XCircleIcon;
                        }
                        
                        return (
                          <tr key={ans.question} className={bgColor}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{ans.question}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">{ans.detected || '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">{ans.correctAns || '—'}</td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${textColor}`}>
                              <div className="flex items-center gap-1.5">
                                <ResultIcon />
                                <span>{resultText}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      <canvas ref={processingCanvasRef} className="hidden" />
    </div>
  );
};

export default OmrSheetReader;