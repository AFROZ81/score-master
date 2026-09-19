import { useState, useEffect } from 'react';
import { Match, Innings } from '../types';
import MatchCard from '../components/MatchCard';
import BattingCard from '../components/BattingCard';
import BowlingCard from '../components/BowlingCard';
import Commentary from '../components/Commentary';

interface MatchDetailProps {
  matches?: Match[];
  match: Match | null;
  onSelectMatch?: (matchId: string) => void;
  onBackToList?: () => void;
  onViewScorecard?: () => void;
  onViewCommentary?: () => void;
  showFullScorecard?: boolean;
  showCommentary?: boolean;
}

type StatusTab = 'upcoming' | 'live' | 'completed' | 'abandoned';
type DetailTab = 'info' | 'squads' | 'commentary' | 'scorecard' | 'overs' | 'summary';

export default function MatchDetail({
  matches = [],
  match,
  onSelectMatch,
  onBackToList,
  showFullScorecard,
  showCommentary,
}: MatchDetailProps) {
  // Status tab state for match list view
  const [activeStatusTab, setActiveStatusTab] = useState<StatusTab>('live');

  // Helper to determine initial detail tab based on match status and explicit props
  const getDefaultDetailTab = (m: Match | null): DetailTab => {
    if (showFullScorecard) return 'scorecard';
    if (showCommentary) return 'commentary';
    if (!m) return 'info';
    if (m.status === 'completed') return 'summary';
    if (m.status === 'live') return 'commentary';
    if (m.status === 'upcoming' || m.status === 'abandoned') return 'info';
    return 'info';
  };

  // Detail section tab state for a selected match
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>(() => getDefaultDetailTab(match));

  const [activeInnings, setActiveInnings] = useState(0);

  // When selected match changes, set default tab based on match status & scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveDetailTab(getDefaultDetailTab(match));
  }, [match?.id, match?.status]);

  // Scroll to top instantly when changing status tabs in match list view
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeStatusTab]);

  // Scroll to top instantly when changing detail tabs in match detail view
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeDetailTab]);

  // -------------------------------------------------------------
  // VIEW 1: MATCHES LIST VIEW (When no specific match is selected)
  // -------------------------------------------------------------
  if (!match) {
    const validMatches = matches.filter(m => m && m.id && m.team1 && m.team2);

    const upcomingMatches = validMatches.filter(m => m.status === 'upcoming');
    const liveMatches = validMatches.filter(m => m.status === 'live');
    const completedMatches = validMatches.filter(m => m.status === 'completed');
    const abandonedMatches = validMatches.filter(m => m.status === 'abandoned');

    const getFilteredMatches = () => {
      switch (activeStatusTab) {
        case 'upcoming':
          return upcomingMatches;
        case 'live':
          return liveMatches;
        case 'completed':
          return completedMatches;
        case 'abandoned':
          return abandonedMatches;
        default:
          return [];
      }
    };

    const currentMatches = getFilteredMatches();

    const statusTabs: { id: StatusTab; label: string; count: number; badgeColor?: string }[] = [
      { id: 'upcoming', label: 'Upcoming', count: upcomingMatches.length },
      { id: 'live', label: 'Live', count: liveMatches.length, badgeColor: 'bg-red-500 text-white animate-pulse' },
      { id: 'completed', label: 'Completed', count: completedMatches.length },
      { id: 'abandoned', label: 'Abandoned', count: abandonedMatches.length },
    ];

    return (
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-gray-50 dark:bg-slate-950 transition-colors">
        {/* Switchable Match Status Tabs */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 sticky top-14 z-20 shadow-sm">
          <div className="flex overflow-x-auto scrollbar-hide">
            {statusTabs.map(tab => {
              const isActive = activeStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatusTab(tab.id)}
                  className={`flex-1 min-w-22.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'border-b-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/40'
                      : 'border-b-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-50/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        tab.badgeColor || (isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300')
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Matches List Content */}
        <div className="p-4 flex-1">
          {currentMatches.length > 0 ? (
            <div className="space-y-3">
              {currentMatches.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  onSelect={id => {
                    if (onSelectMatch) {
                      onSelectMatch(id);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <div className="text-5xl mb-3">
                {activeStatusTab === 'live' && '📡'}
                {activeStatusTab === 'upcoming' && '⏳'}
                {activeStatusTab === 'completed' && '🏆'}
                {activeStatusTab === 'abandoned' && '🚫'}
              </div>
              <h3 className="text-base font-bold text-gray-700 dark:text-slate-200">
                {activeStatusTab === 'live' && 'No Live Matches'}
                {activeStatusTab === 'upcoming' && 'No Upcoming Matches'}
                {activeStatusTab === 'completed' && 'No Completed Matches'}
                {activeStatusTab === 'abandoned' && 'No Abandoned Matches'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {activeStatusTab === 'live' && 'There are currently no matches in progress.'}
                {activeStatusTab === 'upcoming' && 'Scheduled upcoming fixtures will appear here.'}
                {activeStatusTab === 'completed' && 'Matches that have concluded with a result will be listed here.'}
                {activeStatusTab === 'abandoned' && 'Matches ended prematurely or without a regular result will appear here.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: MATCH DETAIL VIEW (When a match is selected)
  // -------------------------------------------------------------

  // Defensive check for incomplete match data
  if (!match.team1 || !match.team2) {
    return (
      <div className="p-8 text-center bg-gray-50 dark:bg-slate-950">
        <p className="text-gray-500 dark:text-slate-400 text-sm">Match data is incomplete or unavailable.</p>
        {onBackToList && (
          <button
            onClick={onBackToList}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg shadow-sm cursor-pointer"
          >
            ← Back to Matches
          </button>
        )}
      </div>
    );
  }

  // Include both regular match innings and Super Over innings in `inningsList`
  const inningsList = match.innings || [];
  const currentInningsData = inningsList[activeInnings];

  const getBattingTeam = (innings: Innings) => {
    return match.team1.id === innings.battingTeamId ? match.team1 : match.team2;
  };

  const getBowlingTeam = (innings: Innings) => {
    return match.team1.id === innings.bowlingTeamId ? match.team1 : match.team2;
  };

  const getRunRate = (innings: Innings) => {
    const totalOvers = innings.totalOvers + innings.totalBalls / 6;
    if (totalOvers === 0) return '0.00';
    return (innings.totalRuns / totalOvers).toFixed(2);
  };

  const getRequiredRate = () => {
    if (inningsList.length < 2) return null;
    const firstInnings = inningsList[0];
    const secondInnings = inningsList[1];
    const target = firstInnings.totalRuns + 1;
    const remaining = target - secondInnings.totalRuns;
    const remainingOvers = match.maxOvers - (secondInnings.totalOvers + secondInnings.totalBalls / 6);
    if (remainingOvers <= 0) return null;
    return (remaining / remainingOvers).toFixed(2);
  };

  const requiredRate = getRequiredRate();

  // Determine if innings tabs should be shown based on active tab
  const showInningsTabs = activeDetailTab !== 'info' && activeDetailTab !== 'squads';

  const detailTabs: { id: DetailTab; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'squads', label: 'Squads' },
    { id: 'commentary', label: 'Commentary' },
    { id: 'scorecard', label: 'Scorecard' },
    { id: 'overs', label: 'Overs' },
    { id: 'summary', label: 'Summary' },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Content Tabs Header Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 sticky top-14 z-20 shadow-sm">
        <div className="flex overflow-x-auto scrollbar-hide">
          {detailTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDetailTab(tab.id)}
              className={`shrink-0 px-5 py-3 text-sm font-semibold border-r border-gray-100 dark:border-slate-800 border-b-2 transition-all cursor-pointer ${
                activeDetailTab === tab.id
                  ? 'border-b-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/40'
                  : 'border-b-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-50/60 dark:hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Innings Tabs - Only show when match has multiple innings and viewing relevant tabs */}
      {showInningsTabs && inningsList.length > 1 && (
        <div className="flex bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-24 z-10 shadow-xs overflow-x-auto scrollbar-hide">
          {inningsList.map((innings, idx) => {
            const team = getBattingTeam(innings);
            const isSO = innings.isSuperOver || idx >= 2;
            return (
              <button
                key={idx}
                onClick={() => setActiveInnings(idx)}
                className={`flex-1 min-w-[120px] py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeInnings === idx
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/30'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                {isSO ? `⚡ SO: ${team.shortName}` : team.shortName} {innings.totalRuns}/{innings.totalWickets}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 bg-gray-50 dark:bg-slate-950 transition-colors">
        {/* SUMMARY TAB */}
        {activeDetailTab === 'summary' && (
          currentInningsData ? (
            <div className="p-4 space-y-4">
              {/* Batting Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
                <div className="bg-linear-to-r from-blue-600 to-blue-700 px-4 py-2">
                  <h3 className="text-white font-semibold text-sm">
                    🏏 {getBattingTeam(currentInningsData).name} - Batting
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {currentInningsData.battingStats
                    .filter(stat => stat.runs > 0 || (currentInningsData.currentBatsmen && currentInningsData.currentBatsmen.includes(stat.playerId)))
                    .sort((a, b) => b.runs - a.runs)
                    .slice(0, 2)
                    .map((stat, idx) => {
                      const isCurrentBatsman = currentInningsData.currentBatsmen && currentInningsData.currentBatsmen.includes(stat.playerId);
                      const isRetiredHurt = stat.isRetiredHurt;
                      return (
                        <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2 flex-1">
                            <span
                              className={`text-sm font-medium ${
                                isRetiredHurt
                                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                  : isCurrentBatsman
                                  ? 'text-green-600 dark:text-green-400 font-semibold'
                                  : stat.isOut
                                  ? 'text-gray-600 dark:text-slate-400'
                                  : 'text-gray-800 dark:text-slate-100'
                              }`}
                            >
                              {stat.playerName}
                              {stat.isCaptain && <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold ml-1">(c)</span>}
                            </span>
                            {isRetiredHurt && (
                              <span className="text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 rounded">retired out</span>
                            )}
                            {stat.dismissal && !isRetiredHurt && (() => {
                              let dText = stat.dismissal;
                              if (stat.dismissalType === 'caught' || dText.startsWith('c ')) {
                                const match = dText.match(/^c\s+(.+)\s+b\s+(.+)$/i);
                                if (match && match[1].trim().toLowerCase() === match[2].trim().toLowerCase()) {
                                  dText = `c & b ${match[2].trim()}`;
                                }
                              }
                              return <span className="text-xs text-gray-500 dark:text-slate-400 font-medium ml-1">{dText}</span>;
                            })()}
                            {isCurrentBatsman && !isRetiredHurt && (
                              <span className="text-xs bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-1.5 rounded">batting</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900 dark:text-slate-100">{stat.runs}</span>
                            <span className="text-xs text-gray-500 dark:text-slate-400 ml-1">({stat.balls})</span>
                          </div>
                        </div>
                      );
                    })}
                  {currentInningsData.battingStats.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 dark:text-slate-500">No batting data available yet.</div>
                  )}
                </div>
                <button
                  onClick={() => setActiveDetailTab('scorecard')}
                  className="w-full py-2.5 text-blue-600 dark:text-blue-400 text-sm font-semibold bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                >
                  View Full Scorecard →
                </button>
              </div>

              {/* Bowling Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
                <div className="bg-linear-to-r from-red-600 to-red-700 px-4 py-2">
                  <h3 className="text-white font-semibold text-sm">
                    🎯 {getBowlingTeam(currentInningsData).name} - Bowling
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {currentInningsData.bowlingStats
                    .filter(stat => stat.overs > 0 || stat.balls > 0)
                    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
                    .slice(0, 2)
                    .map((stat, idx) => {
                      const totalBalls = stat.overs * 6 + stat.balls;
                      const economy = totalBalls > 0 ? (stat.runs / totalBalls) * 6 : 0;

                      return (
                        <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm font-medium text-gray-600 dark:text-slate-300">
                            {stat.playerName}
                            {stat.isCaptain && <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold ml-1">(c)</span>}
                          </span>
                          <div className="text-right flex items-center gap-3">
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {stat.overs}-{stat.maidens}-{stat.runs}-{stat.wickets}
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                economy < 6
                                  ? 'text-green-600 dark:text-green-400'
                                  : economy < 8
                                  ? 'text-gray-700 dark:text-slate-200'
                                  : economy < 10
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {economy.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {currentInningsData.bowlingStats.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 dark:text-slate-500">No bowling data available yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 dark:text-slate-500">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300">No summary available yet</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Summary statistics will be displayed once the match begins.</p>
            </div>
          )
        )}

        {/* SCORECARD TAB */}
        {activeDetailTab === 'scorecard' && (
          currentInningsData ? (
            <div className="p-4 space-y-4">
              <BattingCard
                innings={currentInningsData}
                team={getBattingTeam(currentInningsData)}
                crr={currentInningsData.currentRunRate || getRunRate(currentInningsData)}
                rrr={activeInnings === 1 ? (match.requiredRunRate !== undefined ? match.requiredRunRate : requiredRate) : null}
              />
              <BowlingCard
                innings={currentInningsData}
                team={getBowlingTeam(currentInningsData)}
              />

              {/* Fall of Wickets */}
              {currentInningsData.fallOfWickets && currentInningsData.fallOfWickets.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Fall of Wickets</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-800">
                    {currentInningsData.fallOfWickets.map((fow, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-gray-600 dark:text-slate-400">
                          {fow.score}-{fow.wicket}
                        </span>
                        <span className="text-sm text-gray-800 dark:text-slate-200">
                          {fow.batsman} <span className="text-gray-500 dark:text-slate-400 text-xs">({fow.over})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Partnerships */}
              {currentInningsData.partnerships && currentInningsData.partnerships.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Partnerships</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-slate-800/80">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Wkt</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Batsmen</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Runs</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Balls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {currentInningsData.partnerships.map((p, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-slate-400">{p.wicket}</td>
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-slate-200">{p.batsmen}</td>
                            <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900 dark:text-slate-100">{p.runs}</td>
                            <td className="px-4 py-2.5 text-sm text-right text-gray-600 dark:text-slate-400">{p.balls}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 dark:text-slate-500">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300">No scorecard available</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Scorecard details will appear once the innings commences.</p>
            </div>
          )
        )}

        {/* COMMENTARY TAB */}
        {activeDetailTab === 'commentary' && (
          currentInningsData && currentInningsData.ballByBall && currentInningsData.ballByBall.length > 0 ? (
            <Commentary innings={currentInningsData} />
          ) : (
            <div className="p-12 text-center text-gray-400 dark:text-slate-500">
              <div className="text-4xl mb-2">🎙️</div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300">No commentary yet</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Live ball-by-ball updates will be streamed here.</p>
            </div>
          )
        )}

        {/* OVERS TAB */}
        {activeDetailTab === 'overs' && (
          currentInningsData ? (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
                <div className="bg-linear-to-r from-blue-600 to-blue-700 px-4 py-2">
                  <h3 className="text-white font-semibold text-sm">📊 Overs Summary</h3>
                </div>
                <div className="p-4 space-y-3">
                  {(() => {
                    const effectiveRuns = (ball: any) => Math.max(0, (ball.runs || 0) - ((ball.isWide || ball.isNoBall) && !currentInningsData.extraRunsCounted ? 1 : 0));
                    return currentInningsData.overSummaries && currentInningsData.overSummaries.length > 0 ? (
                      currentInningsData.overSummaries.map(over => {
                        const sourceBalls = currentInningsData.ballByBall.filter(b => b.over === over.over);
                        const displayRuns = sourceBalls.reduce((sum, b) => sum + effectiveRuns(b) + ((b.isWide || b.isNoBall) && currentInningsData.extraRunsCounted ? 1 : 0), 0);
                        return (
                          <div key={over.over} className="border border-gray-200 dark:border-slate-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Over {over.overDisplay}</span><span className="text-xs text-gray-500 dark:text-slate-400">•</span><span className="text-xs text-gray-600 dark:text-slate-300">{over.bowler}</span></div><div className="flex items-center gap-3"><span className="text-xs text-gray-500 dark:text-slate-400">{sourceBalls.filter(b => !b.isWide && !b.isNoBall && !b.isRetiredHurt).length} balls</span><span className="text-sm font-bold dark:text-slate-100">{displayRuns} runs</span></div></div>
                            <div className="flex gap-1.5 flex-wrap">{sourceBalls.map((b, i) => { const runs = effectiveRuns(b); const label = b.isRetiredHurt ? 'RO' : b.isNoBall ? 'NB' : b.isWicket ? (runs > 0 ? `W+${runs}` : 'W') : b.isWide ? 'WD' : String(runs); const color = b.isRetiredHurt ? 'bg-amber-500 text-white' : b.isWicket && b.isNoBall ? 'bg-orange-600 text-white' : b.isWicket ? 'bg-red-500 text-white' : b.isWide ? 'bg-yellow-400 text-yellow-900' : b.isNoBall ? 'bg-orange-400 text-white' : runs === 6 ? 'bg-purple-500 text-white' : runs === 4 ? 'bg-blue-500 text-white' : runs === 0 ? 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300' : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'; return <span key={i} className={`min-w-8 h-8 px-2 rounded-full flex items-center justify-center text-xs font-bold whitespace-nowrap ${color}`}>{label}</span>; })}</div>
                          </div>
                        );
                      })
                    ) : <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No overs completed yet.</p>;
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 dark:text-slate-500">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300">No overs bowled yet</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Over-by-over breakdowns will appear as balls are bowled.</p>
            </div>
          )
        )}

        {/* INFO TAB */}
        {activeDetailTab === 'info' && (
          <div className="p-4 space-y-4">
            {/* Match Info */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
              <div className="bg-linear-to-r from-indigo-600 to-indigo-700 px-4 py-3">
                <h3 className="text-white font-semibold">📋 Match Information</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-sm text-gray-500 dark:text-slate-400">Match Type</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{match.matchType || 'Standard'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-sm text-gray-500 dark:text-slate-400">Format</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{match.format}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-sm text-gray-500 dark:text-slate-400">Venue</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-200 text-right max-w-[60%]">{match.venue}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-sm text-gray-500 dark:text-slate-400">Date</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
                    {new Date(match.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {match.time && (
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
                    <span className="text-sm text-gray-500 dark:text-slate-400">Time</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
                      {new Date(`2000-01-01T${match.time}`).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>
                )}
                {match.tossWinner ? (
                  <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500 dark:text-slate-400 font-semibold">Toss</span>
                      {match.tossCoinResult && (
                        <span className="text-xs bg-linear-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-2 py-1 rounded-full font-bold">
                          {match.tossCoinResult === 'heads' ? '👑 HEADS' : '🏏 TAILS'}
                        </span>
                      )}
                    </div>
                    <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{
                            backgroundColor: match.team1.id === match.tossWinner ? match.team1.color : match.team2.color,
                          }}
                        >
                          {match.team1.id === match.tossWinner ? match.team1.shortName : match.team2.shortName}
                        </div>
                        <span className="text-sm font-bold text-gray-800 dark:text-slate-100">
                          {match.team1.id === match.tossWinner ? match.team1.name : match.team2.name} won the toss
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{match.tossDecision === 'bat' ? '🏏' : '⚾'}</span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                          Elected to {match.tossDecision === 'bat' ? 'BAT' : 'BOWL'} first
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
                    <span className="text-sm text-gray-500 dark:text-slate-400">Toss</span>
                    <span className="text-sm font-medium text-gray-400 dark:text-slate-500 italic">Yet to toss</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-slate-400">Status</span>
                  <span
                    className={`text-sm font-semibold ${
                      match.status === 'live'
                        ? 'text-red-600 dark:text-red-400'
                        : match.status === 'completed'
                        ? 'text-green-600 dark:text-green-400'
                        : match.status === 'abandoned'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {match.status === 'live'
                      ? '🔴 Live'
                      : match.status === 'completed'
                      ? '✅ Completed'
                      : match.status === 'abandoned'
                      ? '⚠️ Abandoned'
                      : '⏳ Upcoming'}
                  </span>
                </div>
              </div>
            </div>

            {/* Match Result */}
            {match.result && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
                <div
                  className={`bg-linear-to-r px-4 py-3 ${
                    match.status === 'abandoned'
                      ? 'from-amber-600 to-amber-700'
                      : 'from-green-600 to-green-700'
                  }`}
                >
                  <h3 className="text-white font-semibold">
                    {match.status === 'abandoned' ? '⚠️ Match Result' : '🏆 Match Result'}
                  </h3>
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{match.result}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SQUADS TAB */}
        {activeDetailTab === 'squads' && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Team 1 Squad */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
                <div className="bg-linear-to-r px-3 py-2.5" style={{ backgroundColor: match.team1.color }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-white/20">
                      {match.team1.shortName}
                    </div>
                    <h3 className="text-white font-semibold text-sm truncate">{match.team1.name}</h3>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {match.team1.players && match.team1.players.length > 0 ? (
                    match.team1.players.map((player, idx) => (
                      <div key={player.id || idx} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-slate-300 shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-medium text-gray-800 dark:text-slate-100 truncate">{player.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {player.isCaptain && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-semibold">
                              (c)
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-xs text-gray-400 dark:text-slate-500 text-center">No squad list available</div>
                  )}
                </div>
              </div>

              {/* Team 2 Squad */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
                <div className="bg-linear-to-r px-3 py-2.5" style={{ backgroundColor: match.team2.color }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-white/20">
                      {match.team2.shortName}
                    </div>
                    <h3 className="text-white font-semibold text-sm truncate">{match.team2.name}</h3>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {match.team2.players && match.team2.players.length > 0 ? (
                    match.team2.players.map((player, idx) => (
                      <div key={player.id || idx} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-slate-300 shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-medium text-gray-800 dark:text-slate-100 truncate">{player.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {player.isCaptain && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-semibold">
                              (c)
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-xs text-gray-400 dark:text-slate-500 text-center">No squad list available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
