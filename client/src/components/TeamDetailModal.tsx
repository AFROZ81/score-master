import { RegisteredTeam, RegisteredPlayer } from '../types';
import { X, Users, Trophy, Shield, ChevronRight } from 'lucide-react';
import { getTeamColor } from '../services/teamColor';

interface TeamDetailModalProps {
  team: RegisteredTeam | null;
  players: RegisteredPlayer[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer?: (player: RegisteredPlayer) => void;
}

export default function TeamDetailModal({
  team,
  players,
  isOpen,
  onClose,
  onSelectPlayer,
}: TeamDetailModalProps) {
  if (!isOpen || !team) return null;

  // Resolve team players from the full players list using team.involvedPlayerIds, sorted alphabetically by First Name
  const teamPlayerIds = team.involvedPlayerIds || [];
  const teamPlayers = players
    .filter(p => teamPlayerIds.includes(p.id))
    .sort((a, b) =>
      a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' }) ||
      a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' })
    );

  const matchesPlayed = team.matchHistory?.played || 0;
  const matchesWon = team.matchHistory?.won || 0;
  const matchesLost = team.matchHistory?.lost || 0;
  const matchesAbandoned = team.matchHistory?.abandoned || 0;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const displayColor = getTeamColor(team.id || team.teamName);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-gray-50 dark:bg-slate-950 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 dark:border-slate-800 flex flex-col max-h-[92vh] transition-colors">
        
        {/* Top Header */}
        <div
          className="p-5 text-white relative shrink-0 shadow-md"
          style={{
            background: `linear-gradient(135deg, ${displayColor} 0%, #0f172a 100%)`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shrink-0 border-2 border-white/40"
              style={{ backgroundColor: displayColor }}
            >
              {team.shortName || team.teamName.substring(0, 3).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h2 className="text-xl font-black tracking-tight truncate leading-snug">
                {team.teamName}
              </h2>
              <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                <span className="px-2 py-0.5 bg-white/20 rounded-full">
                  {team.shortName || 'TM'}
                </span>
                <span>•</span>
                <span>Squad: {team.teamSize || 11} players</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Team Record Stats */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
              <Trophy size={18} className="text-amber-500" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">Match Record</h3>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-gray-50 dark:bg-slate-800/70 rounded-xl p-2.5">
                <span className="text-[10px] text-gray-400 dark:text-slate-400 block font-medium">Played</span>
                <span className="text-base font-extrabold text-gray-800 dark:text-slate-100">{matchesPlayed}</span>
              </div>
              <div className="bg-green-50/60 dark:bg-green-950/30 rounded-xl p-2.5">
                <span className="text-[10px] text-green-600 dark:text-green-400 block font-medium">Won</span>
                <span className="text-base font-extrabold text-green-700 dark:text-green-300">{matchesWon}</span>
              </div>
              <div className="bg-red-50/60 dark:bg-red-950/30 rounded-xl p-2.5">
                <span className="text-[10px] text-red-600 dark:text-red-400 block font-medium">Lost</span>
                <span className="text-base font-extrabold text-red-700 dark:text-red-300">{matchesLost}</span>
              </div>
              <div className="bg-blue-50/60 dark:bg-blue-950/30 rounded-xl p-2.5">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-medium">Win %</span>
                <span className="text-base font-extrabold text-blue-700 dark:text-blue-300">{winRate}%</span>
              </div>
            </div>
            {matchesAbandoned > 0 && (
              <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center mt-2">
                {matchesAbandoned} match{matchesAbandoned > 1 ? 'es' : ''} abandoned
              </p>
            )}
          </section>

          {/* Squad Players Section */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">Squad Players</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-full">
                {teamPlayers.length} / {team.teamSize || 11}
              </span>
            </div>

            {teamPlayers.length > 0 ? (
              <div className="space-y-2">
                {teamPlayers.map((player) => {
                  const runs = player.stats?.batting?.runs ?? 0;
                  const wickets = player.stats?.bowling?.wickets ?? 0;
                  const isClickable = Boolean(onSelectPlayer);

                  return (
                    <div
                      key={player.id}
                      onClick={() => onSelectPlayer?.(player)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 transition-all ${
                        isClickable
                          ? 'hover:bg-blue-50/40 dark:hover:bg-blue-950/30 hover:border-blue-200 dark:hover:border-blue-800/50 cursor-pointer active:scale-[0.99]'
                          : 'bg-gray-50/60 dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-blue-700 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                          {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate">
                            {player.firstName} {player.lastName}
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">@{player.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right text-[10px] text-gray-500 dark:text-slate-400 hidden xs:block">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{runs}</span> runs •{' '}
                          <span className="font-semibold text-red-500 dark:text-red-400">{wickets}</span> wkts
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                          {getPlayerTypeEmoji(player.playerType)} {player.playerType}
                        </span>
                        {isClickable && <ChevronRight size={15} className="text-gray-400 dark:text-slate-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 dark:text-slate-500 text-xs space-y-1">
                <Shield size={22} className="mx-auto text-gray-300 dark:text-slate-600" />
                <p>No players enrolled in this squad yet.</p>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
