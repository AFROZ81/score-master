import { Innings } from '../types';

interface CommentaryProps {
  innings: Innings;
}

export default function Commentary({ innings }: CommentaryProps) {
  const isSuperOver = innings.isSuperOver;
  const effectiveRuns = (ball: any) => {
    const penalty = (ball.isWide || ball.isNoBall) && !innings.extraRunsCounted ? 1 : 0;
    return Math.max(0, (ball.runs || 0) - penalty);
  };
  const getOverSummary = (overNum: number) => {
    const balls = innings.ballByBall.filter(b => b.over === overNum);
    return balls.map(b => {
      if (b.isRetiredHurt) return 'RO'; // Retired out
      if (b.isNoBall) {
        // Keep the bubble as the delivery type; wicket and bat runs are in commentary.
        return 'NB';
      }
      if (b.isWicket) {
        // For run-out, show runs if any
        if (b.dismissalType === 'run-out' && effectiveRuns(b) > 0) {
          return `W+${effectiveRuns(b)}`;
        }
        return 'W';
      }
      if (b.isWide) return 'WD';
      return effectiveRuns(b).toString();
    });
  };

  const overs = [...new Set(innings.ballByBall.map(b => b.over))].reverse();

  // Calculate cumulative score at each ball
  const getCumulativeScore = (ballIndex: number) => {
    let runs = 0;
    let wickets = 0;
    for (let i = 0; i <= ballIndex; i++) {
      const ball = innings.ballByBall[i];
      if (ball.isWicket) {
        wickets++;
      } else {
        runs += effectiveRuns(ball) + ((ball.isWide || ball.isNoBall) && innings.extraRunsCounted ? 1 : 0);
      }
    }
    return { runs, wickets };
  };

  return (
    <div className="p-4 space-y-3">
      {isSuperOver && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white font-black px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between text-xs tracking-wider uppercase">
          <span className="flex items-center gap-1.5">⚡ SUPER OVER INNINGS</span>
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">1 OVER MATCH</span>
        </div>
      )}

      {/* Over Summaries */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-800 transition-colors">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3 text-sm flex items-center justify-between">
          <span>{isSuperOver ? '⚡ Super Over Summary' : 'Over Summary'}</span>
        </h3>
        <div className="space-y-3">
          {overs.map(overNum => {
            const summary = getOverSummary(overNum);
            const overBalls = innings.ballByBall.filter(b => b.over === overNum);
            const bowler = overBalls[0]?.bowler || '';
            const overRuns = overBalls.reduce((sum, b) => sum + effectiveRuns(b) + ((b.isWide || b.isNoBall) && innings.extraRunsCounted ? 1 : 0), 0);
            const hasWicket = overBalls.some(b => b.isWicket);
            const legalBalls = overBalls.filter(b => !b.isWide && !b.isNoBall && !b.isRetiredHurt).length;

            return (
              <div key={overNum} className="border-b border-gray-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                {/* Over Header with Bowler Info */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                      Over {overNum + 1}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">•</span>
                    <span className="text-xs text-gray-600 dark:text-slate-300 font-medium">{bowler}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-slate-400">{legalBalls} balls</span>
                    <span className={`text-sm font-bold ${hasWicket ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-slate-200'}`}>
                      {overRuns} {hasWicket && <span className="text-xs">/ W</span>}
                    </span>
                  </div>
                </div>

                {/* Ball Circles */}
                <div className="flex gap-1.5 flex-wrap">
                  {summary.map((ball, idx) => (
                    <span
                      key={idx}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${ball === 'RH'
                          ? 'bg-amber-500 text-white'
                          : ball === 'W'
                            ? 'bg-red-500 text-white'
                            : ball.startsWith('W+')
                              ? 'bg-red-500 text-white'
                              : ball === '6'
                                ? 'bg-purple-500 text-white'
                                : ball === '4'
                                  ? 'bg-blue-500 text-white'
                                  : ball === 'WD'
                                    ? 'bg-yellow-400 text-yellow-900'
                                    : ball === 'NB'
                                      ? 'bg-yellow-400 text-yellow-900'
                                      : ball.startsWith('NB+')
                                        ? 'bg-yellow-400 text-yellow-900'
                                        : ball === '0'
                                          ? 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                                          : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                        }`}
                    >
                      {ball}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Commentary */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="bg-linear-to-r from-gray-700 to-gray-800 px-4 py-2">
          <h3 className="text-white font-semibold text-sm">Commentary</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {[...innings.ballByBall].reverse().map((ball, idx) => {
            const actualIndex = innings.ballByBall.length - 1 - idx;
            const score = getCumulativeScore(actualIndex);

            return (
              <div
                key={idx}
                className={`px-4 py-3 ${ball.isWicket ? 'bg-red-50 dark:bg-red-950/20' : ball.isRetiredHurt ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Ball Indicator */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${ball.isRetiredHurt
                        ? 'bg-amber-500 text-white'
                        : ball.isWicket
                          ? 'bg-red-500 text-white'
                          : ball.runs === 6
                            ? 'bg-purple-500 text-white'
                            : ball.runs === 4
                              ? 'bg-blue-500 text-white'
                              : ball.isWide || ball.isNoBall
                                ? 'bg-yellow-400 text-yellow-900'
                                : ball.runs === 0
                                  ? 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                                  : 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300'
                      }`}
                  >
                    {ball.isRetiredHurt ? 'RO' : ball.isWicket ? 'W' : effectiveRuns(ball)}
                  </div>

                  {/* Ball Details */}
                  <div className="flex-1">
                    {/* Over and Score Info */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">
                        {ball.over}.{ball.ball + 1}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">•</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                        {score.runs}/{score.wickets}
                      </span>
                    </div>

                    {/* Batsman and Bowler Info */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-600 dark:text-slate-400">
                        <span className="font-semibold text-gray-800 dark:text-slate-200">{ball.bowler}</span> to{' '}
                        <span className="font-semibold text-gray-800 dark:text-slate-200">{ball.batsman}</span>
                      </span>
                    </div>

                    {/* Commentary */}
                    <p className={`text-sm ${ball.isWicket ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-gray-800 dark:text-slate-100'}`}>
                      {ball.commentary}
                    </p>

                    {/* Extra Info for Wides/No Balls */}
                    {(ball.isWide || ball.isNoBall) && innings.extraRunsCounted && (
                      <p className="text-xs text-yellow-700 dark:text-amber-400 mt-1 font-medium">
                        {ball.isWide ? 'Wide ball' : 'No ball'} - 1 extra
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
