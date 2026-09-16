/**
 * LiveScorer Component - UI only, all business logic handled by API service
 */

import { useState, useEffect } from 'react';
import { Match, ScoringSession, RegisteredTeam, RegisteredPlayer } from '../types';
import { matchAPI, scoringAPI, MatchSetup, teamAPI, playerAPI } from '../services/api';
import { ChevronLeft, ChevronRight, Trophy, Plus, Calendar, Trash2 } from 'lucide-react';
import WicketModal, { WicketDetails } from '../components/WicketModal';
import TossPage from '../components/TossPage';
import ConfirmationModal, { ConfirmationType } from '../components/ConfirmationModal';
import { getTeamColor } from '../services/teamColor';
import MatchSetupForm from '../components/MatchSetupForm';
import PlayerSelector from '../components/PlayerSelector';
import ScoringDashboardView from '../components/ScoringDashboardView';
import InningsBreakView from '../components/InningsBreakView';
import MatchCompleteView from '../components/MatchCompleteView';
import RunsScoredModal from '../components/RunsScoredModal';
import NoBallRunOutConfirmModal from '../components/NoBallRunOutConfirmModal';
import EndOptionsModal from '../components/EndOptionsModal';
import TiePromptModal from '../components/TiePromptModal';

interface LiveScorerProps {
  matches: Match[];
  currentUser?: RegisteredPlayer | null;
  onUpdateMatch: (match: Match) => void;
  onRefreshMatches: () => Promise<void>;
  onBack: () => void;
  onScoringViewChange?: (isScoring: boolean) => void;
}

export default function LiveScorer({ matches, currentUser, onUpdateMatch, onRefreshMatches, onBack, onScoringViewChange }: LiveScorerProps) {
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [session, setSession] = useState<ScoringSession | null>(null);
  const [match, setMatch] = useState<Match | null>(null);

  // Teams and registered players
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeam[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  // Match setup state
  const [selectedTeam1Id, setSelectedTeam1Id] = useState('');
  const [selectedTeam2Id, setSelectedTeam2Id] = useState('');
  const [team1CaptainIdx, setTeam1CaptainIdx] = useState<number>(0);
  const [team2CaptainIdx, setTeam2CaptainIdx] = useState<number>(0);
  const [overs, setOvers] = useState(5);
  const [oversInput, setOversInput] = useState('5');
  const [extraRunsCounted, setExtraRunsCounted] = useState(false);
  const [venue, setVenue] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState('');

  // UI state
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showNoBallRunsModal, setShowNoBallRunsModal] = useState(false);
  const [showWideRunsModal, setShowWideRunsModal] = useState(false);
  const [showRunOutRunsModal, setShowRunOutRunsModal] = useState(false);
  const [pendingRunOutDetails, setPendingRunOutDetails] = useState<WicketDetails | null>(null);

  // No-ball run-out flow
  const [pendingNoBallRuns, setPendingNoBallRuns] = useState<number | null>(null);
  const [pendingNoBallWicket, setPendingNoBallWicket] = useState<WicketDetails | null>(null);
  const [showNoBallRunOutConfirm, setShowNoBallRunOutConfirm] = useState(false);
  const [showNoBallRunOutWicketModal, setShowNoBallRunOutWicketModal] = useState(false);

  // Retired Hurt selection modal state
  const [showRetiredHurtSelectModal, setShowRetiredHurtSelectModal] = useState(false);

  // Mid-over bowler change modal state
  const [showChangeBowlerModal, setShowChangeBowlerModal] = useState(false);

  // End button flow state (modal -> preview view -> confirmation)
  const [showEndOptionsModal, setShowEndOptionsModal] = useState(false);
  const [previewPhase, setPreviewPhase] = useState<'none' | 'inningsBreak' | 'matchComplete'>('none');
  const [previewTerminalIntent, setPreviewTerminalIntent] = useState<'abandon' | 'endMatch'>('endMatch');

  // Load teams and registered players for match creation
  useEffect(() => {
    const fetchTeamsAndPlayers = async () => {
      setIsLoadingTeams(true);
      try {
        const [teamsRes, playersRes] = await Promise.all([
          teamAPI.getTeams(),
          playerAPI.getPlayers()
        ]);
        if (teamsRes.success && Array.isArray(teamsRes.data)) {
          const sortedTeams = [...teamsRes.data].sort((a, b) =>
            a.teamName.localeCompare(b.teamName, undefined, { sensitivity: 'base' })
          );
          setRegisteredTeams(sortedTeams);
        }
        if (playersRes.success && Array.isArray(playersRes.data)) {
          const sortedPlayers = [...playersRes.data].sort((a, b) =>
            a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' }) ||
            a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' })
          );
          setRegisteredPlayers(sortedPlayers);
        }
      } catch (err) {
        console.error('Error fetching teams/players for match creation:', err);
      } finally {
        setIsLoadingTeams(false);
      }
    };

    fetchTeamsAndPlayers();
  }, []);
  
  // Notify parent whether user is in match scoring/creation view or match selection view
  useEffect(() => {
    onScoringViewChange?.(Boolean(currentMatchId || showMatchForm));
  }, [currentMatchId, showMatchForm, onScoringViewChange]);

  // General Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmationType;
    icon?: React.ReactNode;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openConfirmation = ({
    title = 'Confirm Action',
    message,
    confirmText = 'Yes',
    cancelText = 'No',
    type = 'warning',
    icon,
    onConfirm,
  }: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmationType;
    icon?: React.ReactNode;
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      icon,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  };

  const closeConfirmation = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');

  // Helper function to determine batting/bowling teams based on toss or Super Over
  const getBattingBowlingTeams = (session: ScoringSession, match: Match) => {
    if (session.isSuperOver) {
      const superOver1stBattingTeamId = session.superOver1stBattingTeamId || match.team2.id;
      const superOver1stBattingTeam = superOver1stBattingTeamId === match.team1.id ? match.team1 : match.team2;
      const superOver2ndBattingTeam = superOver1stBattingTeamId === match.team1.id ? match.team2 : match.team1;

      const battingTeam = session.currentInningsNum === 0 ? superOver1stBattingTeam : superOver2ndBattingTeam;
      const bowlingTeam = session.currentInningsNum === 0 ? superOver2ndBattingTeam : superOver1stBattingTeam;

      return { battingTeam, bowlingTeam };
    }

    const firstInningsBattingTeamId = session.firstInningsBattingTeamId || match.team1.id;
    const firstBattingTeam = firstInningsBattingTeamId === match.team1.id ? match.team1 : match.team2;
    const secondBattingTeam = firstInningsBattingTeamId === match.team1.id ? match.team2 : match.team1;

    const battingTeam = session.currentInningsNum === 0 ? firstBattingTeam : secondBattingTeam;
    const bowlingTeam = session.currentInningsNum === 0 ? secondBattingTeam : firstBattingTeam;

    return { battingTeam, bowlingTeam };
  };

  // Load session when match is selected
  useEffect(() => {
    const loadMatch = async () => {
      if (currentMatchId) {
        try {
          const result = await scoringAPI.getCurrentMatchState(currentMatchId);
          if (result.success && result.data) {
            setSession(result.data.session);
            setMatch(result.data.match);
            onUpdateMatch(result.data.match);
          } else {
            console.log('Match or session not found:', result.error);
            setCurrentMatchId(null);
          }
        } catch (error) {
          console.error('Error loading match:', error);
          setCurrentMatchId(null);
        }
      }
    };
    loadMatch();
  }, [currentMatchId]);

  // Derive selected team objects
  const team1Obj = registeredTeams.find(t => t.id === selectedTeam1Id);
  const team2Obj = registeredTeams.find(t => t.id === selectedTeam2Id);

  // Map involvedPlayerIds to player objects (alphabetical by First Name)
  const getTeamPlayers = (team?: RegisteredTeam, captainIdx: number = 0) => {
    if (!team || !Array.isArray(team.involvedPlayerIds) || team.involvedPlayerIds.length === 0) {
      return [
        { id: `${team?.id || 'team'}-p1`, name: `${team?.teamName || 'Team'} Player 1`, role: 'batsman' as const, isCaptain: captainIdx === 0 },
        { id: `${team?.id || 'team'}-p2`, name: `${team?.teamName || 'Team'} Player 2`, role: 'bowler' as const, isCaptain: captainIdx === 1 },
      ];
    }
    const resolved = team.involvedPlayerIds.map((playerId) => {
      const regPlayer = registeredPlayers.find(p => p.id === playerId);
      const firstName = regPlayer?.firstName || '';
      const lastName = regPlayer?.lastName || '';
      const name = regPlayer ? `${firstName} ${lastName}`.trim() : 'Unknown Player';
      let role: 'batsman' | 'bowler' | 'allrounder' = 'batsman';
      if (regPlayer?.playerType === 'Bowler') role = 'bowler';
      else if (regPlayer?.playerType === 'All-Rounder') role = 'allrounder';
      return {
        id: playerId,
        firstName,
        lastName,
        name,
        role,
      };
    });

    resolved.sort((a, b) =>
      a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' }) ||
      a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' })
    );

    return resolved.map((p, idx) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      isCaptain: idx === captainIdx,
    }));
  };

  const executeCreateMatch = async (status: 'live' | 'upcoming') => {
    if (!team1Obj || !team2Obj) return;

    const team1Players = getTeamPlayers(team1Obj, team1CaptainIdx);
    const team2Players = getTeamPlayers(team2Obj, team2CaptainIdx);

    const setup: MatchSetup = {
      team1Id: team1Obj.id,
      team2Id: team2Obj.id,
      team1Name: team1Obj.teamName,
      team2Name: team2Obj.teamName,
      team1ShortName: team1Obj.shortName || team1Obj.teamName.substring(0, 3).toUpperCase(),
      team2ShortName: team2Obj.shortName || team2Obj.teamName.substring(0, 3).toUpperCase(),
      team1Color: getTeamColor(team1Obj.id || team1Obj.teamName),
      team2Color: getTeamColor(team2Obj.id || team2Obj.teamName),
      teamSize: Math.max(team1Players.length, team2Players.length, 2),
      overs,
      extraRunsCounted,
      venue: venue.trim() || 'Local Ground',
      date: matchDate,
      time: matchTime || undefined,
      team1CaptainIdx,
      team2CaptainIdx,
      scorerId: currentUser?.id || null,
      creatorId: currentUser?.id || null,
      status,
    };

    const result = editingMatchId
      ? await matchAPI.updateMatch({
          ...(matches.find(m => m.id === editingMatchId) as Match),
          team1: { ...(matches.find(m => m.id === editingMatchId) as Match).team1, id: team1Obj.id, name: team1Obj.teamName, shortName: setup.team1ShortName!, color: setup.team1Color!, players: team1Players },
          team2: { ...(matches.find(m => m.id === editingMatchId) as Match).team2, id: team2Obj.id, name: team2Obj.teamName, shortName: setup.team2ShortName!, color: setup.team2Color!, players: team2Players },
          maxOvers: setup.overs, format: `T${setup.overs}`, extraRunsCounted: setup.extraRunsCounted,
          venue: setup.venue, date: setup.date, time: setup.time || undefined, status,
        })
      : await matchAPI.createMatch(setup, team1Players, team2Players);
    if (result.success && result.data) {
      const matchData = result.data;
      onUpdateMatch(matchData);
      await onRefreshMatches();

      if (status === 'live') {
        setEditingMatchId(null);
        setCurrentMatchId(matchData.id);
        setShowMatchForm(false);
        // Load session created by backend
        const sessionResult = await scoringAPI.getCurrentMatchState(matchData.id);
        if (sessionResult.success && sessionResult.data) {
          setSession(sessionResult.data.session);
          setMatch(sessionResult.data.match);
        }
      } else {
        // Upcoming match: close creation form and return to match list
        setShowMatchForm(false);
        setSelectedTeam1Id('');
        setSelectedTeam2Id('');
        setTeam1CaptainIdx(0);
        setTeam2CaptainIdx(0);
        setExtraRunsCounted(false);
        setVenue('');
        setEditingMatchId(null);
      }
    }
  };

  const editScheduledMatch = (scheduledMatch: Match) => {
    openConfirmation({
      title: 'Edit Scheduled Match?',
      message: 'Open this scheduled match to review or update its information?',
      confirmText: 'Edit Match', cancelText: 'Cancel', type: 'info',
      onConfirm: () => {
        const team1 = registeredTeams.find(t => t.id === scheduledMatch.team1.id);
        const team2 = registeredTeams.find(t => t.id === scheduledMatch.team2.id);
        setEditingMatchId(scheduledMatch.id);
        setSelectedTeam1Id(team1?.id || scheduledMatch.team1.id);
        setSelectedTeam2Id(team2?.id || scheduledMatch.team2.id);
        setTeam1CaptainIdx(scheduledMatch.team1.players.findIndex(p => p.isCaptain) >= 0 ? scheduledMatch.team1.players.findIndex(p => p.isCaptain) : 0);
        setTeam2CaptainIdx(scheduledMatch.team2.players.findIndex(p => p.isCaptain) >= 0 ? scheduledMatch.team2.players.findIndex(p => p.isCaptain) : 0);
        setOvers(scheduledMatch.maxOvers); setOversInput(String(scheduledMatch.maxOvers));
        setExtraRunsCounted(Boolean(scheduledMatch.extraRunsCounted)); setVenue(scheduledMatch.venue || '');
        setMatchDate(scheduledMatch.date || new Date().toISOString().split('T')[0]); setMatchTime(scheduledMatch.time || '');
        setShowMatchForm(true);
      },
    });
  };

  const deleteMatch = (target: Match) => {
    openConfirmation({
      title: 'Delete Match?', message: 'This permanently deletes the match and its scoring state.',
      confirmText: 'Delete', cancelText: 'Cancel', type: 'danger',
      onConfirm: async () => {
        const result = await matchAPI.deleteMatch(target.id);
        if (result.success) { onUpdateMatch({ ...target, status: 'abandoned' }); await onRefreshMatches(); }
      },
    });
  };

  const handleStartNow = () => {
    if (!team1Obj || !team2Obj) return;
    openConfirmation({
      title: 'Start Match Immediately?',
      message: `Create and start live scoring for ${team1Obj.teamName} vs ${team2Obj.teamName} (${overs} overs) now? Status will be set to LIVE.`,
      confirmText: 'Yes, Start Now',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: () => executeCreateMatch('live'),
    });
  };

  const handleScheduleLater = () => {
    if (!team1Obj || !team2Obj) return;
    openConfirmation({
      title: 'Schedule Match for Later?',
      message: `Schedule ${team1Obj.teamName} vs ${team2Obj.teamName} (${overs} overs) at ${venue.trim() || 'Local Ground'}? Status will be set to UPCOMING.`,
      confirmText: 'Yes, Schedule',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: () => executeCreateMatch('upcoming'),
    });
  };

  const handleStartUpcomingMatch = (upcomingMatch: Match) => {
    openConfirmation({
      title: 'Start Upcoming Match?',
      message: `Start live scoring for scheduled match between ${upcomingMatch.team1.name} and ${upcomingMatch.team2.name}? Status will change to LIVE.`,
      confirmText: 'Yes, Start Match',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: async () => {
        const updated = { ...upcomingMatch, status: 'live' as const };
        await matchAPI.updateMatch(updated);
        onUpdateMatch(updated);
        await onRefreshMatches();
        setCurrentMatchId(updated.id);
        const sessionResult = await scoringAPI.getCurrentMatchState(updated.id);
        if (sessionResult.success && sessionResult.data) {
          setSession(sessionResult.data.session);
          setMatch(sessionResult.data.match);
        }
      },
    });
  };

  const handleBackFromMatchForm = () => {
    openConfirmation({
      title: 'Exit Match Creation?',
      message: 'Are you sure you want to exit match setup? Any selected teams or configuration will not be saved.',
      confirmText: 'Yes, Exit',
      cancelText: 'No, Stay',
      type: 'warning',
      onConfirm: () => {
        setSelectedTeam1Id('');
        setSelectedTeam2Id('');
        setTeam1CaptainIdx(0);
        setTeam2CaptainIdx(0);
        setExtraRunsCounted(false);
        setVenue('');
        setShowMatchForm(false);
      },
    });
  };

  const handleBackFromLiveScoring = () => {
    openConfirmation({
      title: 'Exit Match Scoring?',
      message: 'Are you sure you want to return to live matches? Your match progress is saved in MongoDB and you can resume scoring anytime.',
      confirmText: 'Yes, Exit',
      cancelText: 'No, Stay',
      type: 'info',
      onConfirm: () => {
        setCurrentMatchId(null);
        setSession(null);
        setMatch(null);
        onRefreshMatches();
      },
    });
  };

  const handlePlusClick = () => {
    openConfirmation({
      title: 'Create New Match?',
      message: 'Would you like to set up and score a new cricket match?',
      confirmText: 'Yes, Proceed',
      cancelText: 'No, Cancel',
      type: 'info',
      onConfirm: () => {
        setSelectedTeam1Id('');
        setSelectedTeam2Id('');
        setTeam1CaptainIdx(0);
        setTeam2CaptainIdx(0);
        setExtraRunsCounted(false);
        setVenue('');
        setShowMatchForm(true);
      },
    });
  };

  const handleTossComplete = async (winner: string, decision: string) => {
    if (!currentMatchId) return;

    // Send toss to backend - server computes batting/bowling teams and updates match & session
    const res = await scoringAPI.completeToss(currentMatchId, winner, decision);
    if (res.success && res.data) {
      setSession(res.data.session);
      setMatch(res.data.match);
      onUpdateMatch(res.data.match);
    }
  };

  // ── Scoring Handlers ──

  const handleSelectOpeners = async (strikerIdx: number, nonStrikerIdx: number) => {
    if (!currentMatchId) return;
    const result = await scoringAPI.selectOpeners(currentMatchId, strikerIdx, nonStrikerIdx);
    if (result.success && result.data) {
      setSession(result.data.session);
      setMatch(result.data.match);
      onUpdateMatch(result.data.match);
    }
  };

  const handleSelectBowler = async (bowlerIdx: number) => {
    if (!currentMatchId) return;
    const result = await scoringAPI.selectBowler(currentMatchId, bowlerIdx);
    if (result.success && result.data) {
      setSession(result.data.session);
      setMatch(result.data.match);
      onUpdateMatch(result.data.match);
    }
    setShowChangeBowlerModal(false);
  };

  const handleScoreRun = async (runs: number) => {
    if (!currentMatchId) return;
    const result = await scoringAPI.scoreRuns(currentMatchId, runs);
    if (result.success && result.data) {
      setSession(result.data.state);
      setMatch(result.data.match);
      onUpdateMatch(result.data.match);
    }
  };

  const handleWicket = () => {
    if (!currentMatchId || !session) return;
    setShowWicketModal(true);
  };

  const handleWicketConfirm = async (details: WicketDetails) => {
    if (!currentMatchId || !session) return;

    // If run-out, ask for runs scored
    if (details.type === 'run-out') {
      setPendingRunOutDetails(details);
      setShowWicketModal(false);
      setShowRunOutRunsModal(true);
      return;
    }

    // Get fielder name(s) if provided
    let fielderName: string | undefined;
    let fielderNames: string[] | undefined;
    let fielderId: string | undefined;
    let fielderIds: string[] | undefined;

    if (details.fielderIdx !== undefined && match) {
      const { bowlingTeam } = getBattingBowlingTeams(session, match);

      // For caught, stumped - fielder is from bowling team
      if (details.type === 'caught' || details.type === 'stumped') {
        const p = bowlingTeam?.players[details.fielderIdx];
        fielderName = p?.name;
        fielderId = p?.id;
      }
    }

    const result = await scoringAPI.recordWicket(
      currentMatchId,
      details.type,
      fielderName,
      details.otherBatsmanIdx,
      fielderNames,
      0,
      fielderId,
      fielderIds
    );

    if (result.success && result.data) {
      setSession(result.data.state);
      await syncMatch();
    }

    setShowWicketModal(false);
  };

  const handleRunOutRunsConfirm = async (runsScored: number) => {
    if (!currentMatchId || !session || !pendingRunOutDetails) return;

    // Get fielder name(s) and ID(s) if provided
    let fielderName: string | undefined;
    let fielderNames: string[] | undefined;
    let fielderId: string | undefined;
    let fielderIds: string[] | undefined;

    if (pendingRunOutDetails.fielderIdxs && pendingRunOutDetails.fielderIdxs.length > 0 && match) {
      const { bowlingTeam } = getBattingBowlingTeams(session, match);
      const matchedPlayers = pendingRunOutDetails.fielderIdxs.map(idx => bowlingTeam?.players[idx]).filter(Boolean);
      fielderNames = matchedPlayers.map(p => p.name);
      fielderIds = matchedPlayers.map(p => p.id);
      if (matchedPlayers.length === 1) {
        fielderName = matchedPlayers[0].name;
        fielderId = matchedPlayers[0].id;
      }
    }

    const result = await scoringAPI.recordWicket(
      currentMatchId,
      pendingRunOutDetails.type,
      fielderName,
      pendingRunOutDetails.otherBatsmanIdx,
      fielderNames,
      runsScored,
      fielderId,
      fielderIds,
      pendingRunOutDetails.runOutEnd
    );

    if (result.success && result.data) {
      setSession(result.data.state);
      await syncMatch();
    }

    setShowRunOutRunsModal(false);
    setPendingRunOutDetails(null);
  };

  const handleRetiredHurt = () => {
    if (!currentMatchId || !session) return;
    setShowRetiredHurtSelectModal(true);
  };

  const handleConfirmRetiredHurtSelect = async (targetBatsmanIdx: number) => {
    if (!currentMatchId) return;
    setShowRetiredHurtSelectModal(false);
    const result = await scoringAPI.recordRetiredHurt(currentMatchId, targetBatsmanIdx);
    if (result.success && result.data) {
      setSession(result.data.state);
      await syncMatch();
    }
  };

  const handleConfirmRetiredHurt = async (canReturn: boolean) => {
    if (!currentMatchId) return;
    const result = await scoringAPI.confirmRetiredHurt(currentMatchId, canReturn);
    if (result.success && result.data) {
      setSession(result.data.state);
      await syncMatch();
    }
  };

  const handleWide = async () => {
    if (!currentMatchId || !session) return;
    // For wides, ask for extra runs only when 'Extra Runs Counted' toggle is enabled
    if (session.extraRunsCounted) {
      setShowWideRunsModal(true);
    } else {
      // Disabled: directly record wide with 0 extra runs
      const result = await scoringAPI.recordWide(currentMatchId, 0);
      if (result.success && result.data) {
        setSession(result.data.state);
        await syncMatch();
      }
    }
  };

  const handleWideRunsConfirm = async (runsScored: number) => {
    if (!currentMatchId) return;
    const result = await scoringAPI.recordWide(currentMatchId, runsScored);
    if (result.success && result.data) {
      setSession(result.data.state);
      await syncMatch();
    }
    setShowWideRunsModal(false);
  };

  const handleNoBall = () => {
    // When clicking No-Ball, first ask: was there a run-out or not?
    setPendingNoBallRuns(null);
    setPendingNoBallWicket(null);
    setShowNoBallRunOutConfirm(true);
  };

  const handleNoBallRunsConfirm = async (runsScored: number) => {
    setShowNoBallRunsModal(false);
    if (pendingNoBallWicket) {
      const details = pendingNoBallWicket;
      setPendingNoBallWicket(null);
      if (!currentMatchId || !session) return;
      let fielderName: string | undefined;
      let fielderNames: string[] | undefined;
      let fielderId: string | undefined;
      let fielderIds: string[] | undefined;
      if (details.fielderIdxs && match) {
        const { bowlingTeam } = getBattingBowlingTeams(session, match);
        const players = details.fielderIdxs.map(i => bowlingTeam.players[i]).filter(Boolean);
        fielderNames = players.map(p => p.name); fielderIds = players.map(p => p.id);
        if (players.length === 1) { fielderName = players[0].name; fielderId = players[0].id; }
      }
      const result = await scoringAPI.recordNoBallRunOut(currentMatchId, runsScored, details.otherBatsmanIdx, fielderName, fielderNames, fielderId, fielderIds, details.runOutEnd);
      if (result.success && result.data) { setSession(result.data.state); await syncMatch(); }
      return;
    }

    // Plain No-Ball without run out
    if (!currentMatchId) return;
    const result = await scoringAPI.recordNoBall(currentMatchId, runsScored);
    if (result.success && result.data) {
      setSession(result.data.state);
      await syncMatch();
    }
  };

  // User chose No to Run-Out on No-Ball -> show runs modal only
  const handleNoBallRunOutDeclined = () => {
    setShowNoBallRunOutConfirm(false);
    setShowNoBallRunsModal(true);
  };

  // User chose Yes to Run-Out on No-Ball -> show run-out selection modal
  const handleNoBallRunOutAccepted = () => {
    setShowNoBallRunOutConfirm(false);
    setShowNoBallRunOutWicketModal(true);
  };

  // User confirmed run-out details from the no-ball run-out wicket modal
  const handleNoBallRunOutWicketConfirm = async (details: WicketDetails) => {
    if (!currentMatchId || !session) return;
    setShowNoBallRunOutWicketModal(false);

    let fielderName: string | undefined;
    let fielderNames: string[] | undefined;
    let fielderId: string | undefined;
    let fielderIds: string[] | undefined;

    if (details.fielderIdxs && details.fielderIdxs.length > 0 && match) {
      const { bowlingTeam } = getBattingBowlingTeams(session, match);
      const matchedPlayers = details.fielderIdxs.map(idx => bowlingTeam?.players[idx]).filter(Boolean);
      fielderNames = matchedPlayers.map(p => p!.name);
      fielderIds = matchedPlayers.map(p => p!.id);
      if (matchedPlayers.length === 1) {
        fielderName = matchedPlayers[0]!.name;
        fielderId = matchedPlayers[0]!.id;
      }
    }

    const result = await scoringAPI.recordNoBallRunOut(
      currentMatchId,
      pendingNoBallRuns ?? 0,
      details.otherBatsmanIdx,
      fielderName,
      fielderNames,
      fielderId,
      fielderIds,
      details.runOutEnd
    );

    setPendingNoBallRuns(null);

    if (result.success && result.data) {
      setSession(result.data.state);
      await syncMatch();
    }
  };

  const handleSelectNextBatsman = async (batsmanIdx: number) => {
    if (!currentMatchId) return;
    const result = await scoringAPI.selectNextBatsman(currentMatchId, batsmanIdx);
    if (result.success && result.data) {
      setSession(result.data.session);
      setMatch(result.data.match);
      onUpdateMatch(result.data.match);
    }
  };

  const executeUndo = async () => {
    if (!currentMatchId) return;
    const result = await scoringAPI.undoLastAction(currentMatchId);
    if (result.success && result.data) {
      setSession(result.data.state);
      setMatch(result.data.match);
      onUpdateMatch(result.data.match);
    }
  };

  const handleUndo = () => {
    if (!currentMatchId || !session || session.ballEvents.length === 0) return;
    openConfirmation({
      title: 'Undo Last Ball?',
      message: 'Are you sure you want to undo the last delivery and revert the match score?',
      confirmText: 'Yes, Undo',
      cancelText: 'No, Keep',
      type: 'warning',
      onConfirm: executeUndo,
    });
  };

  const handleSwapStrike = async () => {
    if (!currentMatchId) return;
    const result = await scoringAPI.swapStrike(currentMatchId);
    if (result.success && result.data) {
      setSession(result.data.session);
      setMatch(result.data.match);
      onUpdateMatch(result.data.match);
    }
  };

  const handleStartSecondInnings = async () => {
    if (!currentMatchId || !match || !session) return;
    const result = await scoringAPI.startSecondInnings(currentMatchId);
    if (result.success && result.data) {
      setSession(result.data.session);
      setMatch(result.data.match);
      onUpdateMatch(result.data.match);
    }
  };

  const handleStartSuperOver = async () => {
    if (!currentMatchId) return;
    const result = await scoringAPI.startSuperOver(currentMatchId);
    if (result.success && result.data) {
      setSession(result.data.session);
      setMatch(result.data.match);
      onUpdateMatch(result.data.match);
    }
  };

  const handleDeclineSuperOver = async () => {
    if (!currentMatchId) return;
    const result = await scoringAPI.declineSuperOver(currentMatchId);
    if (result.success && result.data) {
      setSession(result.data.session);
      setMatch(result.data.match);
      onUpdateMatch(result.data.match);
    }
  };

  const executeEndMatch = async () => {
    if (!currentMatchId) return;
    const result = await scoringAPI.endMatch(currentMatchId);
    if (result.success) {
      setSession(null);
      setCurrentMatchId(null);
      setPreviewPhase('none');
      // Refresh all matches from backend to get updated status
      await onRefreshMatches();
    }
  };

  const handleEndMatch = () => {
    if (!session) return;
    // Open the End Options modal (Abandon vs End Innings / End Match)
    setShowEndOptionsModal(true);
  };

  const handleSelectEndOption = (option: 'abandon' | 'endInnings' | 'endMatch') => {
    setShowEndOptionsModal(false);
    if (option === 'endInnings') {
      setPreviewPhase('inningsBreak');
    } else if (option === 'abandon') {
      setPreviewTerminalIntent('abandon');
      setPreviewPhase('matchComplete');
    } else if (option === 'endMatch') {
      setPreviewTerminalIntent('endMatch');
      setPreviewPhase('matchComplete');
    }
  };

  const handleConfirmInningsBreakFromPreview = async () => {
    if (!currentMatchId) return;
    setPreviewPhase('none');
    await handleStartSecondInnings();
  };

  const handleConfirmTerminalActionFromPreview = async (action: 'abandon' | 'endMatch') => {
    if (!currentMatchId || !match) return;
    if (action === 'abandon') {
      // Update match to abandoned
      const result = await matchAPI.updateMatch({
        ...match,
        status: 'abandoned',
        result: 'Match Abandoned',
      });
      if (result.success) {
        setSession(null);
        setCurrentMatchId(null);
        setPreviewPhase('none');
        await onRefreshMatches();
      }
    } else {
      // Regular end match
      await executeEndMatch();
    }
  };

  const syncMatch = async () => {
    if (!currentMatchId) return;
    const result = await scoringAPI.getCurrentMatchState(currentMatchId);
    if (result.success && result.data) {
      setMatch(result.data.match);
      // Only update if the match is still live (don't overwrite completed status)
      if (result.data.match.status === 'live') {
        onUpdateMatch(result.data.match);
      }
    }
  };

  // ── Phase: Select Match ──
  if (!currentMatchId) {
    // Show form if user clicked "Add Match"
    if (showMatchForm) {
      return (
        <div className="space-y-4">
          <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 text-white px-4 h-14 flex items-center sticky top-0 z-40 shadow-md">
            <button
              onClick={handleBackFromMatchForm}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 active:bg-white/20 rounded-full transition-colors z-10 shrink-0"
              aria-label="Back to match selection"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center px-14 pointer-events-none">
            <h2 className="text-lg font-bold tracking-tight truncate text-center">{editingMatchId ? 'Edit Scheduled Match' : 'Create New Match'}</h2>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <MatchSetupForm
              registeredTeams={registeredTeams}
              registeredPlayers={registeredPlayers}
              selectedTeam1Id={selectedTeam1Id}
              setSelectedTeam1Id={(id) => {
                setSelectedTeam1Id(id);
                setTeam1CaptainIdx(0);
              }}
              selectedTeam2Id={selectedTeam2Id}
              setSelectedTeam2Id={(id) => {
                setSelectedTeam2Id(id);
                setTeam2CaptainIdx(0);
              }}
              team1CaptainIdx={team1CaptainIdx}
              setTeam1CaptainIdx={setTeam1CaptainIdx}
              team2CaptainIdx={team2CaptainIdx}
              setTeam2CaptainIdx={setTeam2CaptainIdx}
              overs={overs}
              setOvers={setOvers}
              oversInput={oversInput}
              setOversInput={setOversInput}
              extraRunsCounted={extraRunsCounted}
              setExtraRunsCounted={setExtraRunsCounted}
              venue={venue}
              setVenue={setVenue}
              matchDate={matchDate}
              setMatchDate={setMatchDate}
              matchTime={matchTime}
              setMatchTime={setMatchTime}
              isLoadingTeams={isLoadingTeams}
              onStartNow={handleStartNow}
              onScheduleLater={handleScheduleLater}
            />

            <ConfirmationModal
              isOpen={confirmModal.isOpen}
              title={confirmModal.title}
              message={confirmModal.message}
              confirmText={confirmModal.confirmText}
              cancelText={confirmModal.cancelText}
              type={confirmModal.type}
              icon={confirmModal.icon}
              onConfirm={confirmModal.onConfirm}
              onCancel={closeConfirmation}
            />
          </div>
        </div>
      );
    }

    // Show initial view with "Add Match" button
    return (
      <div className="space-y-4">
        {/* Header with rich transitioning gradient */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 text-white px-4 h-14 flex items-center justify-end sticky top-0 z-40 shadow-md">
          <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center px-14 pointer-events-none">
            <h2 className="text-lg font-bold tracking-tight truncate text-center">Match Scoring</h2>
          </div>
          <button
            onClick={handlePlusClick}
            className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl shadow-sm backdrop-blur-sm transition-all border border-white/20 z-10 shrink-0"
            title="Add Match"
            aria-label="Add Match"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
        {/* Scorable matches for current user */}
        {(() => {
          const isUserAuthorized = (m: Match) => {
            if (!currentUser?.id) return false;
            if (m.creatorId && m.creatorId === currentUser.id) return true;
            if (m.scorerId && m.scorerId === currentUser.id) return true;
            // Fallback for legacy matches with neither field set
            if (!m.creatorId && !m.scorerId) return true;
            return false;
          };

          const scorableLiveMatches = liveMatches.filter(isUserAuthorized);
          const scorableUpcomingMatches = upcomingMatches.filter(isUserAuthorized);

          const hasMatches = scorableLiveMatches.length > 0 || scorableUpcomingMatches.length > 0;

          return hasMatches ? (
            <div className="space-y-4">
              {scorableLiveMatches.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">Continue Scoring</h3>
                  {scorableLiveMatches.map(m => (
                    <div
                      key={m.id}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-2 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center gap-2"
                    >
                      <button onClick={() => setCurrentMatchId(m.id)} className="flex-1 text-left cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800 dark:text-slate-100">{m.team1.name} vs {m.team2.name}</span>
                        <span className="text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 px-2.5 py-0.5 rounded-full animate-pulse">LIVE</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                        <span>{m.venue || 'Local Ground'} • T{m.maxOvers}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">Resume scoring →</span>
                      </div>
                      </button>
                      {currentUser?.id && m.creatorId === currentUser.id && (
                        <button onClick={() => deleteMatch(m)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer" title="Delete match" aria-label="Delete match"><Trash2 size={18} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {scorableUpcomingMatches.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">Scheduled Matches</h3>
                  {scorableUpcomingMatches.map(m => (
                    <div
                      key={m.id}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-2 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between gap-3"
                    >
                      <button className="flex-1 min-w-0 text-left cursor-pointer" onClick={() => editScheduledMatch(m)}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 dark:text-slate-100 truncate">{m.team1.name} vs {m.team2.name}</span>
                          <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full shrink-0">UPCOMING</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                          <span>{m.venue || 'Local Ground'} • T{m.maxOvers} • {m.date || 'Scheduled'}{m.time ? ` at ${m.time}` : ''}</span>
                        </div>
                      </button>
                      {currentUser?.id && m.creatorId === currentUser.id && (
                        <button onClick={() => deleteMatch(m)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete match" aria-label="Delete match"><Trash2 size={18} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <p className="text-gray-500 dark:text-slate-300 font-medium">No Matches Available to Score</p>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">Matches you create (live or scheduled) will appear here for you to score.</p>
            </div>
          );
        })()}

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmation}
        />
        </div>
      </div>
    );
  }

  // ── Scoring UI ──
  if (!session || !match) {
    return <div className="p-4">Loading...</div>;
  }

  const phase = session.phase;
  const striker = session.batsmenStats[session.strikerIdx];
  const nonStriker = session.batsmenStats[session.nonStrikerIdx];
  const currentBowler = session.bowlersStats[session.currentBowlerIdx];
  const { battingTeam, bowlingTeam } = getBattingBowlingTeams(session, match);
  const currentInningsData = match.innings && match.innings[session.currentInningsNum];
  const runRate = currentInningsData?.currentRunRate || (
    session.currentOver + session.currentBall / 6 > 0
      ? (session.currentRuns / (session.currentOver + session.currentBall / 6)).toFixed(2)
      : '0.00'
  );

  // Phase: Toss
  if (phase === 'toss') {
    return (
      <>
        <TossPage
          team1={match.team1}
          team2={match.team2}
          onTossComplete={handleTossComplete}
          onBack={handleBackFromLiveScoring}
        />
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmation}
        />
      </>
    );
  }

  // Phase: Select Openers
  if (phase === 'selectOpeners') {
    return (
      <>
        <PlayerSelector
          key="openers"
          title="Select Opening Batsmen"
          subtitle={`Choose 2 openers for ${battingTeam.name}`}
          players={session.batsmenStats.map((b, idx) => ({ idx, name: b.playerName }))}
          selectionCount={2}
          badgeLabels={['Striker', 'Non-Striker']}
          onSelect={(selected) => handleSelectOpeners(selected[0], selected[1])}
          onBack={handleBackFromLiveScoring}
          accentColor="blue"
        />
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmation}
        />
      </>
    );
  }

  // Phase: Select Bowler
  if (phase === 'selectBowler') {
    // Find all bowler indices who bowled legal deliveries in the just-completed over
    const lastOverNum = session.currentOver > 0 ? session.currentOver - 1 : 0;
    const lastOverEvents = session.ballEvents.filter(e => e.over === lastOverNum);
    const lastOverBowlerNames = new Set(lastOverEvents.map(e => e.bowler).filter(Boolean));
    const disabledBowlerIndices = session.bowlersStats
      .map((b, idx) => (lastOverBowlerNames.has(b.playerName) || idx === session.lastBowlerIdx ? idx : -1))
      .filter(idx => idx >= 0);

    return (
      <>
        <PlayerSelector
          key="bowler"
          title="Select Bowler"
          subtitle={`Choose bowler for Over ${session.currentOver + 1}`}
          players={session.bowlersStats.map((b, idx) => ({
            idx,
            name: b.playerName,
            subtitle: `${b.overs}.${b.balls}-${b.maidens}-${b.runs}-${b.wickets}`,
          }))}
          selectionCount={1}
          disabledIndices={disabledBowlerIndices}
          onSelect={(selected) => handleSelectBowler(selected[0])}
          onBack={handleBackFromLiveScoring}
          accentColor="red"
        />
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmation}
        />
      </>
    );
  }

  // Phase: Select Next Batsman
  if (phase === 'selectNextBatsman') {
    // Determine which batsman is currently active at the crease and NOT out
    const activeStriker = session.batsmenStats[session.strikerIdx];
    const activeNonStriker = session.batsmenStats[session.nonStrikerIdx];
    let activeCreaseIdx: number | null = null;
    if (activeStriker && !activeStriker.isOut) {
      activeCreaseIdx = session.strikerIdx;
    } else if (activeNonStriker && !activeNonStriker.isOut) {
      activeCreaseIdx = session.nonStrikerIdx;
    }

    // Include retired hurt players who can return, exclude batsman who is out and exclude active batsman at the crease
    const availableBatsmen = session.batsmenStats
      .map((b, idx) => ({ idx, name: b.playerName, isRetiredHurt: b.isRetiredHurt }))
      .filter((b) => {
        const batsman = session.batsmenStats[b.idx];
        const isCurrentlyBattingAtCrease = b.idx === activeCreaseIdx;
        return (!batsman.isOut || batsman.isRetiredHurt) && !isCurrentlyBattingAtCrease;
      });

    // Disabled indices: batsmen who just retired out cannot return immediately to bat right after retiring
    const disabledBatsmanIndices = session.batsmenStats
      .map((b, idx) => (b.justRetired ? idx : -1))
      .filter((idx) => idx >= 0);

    return (
      <PlayerSelector
        key="nextBatsman"
        title="Select Next Batsman"
        subtitle={`Who comes in to bat? (Wicket #${session.currentWickets})`}
        players={availableBatsmen}
        selectionCount={1}
        disabledIndices={disabledBatsmanIndices}
        onSelect={(selected) => handleSelectNextBatsman(selected[0])}
        onBack={() => {}}
        accentColor="green"
      />
    );
  }

  // Phase: Retired Out Confirm
  if (phase === 'retiredHurtConfirm') {
    const retiredHurtPlayers = session.batsmenStats.filter(b => b.isRetiredHurt);
    const numRetiredHurt = retiredHurtPlayers.length;
    const playerNames = retiredHurtPlayers.map(p => p.playerName).join(', ');

    return (
      <div className="p-4 space-y-4">
        <ConfirmationModal
          isOpen={true}
          title="Retired Out Confirmation"
          message={`${playerNames} ${numRetiredHurt === 1 ? 'has' : 'have'} retired out. Only retired out players are available to bat. Will they return to bat?`}
          confirmText="Yes, Return to Bat"
          cancelText="No, End Innings"
          type="warning"
          icon={<span className="text-3xl">🏥</span>}
          onConfirm={() => handleConfirmRetiredHurt(true)}
          onCancel={() => handleConfirmRetiredHurt(false)}
        />
      </div>
    );
  }

  // Phase: Tie Prompt (Choose End as Tied vs Start Super Over)
  if (phase === 'tiePrompt') {
    return (
      <TiePromptModal
        isOpen={true}
        match={match}
        session={session}
        onStartSuperOver={handleStartSuperOver}
        onDeclineSuperOver={handleDeclineSuperOver}
      />
    );
  }

  // ── Preview Views (from End Options modal, before final confirmation) ──
  if (previewPhase === 'inningsBreak') {
    return (
      <>
        <InningsBreakView
          match={match}
          session={session}
          bowlingTeam={bowlingTeam}
          isConfirmed={false}
          onStartSecondInnings={handleStartSecondInnings}
          onConfirmInningsBreak={handleConfirmInningsBreakFromPreview}
          onResumeScoring={() => setPreviewPhase('none')}
          onBack={handleBackFromLiveScoring}
        />
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmation}
        />
      </>
    );
  }

  if (previewPhase === 'matchComplete') {
    return (
      <>
        <MatchCompleteView
          match={match}
          isConfirmed={false}
          intent={previewTerminalIntent}
          onMarkCompleted={() => {}}
          onConfirmTerminalAction={handleConfirmTerminalActionFromPreview}
          onResumeScoring={() => setPreviewPhase('none')}
          onReturnToMatches={() => {
            setCurrentMatchId(null);
            setSession(null);
            setMatch(null);
            setPreviewPhase('none');
          }}
        />
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmation}
        />
      </>
    );
  }

  // Phase: Innings Break
  if (phase === 'inningsBreak') {
    return (
      <>
        <InningsBreakView
          match={match}
          session={session}
          bowlingTeam={bowlingTeam}
          onStartSecondInnings={handleStartSecondInnings}
          onBack={handleBackFromLiveScoring}
        />
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmation}
        />
      </>
    );
  }

  // Phase: Match Complete
  if (phase === 'matchComplete') {
    return (
      <>
        <MatchCompleteView
          match={match}
          onStartSuperOver={handleStartSuperOver}
          onMarkCompleted={() =>
            openConfirmation({
              title: 'Mark Match Completed?',
              message: 'Confirm the final match status as completed and synchronize player and team statistics?',
              confirmText: 'Yes, Complete Match',
              cancelText: 'Cancel',
              type: 'info',
              onConfirm: async () => {
                const result = await matchAPI.updateMatch({ ...match, status: 'completed' });
                if (result.success) {
                  setMatch((previous) => (previous ? { ...previous, status: 'completed' } : previous));
                  await onRefreshMatches();
                }
              },
            })
          }
          onReturnToMatches={() => {
            setCurrentMatchId(null);
            setSession(null);
            setMatch(null);
          }}
        />
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmation}
        />
      </>
    );
  }

  // Phase: Scoring with Mid-Over Bowler Change active -> show full standalone PlayerSelector view
  if (showChangeBowlerModal && session && match) {
    return (
      <PlayerSelector
        key="changeBowlerMidOver"
        title="Change Bowler (Mid-Over)"
        subtitle={`Select new bowler to complete Over ${session.currentOver + 1} (${session.currentBall} balls bowled)`}
        players={session.bowlersStats.map((b, idx) => ({
          idx,
          name: b.playerName,
          subtitle: `${b.overs}.${b.balls}-${b.maidens}-${b.runs}-${b.wickets}`,
        }))}
        selectionCount={1}
        disabledIndices={[
          session.currentBowlerIdx,
          ...(session.lastBowlerIdx !== null ? [session.lastBowlerIdx] : [])
        ]}
        onSelect={(selected) => handleSelectBowler(selected[0])}
        onBack={() => setShowChangeBowlerModal(false)}
        accentColor="red"
      />
    );
  }

  // Phase: Scoring with Retired Hurt player selection modal active
  if (showRetiredHurtSelectModal && session && match) {
    const activeStriker = session.batsmenStats[session.strikerIdx];
    const activeNonStriker = session.batsmenStats[session.nonStrikerIdx];
    const activeBatsmen = [
      { idx: session.strikerIdx, name: `${activeStriker?.playerName || 'Striker'} (Striker)` },
      { idx: session.nonStrikerIdx, name: `${activeNonStriker?.playerName || 'Non-Striker'} (Non-Striker)` }
    ];

    return (
      <PlayerSelector
        key="retiredHurtSelect"
        title="Select Retired Out Batsman"
        subtitle="Whom do you want to retire out?"
        players={activeBatsmen}
        selectionCount={1}
        onSelect={(selected) => handleConfirmRetiredHurtSelect(selected[0])}
        onBack={() => setShowRetiredHurtSelectModal(false)}
        accentColor="yellow"
      />
    );
  }

  // Phase: Scoring
  return (
    <>
      <ScoringDashboardView
        match={match}
        session={session}
        battingTeam={battingTeam}
        runRate={runRate}
        onBack={handleBackFromLiveScoring}
        onScoreRun={handleScoreRun}
        onWide={handleWide}
        onNoBall={handleNoBall}
        onWicket={handleWicket}
        onRetiredHurt={handleRetiredHurt}
        onSwapStrike={handleSwapStrike}
        onUndo={handleUndo}
        onEndMatch={handleEndMatch}
        onChangeBowler={() => {
          if (!session) return;
          const activeBowler = session.bowlersStats[session.currentBowlerIdx];
          openConfirmation({
            title: 'Change Bowler Mid-Over?',
            message: `Are you sure you want to change the bowler mid-over (${activeBowler?.playerName || 'Current bowler'} has bowled ${session.currentBall} ball${session.currentBall > 1 ? 's' : ''} in Over ${session.currentOver + 1})?`,
            confirmText: 'Yes, Change Bowler',
            cancelText: 'Cancel',
            type: 'warning',
            icon: <span className="text-3xl">🎯</span>,
            onConfirm: () => setShowChangeBowlerModal(true),
          });
        }}
      />

      {/* Wicket Modal */}
      {showWicketModal && session && match && (
        <WicketModal
          isOpen={showWicketModal}
          onClose={() => setShowWicketModal(false)}
          onConfirm={handleWicketConfirm}
          batsmen={session.batsmenStats.map((b, idx) => ({
            idx,
            name: b.playerName,
            isOut: b.isOut,
          }))}
          fielders={bowlingTeam.players.map((p, idx) => ({
            idx,
            name: p.name,
          }))}
          strikerIdx={session.strikerIdx}
          nonStrikerIdx={session.nonStrikerIdx}
          initialDetails={pendingRunOutDetails}
        />
      )}

      {/* No-Ball Run-Out Wicket Modal (run-out only) */}
      {showNoBallRunOutWicketModal && session && match && (
        <WicketModal
          isOpen={showNoBallRunOutWicketModal}
          onClose={() => {
            setShowNoBallRunOutWicketModal(false);
            if (pendingNoBallRuns === null) setShowNoBallRunsModal(true);
          }}
          onConfirm={(details) => {
            setShowNoBallRunOutWicketModal(false);
            setPendingNoBallWicket(details);
            setShowNoBallRunsModal(true);
          }}
          batsmen={session.batsmenStats.map((b, idx) => ({
            idx,
            name: b.playerName,
            isOut: b.isOut,
          }))}
          fielders={bowlingTeam.players.map((p, idx) => ({
            idx,
            name: p.name,
          }))}
          strikerIdx={session.strikerIdx}
          nonStrikerIdx={session.nonStrikerIdx}
          runOutOnly
          initialDetails={pendingNoBallWicket}
        />
      )}

      {/* No-Ball Run-Out Confirmation Modal */}
      <NoBallRunOutConfirmModal
        isOpen={showNoBallRunOutConfirm}
        pendingRuns={pendingNoBallRuns}
        onConfirm={handleNoBallRunOutAccepted}
        onDecline={handleNoBallRunOutDeclined}
      />

      {/* Generic Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        icon={confirmModal.icon}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmation}
      />

      {showWideRunsModal && (
        <RunsScoredModal
          title="Wide Ball - Extra Runs"
          subtitle="How many additional runs were scored on this wide?"
          allowedRuns={[0, 1, 2, 3, 4]}
          onConfirm={handleWideRunsConfirm}
          onCancel={() => setShowWideRunsModal(false)}
        />
      )}

      {showNoBallRunsModal && (() => {
        // If there is a pending no-ball run-out wicket, filter allowed runs based on end & out batsman
        let allowedRuns = [0, 1, 2, 3, 4, 6];
        if (pendingNoBallWicket) {
          const isBowlersEnd = pendingNoBallWicket.runOutEnd === 'bowlers-end';
          const isKeepersEnd = pendingNoBallWicket.runOutEnd === 'keepers-end';
          const isStrikerOut = pendingNoBallWicket.otherBatsmanIdx === session?.strikerIdx;
          const isNonStrikerOut = pendingNoBallWicket.otherBatsmanIdx === session?.nonStrikerIdx;

          if ((isBowlersEnd && isNonStrikerOut) || (isKeepersEnd && isStrikerOut)) {
            allowedRuns = [0, 1, 3];
          } else if ((isBowlersEnd && isStrikerOut) || (isKeepersEnd && isNonStrikerOut)) {
            allowedRuns = [0, 2, 4];
          }
        }

        return (
          <RunsScoredModal
            title={pendingNoBallWicket ? "Run Out on No Ball - Runs Scored" : "No Ball - Runs Scored"}
            subtitle={pendingNoBallWicket ? "How many runs were completed before the run out?" : "How many runs were scored off the bat on this no ball?"}
            allowedRuns={allowedRuns}
            onConfirm={handleNoBallRunsConfirm}
            onCancel={() => {
              setShowNoBallRunsModal(false);
              setPendingNoBallWicket(null);
            }}
            onBack={pendingNoBallWicket ? () => {
              setShowNoBallRunsModal(false);
              setShowNoBallRunOutWicketModal(true);
            } : undefined}
          />
        );
      })()}

      {showRunOutRunsModal && (() => {
        // Calculate allowed runs based on run-out end and out batsman
        // Bowler's End + Non-Striker OR Keeper's End + Striker -> Odd completed runs (1, 3) or 0
        // Bowler's End + Striker OR Keeper's End + Non-Striker -> Even completed runs (0, 2, 4)
        const isBowlersEnd = pendingRunOutDetails?.runOutEnd === 'bowlers-end';
        const isKeepersEnd = pendingRunOutDetails?.runOutEnd === 'keepers-end';
        const isStrikerOut = pendingRunOutDetails?.otherBatsmanIdx === session?.strikerIdx;
        const isNonStrikerOut = pendingRunOutDetails?.otherBatsmanIdx === session?.nonStrikerIdx;

        let allowedRuns = [0, 1, 2, 3];
        if ((isBowlersEnd && isNonStrikerOut) || (isKeepersEnd && isStrikerOut)) {
          allowedRuns = [0, 1, 3];
        } else if ((isBowlersEnd && isStrikerOut) || (isKeepersEnd && isNonStrikerOut)) {
          allowedRuns = [0, 2, 4];
        }

        return (
          <RunsScoredModal
            title="Run Out - Runs Scored"
            subtitle="How many runs were completed before the run out?"
            allowedRuns={allowedRuns}
            onConfirm={handleRunOutRunsConfirm}
            onCancel={() => {
              setShowRunOutRunsModal(false);
              setPendingRunOutDetails(null);
            }}
            onBack={() => {
              setShowRunOutRunsModal(false);
              setShowWicketModal(true);
            }}
          />
        );
      })()}

      {/* End Options Modal (Abandon Match vs End Innings / End Match) */}
      <EndOptionsModal
        isOpen={showEndOptionsModal}
        currentInningsNum={session.currentInningsNum}
        onClose={() => setShowEndOptionsModal(false)}
        onSelectOption={handleSelectEndOption}
      />
    </>
  );
}
