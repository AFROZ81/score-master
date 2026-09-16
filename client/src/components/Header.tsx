import { View } from '../App';
import { Match } from '../types';
import { ChevronLeft, Plus, LogOut, RotateCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentView: View;
  onBack: () => void;
  match: Match | null;
  onAddTeam?: () => void;
  onLogoutClick?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isCreateTeamMode?: boolean;
}

export default function Header({
  currentView,
  onBack,
  match,
  onAddTeam,
  onLogoutClick,
  onRefresh,
  isRefreshing,
  isCreateTeamMode,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const getTitle = () => {
    switch (currentView) {
      case 'players':
        return 'Players';
      case 'teams':
        return isCreateTeamMode ? 'Create Team' : 'Teams';
      case 'live':
        return match ? `${match.team1.shortName} vs ${match.team2.shortName}` : 'Matches';
      case 'scorecard':
        return match ? `${match.format} Scorecard` : 'Scorecard';
      case 'commentary':
        return match ? `${match.format} Commentary` : 'Commentary';
      case 'create':
        return 'Live Scorer';
      case 'profile':
        return 'Player Profile';
      case 'auth':
        return 'Authentication';
      default:
        return 'Player Profile';
    }
  };

  // Show back button when viewing a specific match's details or sub-views (scorecard / commentary),
  // or when in auth view (navigating back to hero).
  const showBack =
    (currentView === 'live' && match !== null) ||
    currentView === 'scorecard' ||
    currentView === 'commentary' ||
    currentView === 'auth';

  return (
    <header className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 text-white px-4 h-14 flex items-center justify-between shadow-lg sticky top-0 z-50 transition-all duration-300">
      {/* Left Back Button or Profile Refresh + Theme Toggle Buttons */}
      {showBack ? (
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 active:bg-white/20 rounded-full transition-colors z-10 shrink-0 cursor-pointer"
          title="Back"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
      ) : currentView === 'profile' ? (
        <div className="flex items-center gap-1.5 z-10 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-50 text-white rounded-xl shadow-sm backdrop-blur-sm transition-all border border-white/20 shrink-0 cursor-pointer"
            title="Refresh Profile & Stats"
            aria-label="Refresh Profile and Stats"
          >
            <RotateCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 text-amber-300 rounded-xl shadow-sm backdrop-blur-sm transition-all border border-white/20 shrink-0 cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={17} className="text-amber-300" /> : <Moon size={17} className="text-indigo-200" />}
          </button>
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* Centered Title */}
      <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center px-14 pointer-events-none">
        <h1 className="text-lg font-bold tracking-tight truncate text-center">{getTitle()}</h1>
      </div>

      {/* Right Action Icons: Live badge, Teams '+' button, or Profile Logout button */}
      <div className="z-10 flex items-center">
        {match && match.status === 'live' && currentView === 'live' && (
          <span className="flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse border border-red-400/40">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            LIVE
          </span>
        )}

        {/* '+' button for Teams (same styling as LiveScorer header '+' button) */}
        {currentView === 'teams' && !isCreateTeamMode && (
          <button
            onClick={onAddTeam}
            className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl shadow-sm backdrop-blur-sm transition-all border border-white/20 shrink-0"
            title="Add Team"
            aria-label="Add Team"
          >
            <Plus size={20} />
          </button>
        )}

        {/* Logout button in header when in Profile page */}
        {currentView === 'profile' && (
          <button
            onClick={onLogoutClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 active:scale-95 border border-red-400/40 text-red-100 text-xs font-bold transition-all shadow-sm shrink-0"
            title="Log Out"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
