import { Innings, Team } from '../types';

interface BowlingCardProps {
  innings: Innings;
  team: Team;
}

export default function BowlingCard({ innings, team }: BowlingCardProps) {
  // Use pre-calculated economy from backend
  const getEconomy = (stat: typeof innings.bowlingStats[0]) => {
    if (stat.economy !== undefined && stat.economy !== null) return stat.economy;
    const totalBalls = stat.overs * 6 + stat.balls;
    if (totalBalls === 0) return 0;
    return (stat.runs / totalBalls) * 6;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
      {/* Header */}
      <div className="bg-linear-to-r from-red-600 to-red-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-white/20">
            {team.shortName}
          </div>
          <h3 className="text-white font-bold">{team.name}</h3>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-9 gap-1 px-4 py-2 bg-gray-50 dark:bg-slate-800/80 text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">
        <div className="col-span-3 text-left">Bowler</div>
        <div className="col-span-1 text-center">O</div>
        <div className="col-span-1 text-center">M</div>
        <div className="col-span-1 text-center">R</div>
        <div className="col-span-1 text-center">W</div>
        <div className="col-span-1 text-center">WD/NB</div>
        <div className="col-span-1 text-center">E</div>
      </div>

      {/* Bowling Stats */}
      <div className="divide-y divide-gray-100 dark:divide-slate-800">
        {innings.bowlingStats
          .filter(stat => stat.overs > 0 || stat.balls > 0)
          .sort((a, b) => {
            const aCurrent = a.playerId === innings.currentBowler ? 0 : 1;
            const bCurrent = b.playerId === innings.currentBowler ? 0 : 1;
            return aCurrent - bCurrent;
          })
          .map((stat, idx) => {
            const economy = getEconomy(stat);
            const isCurrentBowler = stat.playerId === innings.currentBowler;

            return (
              <div
                key={idx}
                className={`grid grid-cols-9 gap-1 px-4 py-2.5 items-center ${
                  isCurrentBowler ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="col-span-3">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-medium ${
                      isCurrentBowler ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-slate-100'
                    }`}>
                      {stat.playerName}
                    </span>
                    {stat.isCaptain && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">(c)</span>
                    )}
                    {isCurrentBowler && (
                      <span className="text-xs text-red-500 font-medium">*</span>
                    )}
                  </div>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs text-gray-700 dark:text-slate-300">
                    {stat.overs}{stat.balls > 0 ? `.${stat.balls}` : ''}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs text-gray-600 dark:text-slate-400">{stat.maidens}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs text-gray-600 dark:text-slate-400">{stat.runs}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs font-bold text-gray-900 dark:text-slate-100">{stat.wickets}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs text-gray-600 dark:text-slate-400">{stat.wides}/{stat.noBalls}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`text-xs font-semibold ${
                    economy < 6 ? 'text-green-600 dark:text-green-400' :
                    economy < 8 ? 'text-gray-700 dark:text-slate-300' :
                    economy < 10 ? 'text-orange-600 dark:text-orange-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {economy.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
