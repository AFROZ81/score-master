import { useState, useEffect } from 'react';
import { RegisteredPlayer, RegisteredTeam } from '../types';
import { teamAPI } from '../services/api';
import { Shield, Users, Trophy, X } from 'lucide-react';
import { getTeamColor } from '../services/teamColor';

interface PlayerDetailModalProps {
  player: RegisteredPlayer | null;
  isOpen: boolean;
  onClose: () => void;
}

// Map player type to matching emoji used across registration
const getPlayerTypeEmoji = (type?: string) => {
  switch (type) {
    case 'Batter':
      return '🏏';
    case 'Bowler':
      return '🎯';
    case 'All-Rounder':
      return '⚡';
    default:
      return '🏏';
  }
};

export default function PlayerDetailModal({ player, isOpen, onClose }: PlayerDetailModalProps) {
  const [teams, setTeams] = useState<RegisteredTeam[]>([]);

  useEffect(() => {
    if (!player) return;
    const fetchTeams = async () => {
      const res = await teamAPI.getTeams();
      if (res.success && res.data) {
        const involvedList = player.teamsInvolved || [];
        const myTeams = res.data
          .filter(t => involvedList.includes(t.id) || involvedList.includes(t.teamName))
          .sort((a, b) => a.teamName.localeCompare(b.teamName, undefined, { sensitivity: 'base' }));
        setTeams(myTeams);
      }
    };
    fetchTeams();
  }, [player]);

  if (!isOpen || !player) return null;

  const matchHistory = player.stats?.matchHistory || {
    played: player.stats?.matches || 0,
    won: 0,
    lost: 0,
    abandoned: 0,
  };

  const batting = player.stats?.batting || {
    innings: 0,
    runs: 0,
    balls: 0,
    highestScore: 0,
    average: 0,
    strikeRate: 0,
    fours: 0,
    sixes: 0,
    fifties: 0,
    hundreds: 0,
    ducks: 0,
    notOuts: 0,
  };

  const bowling = player.stats?.bowling || {
    innings: 0,
    overs: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: 0,
    threeWickets: 0,
    fiveWickets: 0,
    bestBowling: '-',
  };

  const fielding = player.stats?.fielding || {
    catches: 0,
    runOuts: 0,
    stumpings: 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-gray-50 dark:bg-slate-950 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header with Close Button */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-5 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-black shadow-lg shrink-0">
              {player.firstName.charAt(0)}{player.lastName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h2 className="text-xl font-black tracking-tight truncate leading-snug">
                {player.firstName} {player.lastName}
              </h2>
              <p className="text-blue-200 text-sm font-medium truncate">@{player.username}</p>
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/30 text-blue-100 border border-blue-300/30 rounded-full text-xs font-semibold tracking-wide">
                  <span>{getPlayerTypeEmoji(player.playerType)}</span> {player.playerType}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Sections */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">

          {/* 1. TEAMS PLAYED SECTION */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
              <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">Teams Played</h3>
            </div>

            {teams.length > 0 ? (
              <div className="space-y-2">
                {teams.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-xs"
                        style={{ backgroundColor: getTeamColor(t.id || t.teamName) }}
                      >
                        {t.shortName || t.teamName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-slate-100">{t.teamName}</h4>
                        <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium">
                          Team Size: {t.teamSize || 11} players
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-semibold text-gray-600 dark:text-slate-300">
                      <span>{t.matchHistory?.played || 0} Matches</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 dark:text-slate-500 text-xs">
                <p>No registered team associations found yet.</p>
              </div>
            )}
          </section>

          {/* 2. MATCH HISTORY STATS SECTION */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">Match History</h3>
              </div>
              {matchHistory.played > 0 && (
                <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Win Rate: {Math.round(((matchHistory.won || 0) / matchHistory.played) * 100)}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100 dark:border-blue-800/40">
                <span className="text-gray-500 dark:text-slate-400 block mb-0.5 text-[10px] font-medium">Played</span>
                <span className="font-bold text-blue-900 dark:text-blue-300 text-base">{matchHistory.played || 0}</span>
              </div>
              <div className="bg-green-50/70 dark:bg-green-950/30 p-2.5 rounded-xl border border-green-100 dark:border-green-800/40">
                <span className="text-gray-500 dark:text-slate-400 block mb-0.5 text-[10px] font-medium">Won</span>
                <span className="font-bold text-green-700 dark:text-green-300 text-base">{matchHistory.won || 0}</span>
              </div>
              <div className="bg-red-50/70 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100 dark:border-red-800/40">
                <span className="text-gray-500 dark:text-slate-400 block mb-0.5 text-[10px] font-medium">Lost</span>
                <span className="font-bold text-red-600 dark:text-red-400 text-base">{matchHistory.lost || 0}</span>
              </div>
              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-100 dark:border-amber-800/40">
                <span className="text-gray-500 dark:text-slate-400 block mb-0.5 text-[10px] font-medium">Abandoned</span>
                <span className="font-bold text-amber-700 dark:text-amber-300 text-base">{matchHistory.abandoned || 0}</span>
              </div>
            </div>
          </section>

          {/* 3. BATTING STATS SECTION */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-base">🏏</span>
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">Batting Stats</h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100/60 dark:border-blue-800/40">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Innings</span>
                <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{batting.innings || 0}</span>
              </div>
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100/60 dark:border-blue-800/40">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Runs</span>
                <span className="font-bold text-blue-900 dark:text-blue-300 text-sm">{batting.runs || 0}</span>
              </div>
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100/60 dark:border-blue-800/40">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Balls</span>
                <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{batting.balls || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Highest Score</span>
                <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{batting.highestScore || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Average</span>
                <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{Number(batting.average || 0).toFixed(1)}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Strike Rate</span>
                <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{Number(batting.strikeRate || 0).toFixed(1)}</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center text-xs mt-2.5">
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl">
                <span className="text-gray-400 dark:text-slate-400 block text-[10px] mb-0.5">4s</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{batting.fours || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl">
                <span className="text-gray-400 dark:text-slate-400 block text-[10px] mb-0.5">6s</span>
                <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">{batting.sixes || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl">
                <span className="text-gray-400 dark:text-slate-400 block text-[10px] mb-0.5">50s</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{batting.fifties || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl">
                <span className="text-gray-400 dark:text-slate-400 block text-[10px] mb-0.5">Not Outs</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-sm">{batting.notOuts || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl">
                <span className="text-gray-400 dark:text-slate-400 block text-[10px] mb-0.5">Ducks</span>
                <span className="font-bold text-red-600 dark:text-red-400 text-sm">{batting.ducks || 0}</span>
              </div>
            </div>
          </section>

          {/* 4. BOWLING STATS SECTION */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-base">🎯</span>
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">Bowling Stats</h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-red-50/60 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100/60 dark:border-red-800/40">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Innings</span>
                <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{bowling.innings || 0}</span>
              </div>
              <div className="bg-red-50/60 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100/60 dark:border-red-800/40">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Overs</span>
                <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{Number(bowling.overs || 0).toFixed(1)}</span>
              </div>
              <div className="bg-red-50/60 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100/60 dark:border-red-800/40">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Wickets</span>
                <span className="font-bold text-red-600 dark:text-red-400 text-sm">{bowling.wickets || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Maidens</span>
                <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{bowling.maidens || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Runs Given</span>
                <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{bowling.runs || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Economy</span>
                <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{Number(bowling.economy || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2 rounded-xl">
                <span className="text-gray-400 dark:text-slate-400 block text-[10px]">3 Wkt Hauls</span>
                <span className="font-semibold text-gray-800 dark:text-slate-100">{bowling.threeWicketHauls || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2 rounded-xl">
                <span className="text-gray-400 dark:text-slate-400 block text-[10px]">5 Wkt Hauls</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{bowling.fiveWicketHauls || 0}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-2 rounded-xl">
                <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Best Bowling</span>
                <span className="font-bold text-gray-800 dark:text-slate-100">{bowling.bestBowling || '0/0'}</span>
              </div>
            </div>
          </section>

          {/* 5. FIELDING STATS SECTION */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
              <Shield size={18} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">Fielding Stats</h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Catches</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-300 text-base">{fielding.catches || 0}</span>
              </div>
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Run Outs</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-300 text-base">{fielding.runOuts || 0}</span>
              </div>
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-gray-400 dark:text-slate-400 block mb-0.5 text-[10px]">Stumpings</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-300 text-base">{fielding.stumpings || 0}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-98 text-gray-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
