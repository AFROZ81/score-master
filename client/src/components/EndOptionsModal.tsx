import React from 'react';
import { Flag, ArrowRightCircle, Trophy, X } from 'lucide-react';

export interface EndOptionsModalProps {
  isOpen: boolean;
  currentInningsNum: number; // 0 for 1st innings, 1 for 2nd innings
  onClose: () => void;
  onSelectOption: (option: 'abandon' | 'endInnings' | 'endMatch') => void;
}

export default function EndOptionsModal({
  isOpen,
  currentInningsNum,
  onClose,
  onSelectOption,
}: EndOptionsModalProps) {
  if (!isOpen) return null;

  const isFirstInnings = currentInningsNum === 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative transform transition-all animate-scale-in border border-gray-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Flag className="w-7 h-7 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-1">Match Options</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {isFirstInnings
              ? 'First innings is currently underway'
              : 'Second innings is currently underway'}
          </p>
        </div>

        <div className="space-y-3">
          {/* Option 1: Abandon Match (always available) */}
          <button
            onClick={() => onSelectOption('abandon')}
            className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-red-100 dark:bg-red-900/60 group-hover:bg-red-200 dark:group-hover:bg-red-800/80 rounded-xl text-red-600 dark:text-red-300 transition-colors">
                <Flag size={18} />
              </span>
              <div className="text-left">
                <div className="font-bold">Abandon Match</div>
                <div className="text-[11px] text-red-500 dark:text-red-400">Call off match without a winner</div>
              </div>
            </div>
            <span className="text-red-400 dark:text-red-400 group-hover:translate-x-0.5 transition-transform">→</span>
          </button>

          {/* Option 2: End Innings (Innings 1) OR End Match (Innings 2) */}
          {isFirstInnings ? (
            <button
              onClick={() => onSelectOption('endInnings')}
              className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-100 dark:bg-blue-900/60 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/80 rounded-xl text-blue-600 dark:text-blue-300 transition-colors">
                  <ArrowRightCircle size={18} />
                </span>
                <div className="text-left">
                  <div className="font-bold">End Innings</div>
                  <div className="text-[11px] text-blue-500 dark:text-blue-400">Conclude 1st innings & calculate target</div>
                </div>
              </div>
              <span className="text-blue-400 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          ) : (
            <button
              onClick={() => onSelectOption('endMatch')}
              className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-900/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900/60 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 bg-green-100 dark:bg-green-900/60 group-hover:bg-green-200 dark:group-hover:bg-green-800/80 rounded-xl text-green-600 dark:text-green-300 transition-colors">
                  <Trophy size={18} />
                </span>
                <div className="text-left">
                  <div className="font-bold">End Match</div>
                  <div className="text-[11px] text-green-500 dark:text-green-400">Conclude match & declare result</div>
                </div>
              </div>
              <span className="text-green-400 dark:text-green-400 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl font-medium text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
