import { useState } from 'react';

interface RunsScoredModalProps {
  title: string;
  subtitle: string;
  allowedRuns?: number[];
  onConfirm: (runs: number) => void;
  onCancel: () => void;
  onBack?: () => void;
}

export default function RunsScoredModal({
  title,
  subtitle,
  allowedRuns = [0, 1, 2, 3, 4, 5, 6],
  onConfirm,
  onCancel,
  onBack,
}: RunsScoredModalProps) {
  const [selectedRuns, setSelectedRuns] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-slate-800">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/60 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🏃</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">{subtitle}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {allowedRuns.map((runs) => (
            <button
              key={runs}
              onClick={() => setSelectedRuns(runs)}
              className={`py-3 rounded-xl font-bold text-lg transition-all cursor-pointer ${
                selectedRuns === runs
                  ? 'bg-orange-500 text-white scale-105'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {runs}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-semibold text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-transform cursor-pointer"
          >
            Cancel
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-xl font-semibold text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 active:scale-95 transition-transform flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>←</span> Back
            </button>
          )}
          <button
            onClick={() => onConfirm(selectedRuns)}
            className="flex-1 py-3 rounded-xl font-semibold text-xs bg-orange-500 text-white active:scale-95 transition-transform cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
