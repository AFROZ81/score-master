import { RegisteredTeam, RegisteredPlayer } from '../types';
import { Trophy, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';

export interface MatchSetupUIProps {
  registeredTeams: RegisteredTeam[];
  registeredPlayers: RegisteredPlayer[];
  selectedTeam1Id: string;
  setSelectedTeam1Id: (v: string) => void;
  selectedTeam2Id: string;
  setSelectedTeam2Id: (v: string) => void;
  team1CaptainIdx: number;
  setTeam1CaptainIdx: (idx: number) => void;
  team2CaptainIdx: number;
  setTeam2CaptainIdx: (idx: number) => void;
  overs: number;
  setOvers: (v: number) => void;
  oversInput: string;
  setOversInput: (v: string) => void;
  extraRunsCounted: boolean;
  setExtraRunsCounted: (v: boolean) => void;
  venue: string;
  setVenue: (v: string) => void;
  matchDate: string;
  setMatchDate: (v: string) => void;
  matchTime: string;
  setMatchTime: (v: string) => void;
  isLoadingTeams: boolean;
  onStartNow: () => void;
  onScheduleLater: () => void;
}

import CustomSelect from './CustomSelect';

export default function MatchSetupForm(props: MatchSetupUIProps) {
  const {
    registeredTeams,
    registeredPlayers,
    selectedTeam1Id,
    setSelectedTeam1Id,
    selectedTeam2Id,
    setSelectedTeam2Id,
    team1CaptainIdx,
    setTeam1CaptainIdx,
    team2CaptainIdx,
    setTeam2CaptainIdx,
    oversInput,
    setOversInput,
    setOvers,
    extraRunsCounted,
    setExtraRunsCounted,
    venue,
    setVenue,
    matchDate,
    setMatchDate,
    matchTime,
    setMatchTime,
    isLoadingTeams,
    onStartNow,
    onScheduleLater,
  } = props;

  const [team1CaptainCollapsed, setTeam1CaptainCollapsed] = useState(false);
  const [team2CaptainCollapsed, setTeam2CaptainCollapsed] = useState(false);

  // Auto-expand captain selection when a team is selected
  useEffect(() => {
    if (team1) {
      setTeam1CaptainCollapsed(false);
    }
  }, [selectedTeam1Id]);

  useEffect(() => {
    if (team2) {
      setTeam2CaptainCollapsed(false);
    }
  }, [selectedTeam2Id]);

  const team1 = registeredTeams.find(t => t.id === selectedTeam1Id);
  const team2 = registeredTeams.find(t => t.id === selectedTeam2Id);

  // Helper to resolve player display for a team (alphabetical by First Name)
  const getPlayerDisplayList = (team?: RegisteredTeam) => {
    if (!team || !Array.isArray(team.involvedPlayerIds) || team.involvedPlayerIds.length === 0) {
      return [
        { id: `${team?.id || 'team'}-p1`, name: `${team?.teamName || 'Team'} Player 1`, role: 'Batter' },
        { id: `${team?.id || 'team'}-p2`, name: `${team?.teamName || 'Team'} Player 2`, role: 'Bowler' },
      ];
    }
    const resolved = team.involvedPlayerIds.map((playerId) => {
      const regPlayer = registeredPlayers.find(p => p.id === playerId);
      const firstName = regPlayer?.firstName || '';
      const lastName = regPlayer?.lastName || '';
      const name = regPlayer ? `${firstName} ${lastName}`.trim() : 'Unknown Player';
      const role = regPlayer?.playerType || 'Batter';
      return { id: playerId, firstName, lastName, name, role };
    });

    resolved.sort((a, b) =>
      a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' }) ||
      a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' })
    );

    return resolved.map(p => ({ id: p.id, name: p.name, role: p.role }));
  };

  const team1Players = getPlayerDisplayList(team1);
  const team2Players = getPlayerDisplayList(team2);

  const section1Complete = Boolean(selectedTeam1Id && selectedTeam2Id && selectedTeam1Id !== selectedTeam2Id);
  const section2Complete = oversInput !== '' && parseInt(oversInput) >= 1 && parseInt(oversInput) <= 50;
  const section3Complete = venue.trim().length > 0;
  const allComplete = section1Complete && section2Complete && section3Complete;

  return (
    <div className="space-y-4">
      {/* Section 1: Team Selection from Dropdowns & Captain Choice */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${section1Complete ? 'bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'}`}>
            {section1Complete ? '✓' : '1'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-slate-100 text-sm">Select Teams & Captains</h3>
            <p className="text-xs text-gray-400 dark:text-slate-400">Choose teams and designate each team's captain</p>
          </div>
        </div>

        {isLoadingTeams ? (
          <div className="py-6 text-center text-sm text-gray-400 dark:text-slate-400">Loading registered teams...</div>
        ) : registeredTeams.length < 2 ? (
          <div className="py-4 px-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs">
            At least 2 registered teams are required to create a match. Please register teams in the Teams page first.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Team 1 Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide block">
                Team 1
              </label>
              <CustomSelect
                placeholder="-- Choose Team 1 --"
                value={selectedTeam1Id}
                onChange={(val) => setSelectedTeam1Id(val)}
                options={registeredTeams.map(t => ({
                  value: t.id,
                  label: `${t.teamName}${t.shortName ? ` (${t.shortName})` : ''}`,
                  subtitle: t.involvedPlayerIds?.length ? `${t.involvedPlayerIds.length} players` : undefined,
                  disabled: t.id === selectedTeam2Id,
                }))}
              />

              {team1 && (
                <div className="mt-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100/70 dark:border-blue-900/50 space-y-2">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100/30 dark:hover:bg-blue-900/40 transition-colors"
                    onClick={() => setTeam1CaptainCollapsed(!team1CaptainCollapsed)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                        Select Captain
                      </span>
                      <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/80 px-2 py-0.5 rounded-full font-semibold">
                        Required
                      </span>
                    </div>
                    {team1CaptainCollapsed ? (
                      <ChevronDown size={16} className="text-gray-500 dark:text-slate-400" />
                    ) : (
                      <ChevronUp size={16} className="text-gray-500 dark:text-slate-400" />
                    )}
                  </div>

                  {!team1CaptainCollapsed && (
                    <div className="px-2 pb-2 max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {team1Players.map((player, idx) => {
                        const isSelected = team1CaptainIdx === idx;
                        return (
                          <label
                            key={player.id}
                            onClick={() => setTeam1CaptainIdx(idx)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 shadow-xs'
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-4 h-4 rounded-full border border-black dark:border-slate-400 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-sky-300" />
                                )}
                              </div>
                              <span className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-900 dark:text-blue-200 font-bold' : 'text-gray-800 dark:text-slate-200'}`}>
                                {player.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 shrink-0">
                              {player.role}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Team 2 Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide block">
                Team 2
              </label>
              <CustomSelect
                placeholder="-- Choose Team 2 --"
                value={selectedTeam2Id}
                onChange={(val) => setSelectedTeam2Id(val)}
                options={registeredTeams.map(t => ({
                  value: t.id,
                  label: `${t.teamName}${t.shortName ? ` (${t.shortName})` : ''}`,
                  subtitle: t.involvedPlayerIds?.length ? `${t.involvedPlayerIds.length} players` : undefined,
                  disabled: t.id === selectedTeam1Id,
                }))}
              />

              {team2 && (
                <div className="mt-2 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100/70 dark:border-red-900/50 space-y-2">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-red-100/30 dark:hover:bg-red-900/40 transition-colors"
                    onClick={() => setTeam2CaptainCollapsed(!team2CaptainCollapsed)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                        Select Captain
                      </span>
                      <span className="text-[10px] text-red-700 dark:text-red-300 bg-red-100/80 dark:bg-red-900/80 px-2 py-0.5 rounded-full font-semibold">
                        Required
                      </span>
                    </div>
                    {team2CaptainCollapsed ? (
                      <ChevronDown size={16} className="text-gray-500 dark:text-slate-400" />
                    ) : (
                      <ChevronUp size={16} className="text-gray-500 dark:text-slate-400" />
                    )}
                  </div>

                  {!team2CaptainCollapsed && (
                    <div className="px-2 pb-2 max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {team2Players.map((player, idx) => {
                        const isSelected = team2CaptainIdx === idx;
                        return (
                          <label
                            key={player.id}
                            onClick={() => setTeam2CaptainIdx(idx)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-red-50/60 dark:bg-red-950/60 border-red-300 dark:border-red-700 shadow-xs'
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-4 h-4 rounded-full border border-black dark:border-slate-400 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-sky-300" />
                                )}
                              </div>
                              <span className={`text-xs font-semibold truncate ${isSelected ? 'text-red-900 dark:text-red-200 font-bold' : 'text-gray-800 dark:text-slate-200'}`}>
                                {player.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 shrink-0">
                              {player.role}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedTeam1Id && selectedTeam2Id && selectedTeam1Id === selectedTeam2Id && (
              <p className="text-xs text-red-500 dark:text-red-400 font-medium">Please select two different teams.</p>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Match Rules */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${section2Complete ? 'bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-400'}`}>
            {section2Complete ? '✓' : '2'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-slate-100 text-sm">Match Rules</h3>
            <p className="text-xs text-gray-400 dark:text-slate-400">Configure overs per innings</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide block mb-1">
            Overs per side (1 - 20)
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={oversInput}
            onChange={(e) => {
              setOversInput(e.target.value);
              const n = parseInt(e.target.value);
              if (!isNaN(n) && n >= 1 && n <= 20) {
                setOvers(n);
              }
            }}
            placeholder="e.g. 5, 10, 20"
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none text-sm transition-all"
          />
        </div>

        {/* Extra Runs Counted Toggle */}
        <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block">
              Extra Runs Counted
            </label>
            <p className="text-[11px] text-gray-400 dark:text-slate-400">
              {extraRunsCounted ? 'Extra deliveries award penalty runs' : 'Extra deliveries do not count penalty runs'}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={extraRunsCounted}
            onClick={() => setExtraRunsCounted(!extraRunsCounted)}
            className={`inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              extraRunsCounted ? 'bg-green-500 focus:ring-green-500' : 'bg-red-500 focus:ring-red-500'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                extraRunsCounted ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Section 3: Venue & Schedule */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${section3Complete ? 'bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-400'}`}>
            {section3Complete ? '✓' : '3'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-slate-100 text-sm">Venue & Schedule</h3>
            <p className="text-xs text-gray-400 dark:text-slate-400">Ground and match timing details</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide block mb-1">
              Venue / Stadium
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Eden Gardens, Local Ground"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none text-sm transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide block mb-1">
                Date
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide block mb-1">
                Time (Optional)
              </label>
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none text-sm transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 1x2 Action Grid: Start Match Immediately vs Schedule for Later */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={onScheduleLater}
          disabled={!allComplete}
          className="bg-linear-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white py-3.5 px-3 rounded-xl font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Calendar size={18} className="shrink-0" />
          <span>Schedule for Later</span>
        </button>

        <button
          type="button"
          onClick={onStartNow}
          disabled={!allComplete}
          className="bg-linear-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-3.5 px-3 rounded-xl font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Trophy size={18} className="shrink-0" />
          <span>Start Immediately</span>
        </button>
      </div>
    </div>
  );
}
