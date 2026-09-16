import { Match } from '../types';

interface MatchCardProps {
  match: Match;
  onSelect: (matchId: string) => void;
}

export default function MatchCard({ match, onSelect }: MatchCardProps) {
  // Defensive check for incomplete match data
  if (!match || !match.team1 || !match.team2 || !match.team1.id || !match.team2.id) {
    console.warn('MatchCard: Invalid match data', match);
    return null;
  }

  // Determine which team batted first based on toss
  const getFirstBattingTeam = () => {
    if (!match.tossWinner) return match.team1;
    if (match.tossDecision === 'bat') {
      return match.team1.id === match.tossWinner ? match.team1 : match.team2;
    } else {
      return match.team1.id === match.tossWinner ? match.team2 : match.team1;
    }
  };

  const firstBattingTeam = getFirstBattingTeam();
  const secondBattingTeam = firstBattingTeam.id === match.team1.id ? match.team2 : match.team1;

  // Parse result to determine winner and margin
  const parseResult = () => {
    if (!match.result) return null;

    const result = match.result;

    // Check for "won by X wickets"
    const wicketsMatch = result.match(/(.+?) won by (\d+) wicket/);
    if (wicketsMatch) {
      const winnerName = wicketsMatch[1].trim();
      const wickets = parseInt(wicketsMatch[2]);
      const winner = match.team1.name === winnerName ? match.team1 : match.team2;
      return { type: 'wickets', winner, margin: wickets };
    }

    // Check for "won by X runs"
    const runsMatch = result.match(/(.+?) won by (\d+) run/);
    if (runsMatch) {
      const winnerName = runsMatch[1].trim();
      const runs = parseInt(runsMatch[2]);
      const winner = match.team1.name === winnerName ? match.team1 : match.team2;
      return { type: 'runs', winner, margin: runs };
    }

    // Check for "Match Tied!"
    if (result.includes('Tied')) {
      return { type: 'tied', winner: null, margin: 0 };
    }

    return null;
  };

  const resultInfo = parseResult();

  const getInningsDisplayForTeam = (teamId: string) => {
    if (!match.innings || match.innings.length === 0) return null;

    const innings = match.innings.find(inn => inn && inn.battingTeamId === teamId);
    if (!innings || !innings.battingTeamId) return null;

    const battingTeam = match.team1.id === innings.battingTeamId ? match.team1 : match.team2;
    if (!battingTeam || !battingTeam.id) return null;

    return {
      team: battingTeam,
      score: `${innings.totalRuns || 0}/${innings.totalWickets || 0}`,
      overs: `(${innings.totalOvers || 0}.${innings.totalBalls || 0} ov)`,
    };
  };

  const innings1 = getInningsDisplayForTeam(firstBattingTeam.id);
  const innings2 = getInningsDisplayForTeam(secondBattingTeam.id);

  const statusBadge = () => {
    if (match.status === 'live') {
      return (
        <span className="flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
          LIVE
        </span>
      );
    }
    if (match.status === 'upcoming') {
      return (
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
          Upcoming
        </span>
      );
    }
    if (match.status === 'abandoned') {
      return (
        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-semibold">
          Abandoned
        </span>
      );
    }
    // Don't show "Completed" badge if we have a result - the result will be shown instead
    if (match.status === 'completed' && !match.result) {
      return (
        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
          Completed
        </span>
      );
    }
    return null;
  };

  // Determine which team is currently batting (for live matches)
  const currentBattingTeamId = match.innings.length > 0
    ? match.innings[match.innings.length - 1].battingTeamId
    : null;

  return (
    <div
      onClick={() => onSelect(match.id)}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-100 dark:border-slate-800 p-4 mb-3 cursor-pointer hover:shadow-lg dark:hover:border-slate-700 transition-all active:scale-[0.98]"
    >
      {/* Match Info Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">{match.format} • {match.venue}</span>
        {statusBadge()}
      </div>

      {/* Teams and Scores */}
      <div className="space-y-2">
        {/* First Batting Team Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
              style={{ backgroundColor: firstBattingTeam.color }}
            >
              {firstBattingTeam.shortName}
            </div>
            <div className="font-semibold text-gray-800 dark:text-slate-100">{firstBattingTeam.name}</div>
            {match.status === 'live' && currentBattingTeamId === firstBattingTeam.id && (
              <span className="text-xs text-red-500 font-medium">🏏</span>
            )}
          </div>
          <div className="text-right">
            {innings1 ? (
              <>
                <span className="font-bold text-gray-900 dark:text-slate-100">{innings1.score}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400 ml-1">{innings1.overs}</span>
              </>
            ) : (
              <span className="text-sm text-gray-400 dark:text-slate-500">Yet to bat</span>
            )}
          </div>
        </div>

        {/* Second Batting Team Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
              style={{ backgroundColor: secondBattingTeam.color }}
            >
              {secondBattingTeam.shortName}
            </div>
            <div className="font-semibold text-gray-800 dark:text-slate-100">{secondBattingTeam.name}</div>
            {match.status === 'live' && currentBattingTeamId === secondBattingTeam.id && (
              <span className="text-xs text-red-500 font-medium">🏏</span>
            )}
          </div>
          <div className="text-right">
            {innings2 ? (
              <>
                <span className="font-bold text-gray-900 dark:text-slate-100">{innings2.score}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400 ml-1">{innings2.overs}</span>
              </>
            ) : (
              <span className="text-sm text-gray-400 dark:text-slate-500">Yet to bat</span>
            )}
          </div>
        </div>
      </div>

      {/* Result / Status */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
        {match.status === 'live' && match.liveState?.isSuperOver ? (
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold animate-pulse">SUPER OVER</span>
            <span className="text-xs font-bold text-amber-700">Match tied - Super Over in progress</span>
          </div>
        ) : match.result ? (
          <div className="space-y-1">
            {resultInfo && resultInfo.type === 'wickets' && resultInfo.winner && (
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: resultInfo.winner.color }}
                >
                  ✓
                </div>
                <span className="text-sm font-bold text-green-600">
                  {resultInfo.winner.name} won by {resultInfo.margin} {resultInfo.margin === 1 ? 'wicket' : 'wickets'}
                </span>
              </div>
            )}
            {resultInfo && resultInfo.type === 'runs' && resultInfo.winner && (
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: resultInfo.winner.color }}
                >
                  ✓
                </div>
                <span className="text-sm font-bold text-green-600">
                  {resultInfo.winner.name} won by {resultInfo.margin} {resultInfo.margin === 1 ? 'run' : 'runs'}
                </span>
              </div>
            )}
            {resultInfo && resultInfo.type === 'tied' && (
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>
                <span className="text-sm font-bold text-blue-600">Match Tied!</span>
              </div>
            )}
            {!resultInfo && (
              <div className="flex items-center gap-2">
                {match.result.includes('Super Over') && (
                  <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">SUPER OVER</span>
                )}
                <span className={`text-sm font-semibold ${match.status === 'abandoned' ? 'text-amber-700' : 'text-green-600'}`}>
                  {match.result}
                </span>
              </div>
            )}
          </div>
        ) : null}
        {match.tossWinner && !match.result && !(match.status === 'live' && match.liveState?.isSuperOver) && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="bg-linear-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-1.5 py-0.5 rounded font-bold">
              {match.tossCoinResult === 'heads' ? '👑' : '🏏'}
            </span>
            <span>
              {match.team1.id === match.tossWinner ? match.team1.shortName : match.team2.shortName} won toss, elected to {match.tossDecision}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
