import { useState, useEffect, useCallback } from 'react';
import { Match, RegisteredPlayer } from './types';
import { matchAPI, playerAPI } from './services/api';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import MatchDetail from './pages/MatchDetail';
import LiveScorer from './pages/LiveScorer';
import Authentication from './pages/Authentication';
import HeroPage from './pages/HeroPage';
import ProfilePage from './pages/ProfilePage';
import TeamsPage from './pages/TeamsPage';
import PlayersPage from './pages/PlayersPage';
import ConfirmationModal from './components/ConfirmationModal';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type View = 'hero' | 'auth' | 'profile' | 'live' | 'scorecard' | 'commentary' | 'create' | 'players' | 'teams';

// Map View to corresponding URL path
const VIEW_TO_PATH: Record<View, string> = {
  hero: '/',
  auth: '/auth',
  profile: '/profile',
  live: '/matches',
  scorecard: '/matches/scorecard',
  commentary: '/matches/commentary',
  create: '/score',
  players: '/players',
  teams: '/teams',
};

// Map URL pathname to View
function getViewFromPath(pathname: string): View {
  const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (cleanPath === '/auth') return 'auth';
  if (cleanPath === '/matches/scorecard') return 'scorecard';
  if (cleanPath === '/matches/commentary') return 'commentary';
  if (cleanPath === '/matches') return 'live';
  if (cleanPath === '/score') return 'create';
  if (cleanPath === '/players') return 'players';
  if (cleanPath === '/teams') return 'teams';
  if (cleanPath === '/profile') return 'profile';
  return 'hero';
}

function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [isScoringActive, setIsScoringActive] = useState(false);
  const [isCreateTeamMode, setIsCreateTeamMode] = useState(false);
  const [isPlayerDetailOpen, setIsPlayerDetailOpen] = useState(false);
  const [isTeamDetailOpen, setIsTeamDetailOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [profileToast, setProfileToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss profile toast after 3.5 seconds
  useEffect(() => {
    if (!profileToast) return;
    const timer = setTimeout(() => {
      setProfileToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [profileToast]);

  const [currentUser, setCurrentUser] = useState<RegisteredPlayer | null>(() => {
    try {
      const savedLocal = localStorage.getItem('score_master_user');
      if (savedLocal) return JSON.parse(savedLocal);
      const savedSession = sessionStorage.getItem('score_master_user');
      if (savedSession) return JSON.parse(savedSession);
      return null;
    } catch {
      return null;
    }
  });

  // Helper to save user session based on rememberMe preference
  const saveUserSession = (user: RegisteredPlayer | null, rememberMe: boolean = true) => {
    try {
      if (!user) {
        localStorage.removeItem('score_master_user');
        sessionStorage.removeItem('score_master_user');
      } else if (rememberMe) {
        localStorage.setItem('score_master_user', JSON.stringify(user));
        sessionStorage.removeItem('score_master_user');
      } else {
        sessionStorage.setItem('score_master_user', JSON.stringify(user));
        localStorage.removeItem('score_master_user');
      }
    } catch (err) {
      console.error('Failed to sync user session in storage:', err);
    }
  };

  // Initialize view from URL
  const [currentView, setCurrentView] = useState<View>(() => {
    const initialView = getViewFromPath(window.location.pathname);
    // If not authenticated and trying to access protected views, route to auth
    try {
      const savedLocal = localStorage.getItem('score_master_user');
      const savedSession = sessionStorage.getItem('score_master_user');
      const user = savedLocal || savedSession ? JSON.parse(savedLocal || savedSession!) : null;
      if (!user && ['profile', 'live', 'create', 'players', 'teams'].includes(initialView)) {
        return 'auth';
      }
    } catch {
      // fallback
    }
    return initialView;
  });

  // Sync window URL with currentView using history API
  const navigateToView = useCallback((newView: View, replace = false) => {
    const targetPath = VIEW_TO_PATH[newView] || '/';
    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({ view: newView }, '', targetPath);
      } else {
        window.history.pushState({ view: newView }, '', targetPath);
      }
    }
    setCurrentView(newView);
  }, []);

  // Listen for browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const viewFromUrl = getViewFromPath(window.location.pathname);
      
      if (viewFromUrl === 'hero') {
        setCurrentView('hero');
        return;
      }

      // Check fresh session state from storage or in-memory
      let activeUser = currentUser;
      if (!activeUser) {
        try {
          const savedLocal = localStorage.getItem('score_master_user');
          const savedSession = sessionStorage.getItem('score_master_user');
          activeUser = savedLocal || savedSession ? JSON.parse(savedLocal || savedSession!) : null;
        } catch {
          activeUser = null;
        }
      }

      // If user travels forward/back to protected views without authorization:
      if (!activeUser && ['profile', 'live', 'create', 'players', 'teams', 'scorecard', 'commentary'].includes(viewFromUrl)) {
        // Intercept and force them to the Authentication page
        setCurrentUser(null);
        navigateToView('auth', true);
        return;
      }

      setCurrentView(viewFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, navigateToView]);

  // Sync initial URL path on mount
  useEffect(() => {
    const expectedPath = VIEW_TO_PATH[currentView] || '/';
    if (window.location.pathname !== expectedPath) {
      window.history.replaceState({ view: currentView }, '', expectedPath);
    }
  }, []);

  // Load matches from database on mount
  useEffect(() => {
    const loadMatches = async () => {
      const loadedMatches = await matchAPI.getAllMatches();
      setMatches(loadedMatches);
    };
    loadMatches();
  }, []);

  const selectedMatch = matches.find(m => m.id === selectedMatchId) || null;

  const handleMatchSelect = (matchId: string) => {
    setSelectedMatchId(matchId);
    navigateToView('live');
  };

  const handleViewScorecard = () => {
    navigateToView('scorecard');
  };

  const handleViewCommentary = () => {
    navigateToView('commentary');
  };

  const handleBack = () => {
    if (currentView === 'teams' && isCreateTeamMode) {
      setIsCreateTeamMode(false);
    } else if (currentView === 'scorecard' || currentView === 'commentary') {
      navigateToView('live');
    } else if (currentView === 'live') {
      setSelectedMatchId(null);
    } else if (currentView === 'auth') {
      navigateToView('hero');
    } else {
      navigateToView('profile');
      setSelectedMatchId(null);
    }
  };

  // Called by LiveScorer when match is created or updated
  const handleMatchUpdate = async (updatedMatch: Match) => {
    if (!updatedMatch || !updatedMatch.id || !updatedMatch.team1 || !updatedMatch.team2) {
      console.warn('Invalid match update:', updatedMatch);
      return;
    }

    // Scoring endpoints persist liveState atomically. Match projections returned
    // with scoring responses can contain the previous embedded liveState; sending
    // that projection back would overwrite freshly selected batters/bowlers.
    // Keep this generic match update limited to match metadata and let the server
    // preserve the authoritative liveState.
    const { liveState: _liveState, ...matchMetadata } = updatedMatch;
    await matchAPI.updateMatch(matchMetadata as Match);
    const allMatches = await matchAPI.getAllMatches();
    setMatches(allMatches);
  };

  // Refresh all matches from backend
  const refreshMatches = async () => {
    const allMatches = await matchAPI.getAllMatches();
    setMatches(allMatches);
  };

  // Refresh current user profile and stats from backend
  const refreshProfile = async () => {
    if (isRefreshingProfile || !currentUser?.id) return;
    setIsRefreshingProfile(true);
    try {
      const res = await playerAPI.getPlayerById(currentUser.id);
      if (res.success && res.data) {
        setCurrentUser(res.data);
        try {
          localStorage.setItem('score_master_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Failed to sync updated user in localStorage:', err);
        }
        setProfileToast({
          message: 'Profile and match statistics updated successfully!',
          type: 'success',
        });
      } else {
        setProfileToast({
          message: res.error || 'Failed to refresh profile data.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      setProfileToast({
        message: 'Network error: could not refresh profile data.',
        type: 'error',
      });
    } finally {
      setTimeout(() => setIsRefreshingProfile(false), 500);
    }
  };

  // Safe navigation handler checking authentication and scoring environment exit guard
  const handleNavigate = (view: View) => {
    // If scoring is active and navigation is tried to exit scoring, route to LiveScorer match selection
    if (isScoringActive && view !== 'create') {
      setIsScoringActive(false);
      navigateToView('create');
      return;
    }

    if (!currentUser && (view === 'profile' || view === 'live' || view === 'create' || view === 'players' || view === 'teams')) {
      navigateToView('auth');
      return;
    }
    if (view === 'teams') {
      setIsCreateTeamMode(false);
    }
    navigateToView(view);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveUserSession(null);
    setShowLogoutModal(false);
    navigateToView('auth');
  };

  const isScoringView = currentView === 'create' && isScoringActive;
  const isTeamFormView = currentView === 'teams' && isCreateTeamMode;
  const isPlayerModalView = currentView === 'players' && isPlayerDetailOpen;
  const isTeamModalView = currentView === 'teams' && isTeamDetailOpen;
  const isHeroView = currentView === 'hero';
  const isAuthView = currentView === 'auth' || !currentUser;
  const showHeader = currentView !== 'create' && currentView !== 'hero' && currentUser !== null;
  // Hide bottom navbar while scoring, during team creation/editing, when player/team details modal is open, on hero page, AND during authentication stage
  const showBottomNav = !isScoringView && !isTeamFormView && !isPlayerModalView && !isTeamModalView && !isHeroView && !isAuthView && currentUser !== null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 max-w-md mx-auto relative transition-colors duration-300">
      {/* Only show Header when not in scoring or hero screens */}
      {showHeader && (
        <Header
          currentView={currentView}
          match={selectedMatch}
          onBack={handleBack}
          onAddTeam={() => setShowAddTeamModal(true)}
          onLogoutClick={() => setShowLogoutModal(true)}
          onRefresh={currentView === 'profile' ? refreshProfile : undefined}
          isRefreshing={currentView === 'profile' ? isRefreshingProfile : false}
          isCreateTeamMode={isCreateTeamMode}
        />
      )}

      {/* Toast Notification on Refresh */}
      {profileToast && (
        <div className="fixed top-16 left-4 right-4 max-w-sm mx-auto z-50 animate-bounce">
          <div className={`flex items-center gap-2.5 px-4 py-3 text-white rounded-xl shadow-xl text-xs font-semibold border backdrop-blur-md ${
            profileToast.type === 'success'
              ? 'bg-gray-900/95 border-emerald-500/50'
              : 'bg-red-900/95 border-red-500/50'
          }`}>
            {profileToast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-400 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{profileToast.message}</span>
            <button
              onClick={() => setProfileToast(null)}
              className="text-white/70 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <main className={isScoringView || isTeamFormView || isPlayerModalView || isTeamModalView || isHeroView || isAuthView ? '' : 'pb-20'}>
        {currentView === 'hero' && (
          <HeroPage
            onNavigateAuth={() => navigateToView('auth')}
          />
        )}

        {/* If user is not authenticated and is on any protected route, show Authentication screen */}
        {!currentUser && currentView !== 'hero' && currentView !== 'auth' ? (
          <Authentication
            onSuccess={(player, rememberMe) => {
              setCurrentUser(player);
              saveUserSession(player, rememberMe);
              navigateToView('profile');
            }}
          />
        ) : (
          <>
            {currentView === 'profile' && currentUser && (
              <ProfilePage
                currentUser={currentUser}
                onLogout={() => setShowLogoutModal(true)}
                onUpdateUser={(updated) => {
                  setCurrentUser(updated);
                  const isRemembered = !!localStorage.getItem('score_master_user');
                  saveUserSession(updated, isRemembered);
                }}
              />
            )}

            {currentView === 'players' && (
              <PlayersPage
                currentUser={currentUser}
                onModalStateChange={(isOpen) => setIsPlayerDetailOpen(isOpen)}
              />
            )}

            {currentView === 'teams' && (
              <TeamsPage
                currentUser={currentUser}
                isCreateMode={isCreateTeamMode}
                onCloseCreateTeam={() => setIsCreateTeamMode(false)}
                onFormModeChange={(isFormOpen) => setIsCreateTeamMode(isFormOpen)}
                onModalStateChange={(isOpen) => setIsTeamDetailOpen(isOpen)}
              />
            )}

            {currentView === 'live' && (
              <MatchDetail
                matches={matches}
                match={selectedMatch}
                onSelectMatch={handleMatchSelect}
                onBackToList={() => setSelectedMatchId(null)}
                onViewScorecard={handleViewScorecard}
                onViewCommentary={handleViewCommentary}
              />
            )}

            {currentView === 'scorecard' && selectedMatch && (
              <MatchDetail
                matches={matches}
                match={selectedMatch}
                onSelectMatch={handleMatchSelect}
                onBackToList={() => setSelectedMatchId(null)}
                onViewScorecard={handleViewScorecard}
                onViewCommentary={handleViewCommentary}
                showFullScorecard={true}
              />
            )}

            {currentView === 'commentary' && selectedMatch && (
              <MatchDetail
                matches={matches}
                match={selectedMatch}
                onSelectMatch={handleMatchSelect}
                onBackToList={() => setSelectedMatchId(null)}
                onViewScorecard={handleViewScorecard}
                onViewCommentary={handleViewCommentary}
                showCommentary={true}
              />
            )}

            {currentView === 'create' && (
              <LiveScorer
                matches={matches}
                currentUser={currentUser}
                onUpdateMatch={handleMatchUpdate}
                onRefreshMatches={refreshMatches}
                onBack={() => navigateToView('profile')}
                onScoringViewChange={setIsScoringActive}
              />
            )}

            {currentView === 'auth' && (
              <Authentication
                onSuccess={(player, rememberMe) => {
                  setCurrentUser(player);
                  saveUserSession(player, rememberMe);
                  navigateToView('profile');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Confirmation Modal for Header / Profile Logout */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out of your ScoreMaster player account?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Confirmation Modal for Header '+' Add Team */}
      <ConfirmationModal
        isOpen={showAddTeamModal}
        title="Create New Team?"
        message="Would you like to open the team creation form to register a new team?"
        confirmText="Yes, Proceed"
        cancelText="Cancel"
        type="info"
        onConfirm={() => {
          setShowAddTeamModal(false);
          setIsCreateTeamMode(true);
        }}
        onCancel={() => setShowAddTeamModal(false)}
      />

      {/* Only show BottomNav when not in scoring, hero, or auth screens */}
      {showBottomNav && (
        <BottomNav currentView={currentView} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
