import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Match, ScoringSession, Team } from '../types';

export interface InningsBreakViewProps {
  match: Match;
  session: ScoringSession;
  bowlingTeam: Team;
  isConfirmed?: boolean;
  onStartSecondInnings: () => void;
  onConfirmInningsBreak?: () => void;
  onResumeScoring?: () => void;
  onBack: () => void;
}

export default function InningsBreakView({
  match,
  session,
  bowlingTeam,
  isConfirmed = true,
  onStartSecondInnings,
  onConfirmInningsBreak,
  onResumeScoring,
  onBack,
}: InningsBreakViewProps) {
  const isSuperOver = session.isSuperOver;

  // In Super Over, completedInnings has regular 1st, regular 2nd, and Super Over 1st innings (idx 2)
  const superOver1stInnings = isSuperOver
    ? (session.completedInnings[2] || session.completedInnings[session.completedInnings.length - 1])
    : null;

  const firstInningsData = isSuperOver
    ? (superOver1stInnings || { totalRuns: session.currentRuns, totalWickets: session.currentWickets, totalOvers: session.currentOver, totalBalls: session.currentBall })
    : (session.completedInnings[0] || { totalRuns: session.currentRuns, totalWickets: session.currentWickets, totalOvers: session.currentOver, totalBalls: session.currentBall });

  // Determine team names
  let firstInningsTeamName = bowlingTeam.name;
  let secondBattingTeamName = '';

  if (isSuperOver) {
    const superOver1stBattingTeamId = session.superOver1stBattingTeamId || match.team2.id;
    const superOver1stBattingTeam = superOver1stBattingTeamId === match.team1.id ? match.team1 : match.team2;
    const superOver2ndBattingTeam = superOver1stBattingTeamId === match.team1.id ? match.team2 : match.team1;
    firstInningsTeamName = `${superOver1stBattingTeam.name} Super Over`;
    secondBattingTeamName = superOver2ndBattingTeam.name;
  } else {
    const firstInningsBattingTeamId = session.firstInningsBattingTeamId || match.team1.id;
    const secondBattingTeam = firstInningsBattingTeamId === match.team1.id ? match.team2 : match.team1;
    firstInningsTeamName = `${bowlingTeam.name} 1st Innings`;
    secondBattingTeamName = secondBattingTeam.name;
  }

  const firstInningsRuns = firstInningsData.totalRuns ?? 0;
  const firstInningsWickets = firstInningsData.totalWickets ?? 0;
  const firstInningsOvers = firstInningsData.totalOvers ?? 0;
  const firstInningsBalls = firstInningsData.totalBalls ?? 0;
  const targetRuns = firstInningsRuns + 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 text-white px-4 h-14 flex items-center sticky top-0 z-40 shadow-md">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 active:bg-white/20 rounded-full transition-colors z-10 shrink-0"
          title="Back to Matches"
          aria-label="Back to Matches"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center px-14 pointer-events-none">
          <h2 className="text-lg font-bold tracking-tight truncate text-center">Live Scoring</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Unconfirmed Preview Warning / Actions */}
        {!isConfirmed && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-bold text-sm flex items-center gap-1.5">
                ⏸️ Innings Break Preview
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
                Pending Confirmation
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3 leading-relaxed">
              Reviewing the innings summary does not end the 1st innings yet. You can resume scoring with full state preserved or confirm to end the innings.
            </p>
            {onResumeScoring && (
              <button
                onClick={onResumeScoring}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/50 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <ArrowLeft size={16} /> Resume Live Scoring (Keep 1st Innings)
              </button>
            )}
          </div>
        )}

        <div className="text-center py-6">
          <div className="text-5xl mb-3">🏏</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{isSuperOver ? 'Super Over Innings Break' : 'Innings Break'}</h2>
          <div className="mt-5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
            <div className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-1">{firstInningsTeamName}</div>
            <div className="text-4xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
              {firstInningsRuns}/{firstInningsWickets}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              ({firstInningsOvers}.{firstInningsBalls} overs)
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{secondBattingTeamName} TARGET</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {targetRuns} runs to win
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isConfirmed && onConfirmInningsBreak ? (
          <div className="space-y-3">
            <button
              onClick={onConfirmInningsBreak}
              className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-transform"
            >
              Confirm End 1st Innings & Start 2nd <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={onStartSecondInnings}
            className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-transform"
          >
            Start 2nd Innings <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
