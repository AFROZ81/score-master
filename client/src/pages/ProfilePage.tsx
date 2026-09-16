import { useState, useEffect } from 'react';
import { RegisteredPlayer, RegisteredTeam } from '../types';
import { playerAPI, teamAPI } from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { Shield, Users, Trophy } from 'lucide-react';

interface ProfilePageProps {
  currentUser: RegisteredPlayer;
  onLogout: () => void;
  onUpdateUser?: (updated: RegisteredPlayer) => void;
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

export default function ProfilePage({ currentUser, onLogout, onUpdateUser }: ProfilePageProps) {
  const [teams, setTeams] = useState<RegisteredTeam[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTeams = async (user: RegisteredPlayer) => {
    const res = await teamAPI.getTeams();
    if (res.success && res.data) {
      // Ensure ONLY the teams in the teamsInvolved of the Player's record get displayed, sorted alphabetically by teamName
      const involvedList = user.teamsInvolved || [];
      const myTeams = res.data
        .filter(t => involvedList.includes(t.id) || involvedList.includes(t.teamName))
        .sort((a, b) => a.teamName.localeCompare(b.teamName, undefined, { sensitivity: 'base' }));
      setTeams(myTeams);
    }
  };

  useEffect(() => {
    fetchTeams(currentUser);
  }, [currentUser]);

  const handleRefresh = async () => {
    if (isRefreshing || !currentUser?.id) return;
    setIsRefreshing(true);
    try {
      const [playerRes] = await Promise.all([
        playerAPI.getPlayerById(currentUser.id),
        fetchTeams(currentUser),
      ]);
      if (playerRes.success && playerRes.data) {
        onUpdateUser?.(playerRes.data);
        await fetchTeams(playerRes.data);
      }
    } catch (err) {
      console.error('Failed to refresh player profile:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const stats = currentUser.stats || {
    matches: 0,
    batting: {
      innings: 0,
      balls: 0,
      runs: 0,
      fours: 0,
      sixes: 0,
      outs: 0,
      notOuts: 0,
      highestScore: 0,
      average: 0.0,
      strikeRate: 0.0,
      fifties: 0,
      ducks: 0,
    },
    bowling: {
      innings: 0,
      overs: 0.0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0.0,
      threeWicketHauls: 0,
      fiveWicketHauls: 0,
      bestBowling: '0/0',
    },
    fielding: {
      catches: 0,
      runOuts: 0,
      stumpings: 0,
    },
    matchHistory: {
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      abandoned: 0,
    },
  };

  const batting = stats.batting || ({} as any);
  const bowling = stats.bowling || ({} as any);
  const fielding = stats.fielding || ({} as any);
  const matchHistory = stats.matchHistory || {
    played: stats.matches || 0,
    won: 0,
    lost: 0,
    tied: 0,
    abandoned: 0,
  };

  const played = matchHistory.played || 0;
  const won = matchHistory.won || 0;
  const lost = matchHistory.lost || 0;
  const abandoned = matchHistory.abandoned || 0;
  const winRate = played > 0 ? ((won / played) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-3">
      {/* Top Banner with Avatar & User Info */}
      <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 px-4 py-3 text-white relative shadow-md">
        <div className="grid grid-cols-[auto_1fr_auto] grid-rows-2 gap-x-3 gap-y-1 items-center">
          {/* Row 1-2, Col 1: Avatar */}
          <div className="row-span-2 w-12 h-12 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-lg font-black shadow-md shrink-0">
            {currentUser.firstName.charAt(0)}{currentUser.lastName.charAt(0)}
          </div>

          {/* Row 1, Col 2-3: First Name + Last Name */}
          <div className="col-span-2 min-w-0">
            <h1 className="text-base font-black tracking-tight truncate leading-tight">
              {currentUser.firstName} {currentUser.lastName}
            </h1>
          </div>

          {/* Row 2, Col 2: Username */}
          <div className="min-w-0">
            <p className="text-blue-200 text-xs font-medium truncate">@{currentUser.username}</p>
          </div>

          {/* Row 2, Col 3: Player Type */}
          <div className="flex justify-end shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/30 text-blue-100 border border-blue-300/30 rounded-full text-[11px] font-semibold tracking-wide">
              <span>{getPlayerTypeEmoji(currentUser.playerType)}</span> {currentUser.playerType}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Content Sections */}
      <div className="p-2 space-y-2">

        {/* 1. TEAMS PLAYED SECTION */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-slate-800">
            <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Teams Played</h2>
          </div>

          {teams.length > 0 ? (
            <p className="text-xs text-gray-700 dark:text-slate-300 font-medium py-1">
              {teams.map(t => t.teamName).join(', ')}
            </p>
          ) : (
            <div className="py-2 text-gray-400 dark:text-slate-500 text-xs">
              <p>No registered team associations found yet.</p>
            </div>
          )}
        </section>

        {/* 2. MATCH HISTORY SECTION */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Match History</h2>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
              <span className="text-gray-400 dark:text-slate-400 block text-[10px] font-medium mb-0.5">Played</span>
              <span className="font-extrabold text-gray-800 dark:text-slate-100 text-base">{played}</span>
            </div>
            <div className="bg-green-50/60 dark:bg-green-950/30 p-2.5 rounded-xl border border-green-100/60 dark:border-green-800/40">
              <span className="text-green-600 dark:text-green-400 block text-[10px] font-medium mb-0.5">Won</span>
              <span className="font-extrabold text-green-700 dark:text-green-300 text-base">{won}</span>
            </div>
            <div className="bg-red-50/60 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100/60 dark:border-red-800/40">
              <span className="text-red-600 dark:text-red-400 block text-[10px] font-medium mb-0.5">Lost</span>
              <span className="font-extrabold text-red-700 dark:text-red-300 text-base">{lost}</span>
            </div>
            <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100/60 dark:border-blue-800/40">
              <span className="text-blue-600 dark:text-blue-400 block text-[10px] font-medium mb-0.5">Abandoned</span>
              <span className="font-extrabold text-blue-700 dark:text-blue-300 text-base">{abandoned}</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-400 px-1">
            <span>Career win rate</span>
            <span className="dark:text-slate-200">{winRate} %</span>
          </div>
        </section>
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
            <span className="text-base">🏏</span>
            <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Batting Stats</h2>
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

        {/* 3. BOWLING STATS SECTION */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
            <span className="text-base">🎯</span>
            <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Bowling Stats</h2>
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

        {/* 4. FIELDING STATS SECTION */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
            <Shield size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Fielding Stats</h2>
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

      {/* Confirmation Modal for Logout */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out of your ScoreMaster player account?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          setShowLogoutModal(false);
          onLogout();
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
