import { useState, useEffect, useRef } from 'react';
import { RegisteredTeam, RegisteredPlayer } from '../types';
import { teamAPI, playerAPI } from '../services/api';
import { Check, Search, Shield, ChevronDown, Edit2 } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import TeamDetailModal from '../components/TeamDetailModal';
import { getTeamColor } from '../services/teamColor';

interface TeamsPageProps {
  currentUser?: RegisteredPlayer | null;
  isCreateMode?: boolean;
  onCloseCreateTeam?: () => void;
  onFormModeChange?: (isFormOpen: boolean) => void;
  onModalStateChange?: (isModalOpen: boolean) => void;
}

export default function TeamsPage({
  currentUser,
  isCreateMode = false,
  onCloseCreateTeam,
  onFormModeChange,
  onModalStateChange,
}: TeamsPageProps) {
  const [teams, setTeams] = useState<RegisteredTeam[]>([]);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit mode state
  const [editingTeam, setEditingTeam] = useState<RegisteredTeam | null>(null);

  // Team detail modal state
  const [selectedTeamForModal, setSelectedTeamForModal] = useState<RegisteredTeam | null>(null);

  // Notify parent whether create/edit form is active to control navbar visibility
  useEffect(() => {
    onFormModeChange?.(Boolean(isCreateMode || editingTeam));
  }, [isCreateMode, editingTeam, onFormModeChange]);

  // Notify parent whether team detail modal is open to hide navbar
  useEffect(() => {
    onModalStateChange?.(selectedTeamForModal !== null);
  }, [selectedTeamForModal, onModalStateChange]);

  // Team creation form state
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [teamSize, setTeamSize] = useState<string>('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal confirmation states for Cancel and Save
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load teams and registered players on mount
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [teamsRes, playersRes] = await Promise.all([
        teamAPI.getTeams(),
        playerAPI.getPlayers(),
      ]);

      if (teamsRes.success && teamsRes.data) {
        const sortedTeams = [...teamsRes.data].sort((a, b) =>
          a.teamName.localeCompare(b.teamName, undefined, { sensitivity: 'base' })
        );
        setTeams(sortedTeams);
      }
      if (playersRes.success && playersRes.data) {
        const sortedPlayers = [...playersRes.data].sort((a, b) =>
          a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' }) ||
          a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' })
        );
        setPlayers(sortedPlayers);
      }
    } catch (err) {
      console.error('Failed to load teams data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setTeamName('');
    setShortName('');
    setTeamSize('');
    setSelectedPlayerIds([]);
    setPlayerSearch('');
    setIsDropdownOpen(false);
    setEditingTeam(null);
  };

  // Reset form when create mode closes and not editing
  useEffect(() => {
    if (!isCreateMode && !editingTeam) {
      resetForm();
    }
  }, [isCreateMode, editingTeam]);

  const handleStartEdit = (team: RegisteredTeam) => {
    // Only team creator can edit
    if (team.creatorId && currentUser?.id && team.creatorId !== currentUser.id) {
      showToast('Only the creator of this team can change team info and roster.');
      return;
    }
    setEditingTeam(team);
    setTeamName(team.teamName);
    setShortName(team.shortName || '');
    setTeamSize(team.teamSize ? String(team.teamSize) : '');
    setSelectedPlayerIds(team.involvedPlayerIds || []);
  };

  const togglePlayerSelection = (playerId: string) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== playerId));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  // Prompt confirmation on Cancel click
  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  // Confirm cancelation
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    resetForm();
    onCloseCreateTeam?.();
  };

  // Prompt confirmation on Save click
  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTeamName = teamName.trim();
    if (!cleanTeamName) {
      showToast('Team Name is required.');
      return;
    }

    setShowSaveModal(true);
  };

  // Execute Save Team after confirmation
  const handleConfirmSave = async () => {
    setShowSaveModal(false);
    setIsSubmitting(true);
    const cleanTeamName = teamName.trim();
    const cleanShortName = shortName.trim().toUpperCase();

    try {
      if (editingTeam) {
        // Update existing team
        const res = await teamAPI.updateTeam(editingTeam.id, {
          teamName: cleanTeamName,
          shortName: cleanShortName || cleanTeamName.substring(0, 3).toUpperCase(),
          teamSize: teamSize ? Number(teamSize) : 11,
          involvedPlayerIds: selectedPlayerIds,
          requestingPlayerId: currentUser?.id,
        });

        if (res.success) {
          showToast(`Team "${cleanTeamName}" updated successfully!`);
          resetForm();
          await loadData();
        } else {
          showToast(res.error || 'Failed to update team.');
        }
      } else {
        // Register new team (colors removed from teams concept)
        const res = await teamAPI.registerTeam({
          teamName: cleanTeamName,
          shortName: cleanShortName || cleanTeamName.substring(0, 3).toUpperCase(),
          teamSize: teamSize ? Number(teamSize) : 11,
          involvedPlayerIds: selectedPlayerIds,
          creatorId: currentUser?.id || null,
        });

        if (res.success) {
          showToast(`Team "${cleanTeamName}" registered successfully!`);
          resetForm();
          onCloseCreateTeam?.();
          await loadData();
        } else {
          showToast(res.error || 'Failed to register team.');
        }
      }
    } catch {
      showToast('Error saving team. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPlayers = players
    .filter(p => {
      if (!playerSearch.trim()) return true;
      const term = playerSearch.toLowerCase();
      return (
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        p.username.toLowerCase().includes(term)
      );
    })
    .sort((a, b) =>
      a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' }) ||
      a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' })
    );

  const showForm = isCreateMode || editingTeam !== null;

  return (
    <div className="p-4 space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 max-w-sm mx-auto z-50 animate-bounce">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-900/95 backdrop-blur-md text-white rounded-xl shadow-xl text-xs font-semibold border border-gray-700">
            <span className="text-base">🏏</span>
            <span className="flex-1">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/70 hover:text-white text-sm font-bold pl-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ FORM: CREATE OR EDIT TEAM ═══════════ */}
      {showForm ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 space-y-5 transition-colors">
          <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
              {editingTeam ? `Edit Team: ${editingTeam.teamName}` : 'Create New Team'}
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              {editingTeam
                ? 'Update team info, add or remove players from the squad'
                : 'Register a team and recruit players for match fixtures'}
            </p>
          </div>

          <form onSubmit={handleSaveClick} className="space-y-4">
            {/* Team Name */}
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide block mb-1.5">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={e => {
                  setTeamName(e.target.value);
                  if (!shortName && !editingTeam) {
                    setShortName(e.target.value.substring(0, 3).toUpperCase());
                  }
                }}
                placeholder="e.g. Royal Challengers"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>

            {/* Short Name & Team Size (Unconstrained) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide block mb-1.5">
                  Short Name
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={shortName}
                  onChange={e => setShortName(e.target.value.toUpperCase())}
                  placeholder="e.g. RCB"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide block mb-1.5">
                  Team Size <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={teamSize}
                  onChange={e => setTeamSize(e.target.value)}
                  placeholder="e.g. 11"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-semibold"
                />
              </div>
            </div>

            {/* Player Selection Dropdown (Optional, only visible inside dropdown) */}
            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                  Select Players <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal lowercase">(optional)</span>
                </label>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {selectedPlayerIds.length} selected
                </span>
              </div>

              {/* Dropdown Toggle Button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700/80 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center justify-between transition-colors shadow-xs cursor-pointer"
              >
                <span>
                  {selectedPlayerIds.length > 0
                    ? `${selectedPlayerIds.length} player${selectedPlayerIds.length === 1 ? '' : 's'} in squad`
                    : 'Choose players from registered list...'}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 dark:text-slate-400 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu Container */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 space-y-2.5 animate-in fade-in duration-150">
                  {/* Search inside Dropdown */}
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                    />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={e => setPlayerSearch(e.target.value)}
                      placeholder="Search player by name or handle..."
                      className="w-full pl-8 pr-3.5 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      autoFocus
                    />
                  </div>

                  {/* Registered Users List Inside Dropdown */}
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 rounded-xl border border-gray-100 dark:border-slate-800">
                    {filteredPlayers.length > 0 ? (
                      filteredPlayers.map(p => {
                        const isSelected = selectedPlayerIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => togglePlayerSelection(p.id)}
                            className={`p-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Avatar Initials */}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shadow-xs shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-linear-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-gray-700 dark:text-slate-200'
                                }`}
                              >
                                {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate">
                                  {p.firstName} {p.lastName}
                                </p>
                                <span className="text-[10px] text-gray-500 dark:text-slate-400">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">{p.playerType}</span>
                                </span>
                              </div>
                            </div>

                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row onClick
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-700 pointer-events-none"
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400 dark:text-slate-500">
                        No registered players found.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(false)}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions with Confirmations */}
            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={handleCancelClick}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 text-gray-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (editingTeam ? 'Updating...' : 'Registering...') : (editingTeam ? 'Update Team' : 'Save Team')}
              </button>
            </div>
          </form>

          {/* Cancel Confirmation Modal */}
          <ConfirmationModal
            isOpen={showCancelModal}
            title={editingTeam ? 'Cancel Team Editing?' : 'Cancel Team Creation?'}
            message="Are you sure you want to cancel? Any unsaved changes will be discarded."
            confirmText="Yes, Cancel"
            cancelText="Keep Editing"
            type="warning"
            onConfirm={handleConfirmCancel}
            onCancel={() => setShowCancelModal(false)}
          />

          {/* Save Confirmation Modal */}
          <ConfirmationModal
            isOpen={showSaveModal}
            title={editingTeam ? 'Confirm Team Updates?' : 'Confirm Team Registration?'}
            message={
              editingTeam
                ? `Update team "${teamName.trim()}" with ${selectedPlayerIds.length} player(s)?`
                : `Are you sure you want to register team "${teamName.trim()}" with ${selectedPlayerIds.length} player(s)?`
            }
            confirmText={editingTeam ? 'Yes, Update Team' : 'Yes, Register Team'}
            cancelText="Review Again"
            type="info"
            onConfirm={handleConfirmSave}
            onCancel={() => setShowSaveModal(false)}
          />
        </div>
      ) : (
        /* ═══════════ TEAMS LIST ═══════════ */
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <p className="text-xs text-gray-400 dark:text-slate-500 animate-pulse">Loading teams...</p>
            </div>
          ) : teams.length > 0 ? (
            teams.map(team => {
              const involvedCount = team.involvedPlayerIds?.length || 0;
              const matchesPlayed = team.matchHistory?.played || 0;
              const matchesWon = team.matchHistory?.won || 0;
              const isCreator = Boolean(currentUser?.id && team.creatorId === currentUser.id);

              return (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamForModal(team)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0"
                        style={{ backgroundColor: getTeamColor(team.id || team.teamName) }}
                      >
                        {team.shortName || team.teamName.substring(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{team.teamName}</h3>
                          {isCreator && (
                            <span className="px-1.5 py-0.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50 rounded text-[9px] font-bold shrink-0">
                              Owner
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium truncate block">
                          {team.teamSize ? `Squad Size: ${team.teamSize} • ` : ''}{involvedCount} Players Registered
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-full text-[10px] font-bold">
                        {team.shortName || 'TM'}
                      </span>
                      {isCreator && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(team);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Team & Players"
                          aria-label="Edit Team"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Team Performance Mini Stats */}
                  <div className="grid grid-cols-4 gap-1.5 text-center bg-gray-50 dark:bg-slate-800/70 rounded-xl p-2 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-400 block">Played</span>
                      <span className="font-bold text-gray-800 dark:text-slate-100">{matchesPlayed}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-400 block">Won</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{matchesWon}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-400 block">Lost</span>
                      <span className="font-bold text-red-500 dark:text-red-400">{team.matchHistory?.lost || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-400 block">Win %</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xl">
                <Shield size={24} />
              </div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">No Teams Created Yet</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
                Create your first team to recruit players and start scoring matches.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Team Detail & Squad Players Modal */}
      <TeamDetailModal
        team={selectedTeamForModal}
        players={players}
        isOpen={selectedTeamForModal !== null}
        onClose={() => setSelectedTeamForModal(null)}
      />
    </div>
  );
}
