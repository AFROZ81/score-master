import { useState, useEffect } from 'react';
import { RegisteredPlayer } from '../types';
import { playerAPI } from '../services/api';
import { Search, UserCheck, ChevronRight } from 'lucide-react';
import PlayerDetailModal from '../components/PlayerDetailModal';

interface PlayersPageProps {
  currentUser: RegisteredPlayer | null;
  onModalStateChange?: (isOpen: boolean) => void;
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

export default function PlayersPage({ currentUser, onModalStateChange }: PlayersPageProps) {
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedPlayer, setSelectedPlayer] = useState<RegisteredPlayer | null>(null);

  // Notify parent when player modal opens/closes to hide/show navbar
  useEffect(() => {
    onModalStateChange?.(selectedPlayer !== null);
  }, [selectedPlayer, onModalStateChange]);

  useEffect(() => {
    const fetchPlayers = async () => {
      setIsLoading(true);
      try {
        const res = await playerAPI.getPlayers();
        if (res.success && Array.isArray(res.data)) {
          setPlayers(res.data);
        }
      } catch (err) {
        console.error('Failed to load players:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  // Filter out the currently logged-in player as requested:
  // "A player need not to see his own name there. Only the other players."
  const otherPlayers = players.filter(p => {
    if (currentUser?.id && p.id === currentUser.id) return false;
    if (currentUser?.username && p.username === currentUser.username) return false;
    return true;
  });

  // Filter by search query and role, sorted alphabetically by First Name
  const filteredPlayers = otherPlayers
    .filter(p => {
      const matchesSearch =
        !searchQuery.trim() ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRole === 'All' || p.playerType === selectedRole;

      return matchesSearch && matchesRole;
    })
    .sort((a, b) => a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' }) || a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' }));

  return (
    <div className="p-4 space-y-4">
      {/* Search and Role Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players by name or handle..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xs"
          />
        </div>

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { label: 'All', role: 'All' },
            { label: '🏏 Batter', role: 'Batter' },
            { label: '🎯 Bowler', role: 'Bowler' },
            { label: '⚡ All-Rounder', role: 'All-Rounder' },
          ].map(({ label, role }) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedRole === role
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Players Cards Grid */}
      {isLoading ? (
        <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-gray-400 dark:text-slate-500 animate-pulse">Loading registered players...</p>
        </div>
      ) : filteredPlayers.length > 0 ? (
        <div className="space-y-2.5">
          {filteredPlayers.map((player) => {
            const matchesPlayed = player.stats?.matchHistory?.played ?? player.stats?.matches ?? 0;
            const matchesWon = player.stats?.matchHistory?.won ?? 0;
            const runs = player.stats?.batting?.runs ?? 0;
            const wickets = player.stats?.bowling?.wickets ?? 0;

            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-gray-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-blue-700 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0 border border-white/20">
                      {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                          {player.firstName} {player.lastName}
                        </h3>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">@{player.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                      {getPlayerTypeEmoji(player.playerType)} {player.playerType}
                    </span>
                    <ChevronRight size={16} className="text-gray-400 dark:text-slate-500" />
                  </div>
                </div>

                {/* Quick Career Stats Chips */}
                <div className="grid grid-cols-4 gap-1.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-xl p-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-400 block">Matches</span>
                    <span className="font-bold text-gray-800 dark:text-slate-100">{matchesPlayed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-400 block">Won</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{matchesWon}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-400 block">Runs</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{runs}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-400 block">Wickets</span>
                    <span className="font-bold text-red-500 dark:text-red-400">{wickets}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xl">
            <UserCheck size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">No Other Players Found</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
            {searchQuery.trim()
              ? `No players matched "${searchQuery}". Try a different search term.`
              : 'There are no other registered players available in the database yet.'}
          </p>
        </div>
      )}

      {/* Player Detail & Stats Modal */}
      <PlayerDetailModal
        player={selectedPlayer}
        isOpen={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
