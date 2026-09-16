import { ArrowLeft, CheckCircle2, Flag, Trophy, RotateCcw, Swords } from 'lucide-react';
import { Match } from '../types';

export interface MatchCompleteViewProps {
  match: Match;
  isConfirmed?: boolean;
  intent?: 'abandon' | 'endMatch';
  onMarkCompleted: () => void;
  onConfirmTerminalAction?: (action: 'abandon' | 'endMatch') => void;
  onResumeScoring?: () => void;
  onReturnToMatches: () => void;
  onStartSuperOver?: () => void;
}

export default function MatchCompleteView({
  match,
  isConfirmed = true,
  intent = 'endMatch',
  onMarkCompleted,
  onConfirmTerminalAction,
  onResumeScoring,
  onReturnToMatches,
  onStartSuperOver,
}: MatchCompleteViewProps) {
  const isAbandoned = match.status === 'abandoned' || intent === 'abandon';
  const isTied = match.result === 'Match Tied!';
  const result = match.result || (isAbandoned ? 'Match Abandoned' : 'Match Complete');

  return (
    <div className="p-4 space-y-4">
      {/* Unconfirmed Preview Warning / Actions */}
      {!isConfirmed && (
        <div className={`border rounded-2xl p-4 shadow-xs ${
          isAbandoned 
            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200' 
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-bold text-sm flex items-center gap-1.5">
              {isAbandoned ? <Flag size={16} className="text-red-600 dark:text-red-400" /> : <Trophy size={16} className="text-amber-600 dark:text-amber-400" />}
              {isAbandoned ? 'Abandon Match Preview' : 'End Match Preview'}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isAbandoned ? 'bg-red-200 dark:bg-red-900/80 text-red-800 dark:text-red-200' : 'bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
            }`}>
              Pending Confirmation
            </span>
          </div>
          <p className={`text-xs mb-3 leading-relaxed ${isAbandoned ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
            Viewing this summary has not finalized or changed the match status yet. You can resume scoring with everything preserved, or confirm to permanently set the match status.
          </p>
          {onResumeScoring && (
            <button
              onClick={onResumeScoring}
              className={`w-full py-2.5 px-4 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs ${
                isAbandoned 
                  ? 'border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 hover:bg-red-100/50 dark:hover:bg-slate-700' 
                  : 'border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-slate-700'
              }`}
            >
              <RotateCcw size={16} /> Resume Live Scoring (Keep Match Active)
            </button>
          )}
        </div>
      )}

      {/* Main Card */}
      <div className="text-center py-6">
        <div className="text-5xl mb-3">{isAbandoned ? '🏳️' : '🏆'}</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
          {isAbandoned ? 'Match Abandoned' : 'Match Complete'}
        </h2>
        <div className="mt-5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
          <p className={`text-lg font-bold ${isAbandoned ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {result}
          </p>
          {match.venue && (
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-2 font-medium">
              Venue: {match.venue}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isConfirmed && onConfirmTerminalAction ? (
        <div className="space-y-3">
          <button
            onClick={() => onConfirmTerminalAction(intent)}
            className={`w-full py-4 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all text-white ${
              isAbandoned
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <CheckCircle2 size={20} />
            {isAbandoned ? 'Confirm & Abandon Match' : 'Confirm & End Match'}
          </button>
          <button
            onClick={onResumeScoring}
            className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 py-3.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
          >
            Cancel & Return to Scoring
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {onStartSuperOver && (match.result === 'Match Tied!' || (isTied && match.status === 'live')) && (
            <button
              onClick={onStartSuperOver}
              className="w-full py-4 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              <Swords size={20} />
              <span>Start Super Over (1 Over)</span>
            </button>
          )}
          <button
            onClick={onMarkCompleted}
            disabled={match.status === 'completed' || match.status === 'abandoned'}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-500 text-white py-3.5 rounded-xl font-bold shadow-lg transition-colors cursor-pointer"
          >
            {match.status === 'completed' || match.status === 'abandoned'
              ? 'Match Finalized & Stats Synchronized'
              : 'Mark Match Completed & Sync Stats'}
          </button>
          <button
            onClick={onReturnToMatches}
            className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl font-bold text-base shadow-lg cursor-pointer active:scale-[0.99] transition-transform"
          >
            Return to Matches
          </button>
        </div>
      )}
    </div>
  );
}
