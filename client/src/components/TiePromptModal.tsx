import React from 'react';
import { Match, ScoringSession } from '../types';
import { Trophy, Swords, CheckCircle2 } from 'lucide-react';

interface TiePromptModalProps {
  isOpen: boolean;
  match: Match;
  session: ScoringSession;
  onStartSuperOver: () => void;
  onDeclineSuperOver: () => void;
}

export default function TiePromptModal({
  isOpen,
  match,
  session,
  onStartSuperOver,
  onDeclineSuperOver,
}: TiePromptModalProps) {
  if (!isOpen) return null;

  const firstInnings = session.completedInnings[0];
  const firstInningsRuns = firstInnings ? firstInnings.totalRuns : session.currentRuns;
  const secondInningsRuns = session.currentRuns;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 transform transition-all animate-scale-up">
        {/* Header Header */}
        <div className="bg-linear-to-r from-amber-500 via-orange-500 to-red-600 text-white p-6 text-center relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-20 text-white">
            <Trophy size={100} />
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <Swords size={28} className="text-white animate-bounce" />
          </div>
          <h2 className="text-2xl font-black tracking-tight uppercase">MATCH TIED!</h2>
          <p className="text-amber-100 text-xs font-semibold mt-1">Both teams finished level at {secondInningsRuns} runs!</p>
        </div>

        {/* Scores Summary */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-slate-800/80 rounded-xl p-4 border border-gray-200 dark:border-slate-700 divide-y divide-gray-200 dark:divide-slate-700">
            <div className="flex items-center justify-between pb-2.5">
              <span className="font-semibold text-gray-800 dark:text-slate-200">{match.team1.name}</span>
              <span className="font-bold text-gray-900 dark:text-slate-100">{session.completedInnings[0]?.totalRuns ?? session.currentRuns} runs</span>
            </div>
            <div className="flex items-center justify-between pt-2.5">
              <span className="font-semibold text-gray-800 dark:text-slate-200">{match.team2.name}</span>
              <span className="font-bold text-gray-900 dark:text-slate-100">{session.currentRuns} runs</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-slate-300 text-center font-medium">
            Would you like to decide the winner with a 1-Over Super Over or finish the match as a Tie?
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={onStartSuperOver}
              className="w-full py-3.5 px-4 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <Swords size={20} />
              <span>Start Super Over (1 Over)</span>
            </button>

            <button
              onClick={onDeclineSuperOver}
              className="w-full py-3 px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <CheckCircle2 size={18} />
              <span>End Match as Tied</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
