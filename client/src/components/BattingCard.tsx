import { Innings, Team } from '../types';

interface BattingCardProps {
  innings: Innings;
  team: Team;
  crr?: string;
  rrr?: string | null;
}

export default function BattingCard({ innings, team, crr, rrr }: BattingCardProps) {
  // Check if innings is completed (all out or overs complete)
  const isInningsComplete = innings.currentBatsmen.length === 0 ||
    innings.currentBatsmen[0] === '' ||
    innings.currentBatsmen[1] === '';

  // Calculate batting order based on when batsmen first appeared
  const getBattingOrder = (playerId: string): number => {
    // Find the first ball event where this player was batting
    for (let i = 0; i < innings.ballByBall.length; i++) {
      const ball = innings.ballByBall[i];
      if (ball.strikerIdx !== undefined) {
        // Get the batsman stats to find the player ID
        const strikerStat = innings.battingStats[ball.strikerIdx];
        if (strikerStat && strikerStat.playerId === playerId) {
          return i;
        }
      }
      if (ball.nonStrikerIdx !== undefined) {
        const nonStrikerStat = innings.battingStats[ball.nonStrikerIdx];
        if (nonStrikerStat && nonStrikerStat.playerId === playerId) {
          return i;
        }
      }
    }
    return Infinity; // If not found, put at the end
  };

  // Calculate batsmen who have batted vs yet to bat
  const batsmenWhoBatted = innings.battingStats
    .filter(stat => {
      const isCurrentBatsman = stat.playerId === innings.currentBatsmen[0] || stat.playerId === innings.currentBatsmen[1];
      return stat.hasBatted || stat.balls > 0 || stat.isOut || isCurrentBatsman;
    })
    .sort((a, b) => {
      const currentOrder = (id: string) => {
        const index = innings.currentBatsmen.indexOf(id);
        return index >= 0 ? index - 100000 : 0;
      };
      const currentDiff = currentOrder(a.playerId) - currentOrder(b.playerId);
      if (currentDiff !== 0) return currentDiff;
      // Sort by batting order (when they first came to bat)
      const orderA = getBattingOrder(a.playerId);
      const orderB = getBattingOrder(b.playerId);
      return orderA - orderB;
    });

  // Only show "Yet to bat" if innings is still ongoing (not all out)
  const yetToBat = isInningsComplete ? [] : innings.battingStats.filter(stat => {
    const isCurrentBatsman = stat.playerId === innings.currentBatsmen[0] || stat.playerId === innings.currentBatsmen[1];
    const hasBatted = stat.hasBatted || stat.balls > 0 || stat.isOut;
    return !isCurrentBatsman && !hasBatted;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-white/20"
            >
              {team.shortName}
            </div>
            <h3 className="text-white font-bold">{team.name}</h3>
          </div>
          <div className="text-right text-white">
            <span className="text-lg font-bold">{innings.totalRuns}/{innings.totalWickets}</span>
            <span className="text-sm ml-1 opacity-80">({innings.totalOvers}.{innings.totalBalls || 0})</span>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-gray-50 dark:bg-slate-800/80 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
        <div className="col-span-5">Batter</div>
        <div className="col-span-1 text-center">R</div>
        <div className="col-span-1 text-center">B</div>
        <div className="col-span-1 text-center">4s</div>
        <div className="col-span-1 text-center">6s</div>
        <div className="col-span-3 text-center">SR</div>
      </div>

      {/* Batting Stats */}
      <div className="divide-y divide-gray-100 dark:divide-slate-800">
        {batsmenWhoBatted.map((stat, idx) => {
          const isNotOut = !stat.isOut;
          const isRetiredHurt = stat.isRetiredHurt;
          const isStandardOut = stat.isOut && !isRetiredHurt;

          let dismissalText = '';
          if (stat.dismissal && !isRetiredHurt) {
            dismissalText = stat.dismissal;
            if (stat.dismissalType === 'caught' || dismissalText.startsWith('c ')) {
              const match = dismissalText.match(/^c\s+(.+)\s+b\s+(.+)$/i);
              if (match && match[1].trim().toLowerCase() === match[2].trim().toLowerCase()) {
                dismissalText = `c & b ${match[2].trim()}`;
              }
            }
          }

          return (
            <div
              key={idx}
              className={`px-4 py-2.5 ${
                isRetiredHurt ? 'bg-amber-50 dark:bg-amber-950/20 border-l-4 border-l-amber-500' :
                isNotOut ? 'bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500' : ''
              }`}
            >
              {/* Row 1: Player Name & Stats */}
              <div className="grid grid-cols-12 gap-1 items-center">
                <div className="col-span-5 flex items-center gap-1 min-w-0">
                  <span className={`text-sm font-medium truncate ${
                    isRetiredHurt ? 'text-amber-700 dark:text-amber-400' :
                    isNotOut ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-slate-100'
                  }`}>
                    {stat.playerName}
                  </span>
                  {stat.isCaptain && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold shrink-0">(c)</span>
                  )}
                </div>
                <div className="col-span-1 text-center font-bold text-gray-900 dark:text-slate-100">{stat.runs}</div>
                <div className="col-span-1 text-center text-gray-600 dark:text-slate-400">{stat.balls}</div>
                <div className="col-span-1 text-center text-gray-600 dark:text-slate-400">{stat.fours}</div>
                <div className="col-span-1 text-center text-gray-600 dark:text-slate-400">{stat.sixes}</div>
                <div className="col-span-3 text-center text-gray-600 dark:text-slate-400">{stat.strikeRate.toFixed(2)}</div>
              </div>

              {/* Row 2: Status / Dismissal details */}
              {isNotOut && !isRetiredHurt && (
                <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5 leading-snug">
                  not out
                </div>
              )}
              {isRetiredHurt && (
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5 leading-snug">
                  retired out
                </div>
              )}
              {isStandardOut && dismissalText && (
                <div className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                  {dismissalText}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Yet to Bat */}
      {yetToBat.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-slate-400">
            <span className="font-semibold text-gray-700 dark:text-slate-300">Yet to bat: </span>
            <span className="text-gray-600 dark:text-slate-400">{yetToBat.map(stat => stat.playerName).join(', ')}</span>
          </div>
        </div>
      )}

      {/* Extras */}
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-gray-700 dark:text-slate-300">Extras</span>
          <span className="text-gray-600 dark:text-slate-400">
            {innings.extras} (
            b {innings.extrasBreakdown?.byes || 0},
            lb {innings.extrasBreakdown?.legByes || 0},
            wd {innings.extrasBreakdown?.wides || 0},
            nb {innings.extrasBreakdown?.noBalls || 0}
            )
          </span>
        </div>
      </div>

      {/* CRR and RRR */}
      {(crr || rrr) && (
        <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-t border-blue-100 dark:border-blue-900/50">
          <div className="flex justify-around text-sm">
            {crr && (
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-slate-400">CRR</div>
                <div className="font-semibold text-gray-800 dark:text-slate-200">{crr}</div>
              </div>
            )}
            {rrr && (
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-slate-400">RRR</div>
                <div className="font-semibold text-gray-800 dark:text-slate-200">{rrr}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
