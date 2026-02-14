'use client';

import type { QuestionWithFeedback } from '@/lib/types';

interface FeedbackTabProps {
  questions: QuestionWithFeedback[];
  onEditQuestion: (question: QuestionWithFeedback) => void;
  onDeleteQuestion: (id: number) => void;
}

export default function FeedbackTab({ questions, onEditQuestion, onDeleteQuestion }: FeedbackTabProps) {
  const feedbackQuestions = [...questions]
    .sort((a, b) => {
      const aScore = a.thumbs_down - a.thumbs_up;
      const bScore = b.thumbs_down - b.thumbs_up;
      return bScore - aScore;
    })
    .filter(q => q.thumbs_up > 0 || q.thumbs_down > 0);

  return (
    <div className="rounded-xl shadow-sm border overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      {feedbackQuestions.length === 0 ? (
        <div className="p-8 text-center text-gray-600 dark:text-gray-400">
          No feedback yet. Questions will appear here once students start voting.
        </div>
      ) : (
        <>
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Questions sorted by feedback (most thumbs down first). Review these for potential edits or removal.
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {feedbackQuestions.map((question) => (
              <div key={question.id} className="p-4 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 mr-3">
                    {question.level}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">{question.text}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 1 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-1.341 5.974C17.153 16.323 16.072 17 14.9 17h-3.192a3 3 0 0 1-1.341-.317l-2.734-1.366A3 3 0 0 0 6.292 15H5V8h1.292c.86 0 1.705-.245 2.433-.703l1.618-1.018A5.978 5.978 0 0 0 11 3Z" />
                      </svg>
                      {question.thumbs_up}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M19 11.75a1.25 1.25 0 1 0-2.5 0v7.5a1.25 1.25 0 1 0 2.5 0v-7.5ZM9 17v1.3c0 .268-.14.526-.395.607A2 2 0 0 1 6 17c0-.995.182-1.948.514-2.826.204-.54-.166-1.174-.744-1.174h-2.52c-1.243 0-2.261-1.01-2.146-2.247.193-2.08.651-4.082 1.341-5.974C2.847 3.677 3.928 3 5.1 3h3.192a3 3 0 0 1 1.341.317l2.734 1.366A3 3 0 0 0 13.708 5H15v7h-1.292a3 3 0 0 0-2.433.703l-1.618 1.018A5.978 5.978 0 0 0 9 17Z" />
                      </svg>
                      {question.thumbs_down}
                    </span>
                  </div>
                  <button
                    onClick={() => onEditQuestion(question)}
                    className="px-3 py-1 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteQuestion(question.id)}
                    className="px-3 py-1 rounded-lg text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
