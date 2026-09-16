import { ChevronLeft } from 'lucide-react';
import { Match, ScoringSession, Team } from '../types';

export interface ScoringDashboardViewProps {
  match: Match;
  session: ScoringSession;
  battingTeam: Team;
  runRate: string;
  onBack: () => void;
  onScoreRun: (runs: number) => void;
  onWide: () => void;
  onNoBall: () => void;
  onWicket: () => void;
  onRetiredHurt: () => void;
  onSwapStrike: () => void;
  onUndo: () => void;
  onEndMatch: () => void;
  onChangeBowler?: () => void;
}

export default function ScoringDashboardView({
  match,
  session,
  battingTeam,
  runRate,
  onBack,
  onScoreRun,
  onWide,
  onNoBall,
  onWicket,
  onRetiredHurt,
  onSwapStrike,
  onUndo,
  onEndMatch,
  onChangeBowler,
}: ScoringDashboardViewProps) {
  const striker = session.batsmenStats[session.strikerIdx];
  const nonStriker = session.batsmenStats[session.nonStrikerIdx];
  const currentBowler = session.bowlersStats[session.currentBowlerIdx];

  const thisOverBalls = session.ballEvents.filter((b) => b.over === session.currentOver);
  const target = session.isSuperOver
    ? (session.currentInningsNum === 1
        ? ((session.completedInnings[2] || session.completedInnings[session.completedInnings.length - 1])?.totalRuns ?? 0) + 1
        : null)
    : match.target !== undefined
    ? match.target
    : session.currentInningsNum === 1 && session.completedInnings.length > 0
    ? session.completedInnings[0].totalRuns + 1
    : null;

  const remaining = target !== null ? target - session.currentRuns : null;

  const remainingBalls = session.isSuperOver
    ? Math.max(0, 6 - (session.currentOver * 6 + session.currentBall))
    : match.remainingBalls !== undefined
    ? match.remainingBalls
    : session.maxOvers * 6 - (session.currentOver * 6 + session.currentBall);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Back Button Header */}
      <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 text-white px-4 h-14 flex items-center sticky top-0 z-50 shadow-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center px-14 pointer-events-none">
          <h1 className="text-lg font-bold tracking-tight truncate text-center">Live Scoring</h1>
        </div>
      </div>

      {/* Score Display */}
      <div className="bg-linear-to-br from-gray-900 to-gray-800 text-white px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: battingTeam.color }}
              >
                {battingTeam.shortName}
              </span>
              {battingTeam.name}
            </h2>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              {session.isSuperOver ? (
                <span className="bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold text-[10px] tracking-wide animate-pulse">SUPER OVER</span>
              ) : (
                `${session.currentInningsNum === 0 ? '1st Innings' : '2nd Innings'} • ${session.maxOvers} overs`
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {session.currentRuns}
              <span className="text-xl text-gray-400">/{session.currentWickets}</span>
            </div>
            <div className="text-sm text-gray-400">
              ({session.currentOver}.{session.currentBall}) • CRR: {runRate}
            </div>
          </div>
        </div>

        {target && (
          <div className="mt-1.5 bg-white/10 rounded-lg px-3 py-1 flex items-center justify-between text-sm">
            <span className="text-gray-300">Target: {target}</span>
            <span className="text-yellow-300 font-semibold">
              Need {remaining} from {remainingBalls} balls
            </span>
          </div>
        )}

        {/* Current Batsmen */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="bg-white/10 rounded-lg px-3 py-1.5 border border-green-400/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{striker?.playerName || '-'}*</span>
              <span className="text-sm font-bold">
                {striker?.runs || 0} ({striker?.balls || 0})
              </span>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{nonStriker?.playerName || '-'}</span>
              <span className="text-sm font-bold">
                {nonStriker?.runs || 0} ({nonStriker?.balls || 0})
              </span>
            </div>
          </div>
        </div>

        {/* Current Bowler */}
        <div className="mt-1.5 bg-white/10 rounded-lg px-3 py-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{currentBowler?.playerName || '-'}*</span>
            <span className="text-sm font-semibold">
              {currentBowler?.overs || 0}.{currentBowler?.balls || 0}-{currentBowler?.maidens || 0}-
              {currentBowler?.runs || 0}-{currentBowler?.wickets || 0}
            </span>
          </div>
        </div>
      </div>

      {/* This Over */}
      <div className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">This Over:</span>
          <div className="flex gap-1 flex-wrap">
            {thisOverBalls.map((ball, idx) => {
              let displayText = '';
              if (ball.isRetiredHurt) {
                displayText = 'RO';
              } else if (ball.isWicket && ball.isNoBall) {
                displayText = 'NB+W';
              } else if (ball.isWicket) {
                displayText = ball.runs > 0 ? `W+${ball.runs}` : 'W';
              } else if (ball.isNoBall) {
                displayText = ball.runs > 0 ? `NB+${ball.runs}` : 'NB';
              } else if (ball.isWide) {
                displayText = 'WD';
              } else {
                displayText = ball.runs.toString();
              }

              return (
                <span
                  key={idx}
                  className={`min-w-7 h-7 px-2 rounded-full flex items-center justify-center text-xs font-bold whitespace-nowrap ${
                    ball.isRetiredHurt
                      ? 'bg-amber-500 text-white'
                      : ball.isWicket && ball.isNoBall
                      ? 'bg-orange-600 text-white'
                      : ball.isWicket
                      ? 'bg-red-500 text-white'
                      : ball.isWide
                      ? 'bg-yellow-400 text-yellow-900'
                      : ball.isNoBall
                      ? 'bg-orange-400 text-white'
                      : ball.runs === 6
                      ? 'bg-purple-500 text-white'
                      : ball.runs === 4
                      ? 'bg-blue-500 text-white'
                      : ball.runs === 0
                      ? 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                      : 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300'
                  }`}
                >
                  {displayText}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scoring Buttons */}
      <div className="p-4 space-y-4">
        {/* Run Buttons */}
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-2">Runs</div>
          <div className="grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((runs) => (
              <button
                key={runs}
                onClick={() => onScoreRun(runs)}
                className={`py-3 rounded-xl font-bold text-lg shadow-sm active:scale-95 transition-transform cursor-pointer ${
                  runs === 4
                    ? 'bg-blue-500 text-white'
                    : runs === 6
                    ? 'bg-purple-500 text-white'
                    : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                {runs}
              </button>
            ))}
          </div>
        </div>

        {/* Extras */}
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-2">Extras</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onWide}
              className="py-3 rounded-xl font-semibold bg-yellow-50 dark:bg-amber-950/90 text-yellow-700 dark:text-amber-300 border border-yellow-200 dark:border-amber-900/60 hover:bg-yellow-100 dark:hover:bg-amber-900/60 active:scale-95 transition-transform cursor-pointer"
            >
              Wide
            </button>
            <button
              onClick={onNoBall}
              className="py-3 rounded-xl font-semibold bg-orange-50 dark:bg-orange-950/90 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/60 hover:bg-orange-100 dark:hover:bg-orange-900/60 active:scale-95 transition-transform cursor-pointer"
            >
              No Ball
            </button>
          </div>
        </div>

        {/* Wicket & Retired Out side-by-side */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onWicket}
            className="py-3.5 rounded-xl font-bold text-base bg-red-500 hover:bg-red-600 text-white shadow-lg active:scale-95 transition-transform cursor-pointer"
          >
            WICKET
          </button>
          <button
            onClick={onRetiredHurt}
            className="py-3.5 rounded-xl font-bold text-base bg-amber-500 hover:bg-amber-600 text-white shadow-lg active:scale-95 transition-transform cursor-pointer"
          >
            🏥 Retired Out
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSwapStrike}
            className="py-2.5 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-transform cursor-pointer"
          >
            🔄 Swap
          </button>
          {onChangeBowler && (
            <button
              onClick={onChangeBowler}
              className="py-2.5 rounded-xl font-semibold text-sm bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 transition-transform cursor-pointer"
            >
              🎯 Change Bowler
            </button>
          )}
          <button
            onClick={onUndo}
            disabled={session.ballEvents.length === 0}
            className="py-2.5 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
          >
            ↩ Undo
          </button>
          <button
            onClick={onEndMatch}
            className="py-2.5 rounded-xl font-semibold text-sm bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/60 active:scale-95 transition-transform cursor-pointer"
          >
            End
          </button>
        </div>
      </div>

      {/* Live Commentary Feed (Below all buttons with scrollable feed) */}
      {session.ballEvents.length > 0 && (() => {
        const currentOverEvents = session.ballEvents.filter(b => b.over === session.currentOver);
        if (currentOverEvents.length === 0) return null;

        return (
          <div className="bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 px-4 py-3 mt-auto">
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-2">Over {session.currentOver + 1} Commentary</div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {[...currentOverEvents]
                .reverse()
                .map((ball, idx) => {
                  const label = ball.ballLabel || `${ball.over}.${ball.ball + 1}`;
                  const isCompoundNbW = ball.isNoBall && ball.isWicket;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 text-xs rounded-lg px-2.5 py-1.5 ${
                        isCompoundNbW
                          ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60'
                          : ball.isWicket
                          ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60'
                          : ball.isWide
                          ? 'bg-yellow-50 dark:bg-amber-950/40 border border-yellow-100 dark:border-amber-900/60'
                          : ball.isNoBall
                          ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/60'
                          : ball.isRetiredHurt
                          ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60'
                          : ball.runs >= 4
                          ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60'
                          : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <span
                        className={`shrink-0 font-bold tabular-nums ${
                          isCompoundNbW
                            ? 'text-orange-600 dark:text-orange-400'
                            : ball.isWicket
                            ? 'text-red-600 dark:text-red-400'
                            : ball.isWide
                            ? 'text-yellow-700 dark:text-amber-400'
                            : ball.isNoBall
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        {label}
                      </span>
                      <span className="text-gray-700 dark:text-slate-200 leading-tight">{ball.commentary}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
