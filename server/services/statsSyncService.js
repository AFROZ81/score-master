/**
 * Stats Synchronization Service
 * Handles syncing match results, player batting, bowling, fielding, and team match history
 * using pure IDs directly to MongoDB collections.
 */

import { PlayerModel } from '../models/Player.js';
import { TeamModel } from '../models/Team.js';
import { MatchModel } from '../models/Match.js';

export class StatsSyncService {
  /**
   * Helper to convert fractional cricket overs to total legal balls.
   * e.g., 4.2 overs -> 4 * 6 + 2 = 26 balls
   */
  oversToBalls(oversFloat) {
    if (!oversFloat || isNaN(oversFloat)) return 0;
    const fullOvers = Math.floor(oversFloat);
    const balls = Math.round((oversFloat - fullOvers) * 10);
    return fullOvers * 6 + Math.min(balls, 5);
  }

  /**
   * Helper to convert total legal balls to fractional cricket overs.
   * e.g., 26 balls -> 4.2 overs
   */
  ballsToOvers(totalBalls) {
    if (!totalBalls || totalBalls <= 0) return 0.0;
    const fullOvers = Math.floor(totalBalls / 6);
    const remainingBalls = totalBalls % 6;
    return Number(`${fullOvers}.${remainingBalls}`);
  }

  /**
   * Compare two bowling figures (W/R).
   * Returns true if (newW, newR) is strictly better than currentBest.
   * Higher wickets wins; if wickets are equal, fewer runs conceded wins.
   */
  isBetterBowling(newW, newR, currentBestStr) {
    if (!currentBestStr || currentBestStr === '0/0') {
      return newW > 0;
    }
    const parts = currentBestStr.split('/');
    const currentW = Number(parts[0]) || 0;
    const currentR = Number(parts[1]) || 0;

    if (newW > currentW) return true;
    if (newW === currentW && newR < currentR) return true;
    return false;
  }

  /**
   * Synchronize match statistics into Team and Player documents.
   * Guarded by match.statsSynced to ensure idempotency.
   *
   * @param {Db} db - MongoDB database instance
   * @param {string} matchId - Unique match identifier
   * @returns {Promise<{ success: boolean, synced: boolean, message?: string }>}
   */
  async syncMatchStats(db, matchId) {
    if (!db || !matchId) {
      return { success: false, synced: false, message: 'Invalid database or matchId' };
    }

    const matchCollection = db.collection(MatchModel.collectionName);
    const playerCollection = db.collection(PlayerModel.collectionName);
    const teamCollection = db.collection(TeamModel.collectionName);

    // Fetch the match
    const match = await matchCollection.findOne({ id: matchId });
    if (!match) {
      return { success: false, synced: false, message: 'Match not found' };
    }

    // Idempotency check
    if (match.statsSynced === true) {
      return { success: true, synced: false, message: 'Match stats already synchronized' };
    }

    const isAbandoned = match.status === 'abandoned';
    const isCompleted = match.status === 'completed';

    // Only synchronize matches that have concluded
    if (!isAbandoned && !isCompleted) {
      return { success: false, synced: false, message: `Match status is '${match.status}', not terminal` };
    }

    const team1Id = match.team1?.id;
    const team2Id = match.team2?.id;
    const winningTeamId = match.winningTeamId || null;
    const isTie = match.result === 'Match Tied!';

    // ──────────────────────────────────────────────────────────
    // 1. Synchronize Teams Match History (by ID)
    // ──────────────────────────────────────────────────────────
    if (team1Id) {
      const incFields = { 'matchHistory.played': 1 };
      if (isAbandoned) {
        incFields['matchHistory.abandoned'] = 1;
      } else if (isTie) {
        incFields['matchHistory.tied'] = 1;
      } else if (winningTeamId === team1Id) {
        incFields['matchHistory.won'] = 1;
      } else if (winningTeamId) {
        incFields['matchHistory.lost'] = 1;
      }
      await teamCollection.updateOne(
        { id: team1Id },
        { $inc: incFields, $set: { updatedAt: new Date().toISOString() } }
      );
    }

    if (team2Id) {
      const incFields = { 'matchHistory.played': 1 };
      if (isAbandoned) {
        incFields['matchHistory.abandoned'] = 1;
      } else if (isTie) {
        incFields['matchHistory.tied'] = 1;
      } else if (winningTeamId === team2Id) {
        incFields['matchHistory.won'] = 1;
      } else if (winningTeamId) {
        incFields['matchHistory.lost'] = 1;
      }
      await teamCollection.updateOne(
        { id: team2Id },
        { $inc: incFields, $set: { updatedAt: new Date().toISOString() } }
      );
    }

    // ──────────────────────────────────────────────────────────
    // 2. Player Stats Synchronization (Only for Completed Matches)
    // When a match is abandoned, individual player stats are not updated;
    // only the team stats are synced and updated.
    // ──────────────────────────────────────────────────────────
    if (isCompleted) {
      const team1PlayerIds = (match.team1?.players || []).map(p => p.id).filter(Boolean);
      const team2PlayerIds = (match.team2?.players || []).map(p => p.id).filter(Boolean);
      const allParticipatingIds = Array.from(new Set([...team1PlayerIds, ...team2PlayerIds]));

      const inningsList = Array.isArray(match.innings) ? match.innings : [];

      // Pre-aggregate match-level performance per player ID across all innings
      const playerMatchStatsMap = new Map();

      for (const pId of allParticipatingIds) {
        playerMatchStatsMap.set(pId, {
          battingEntries: [],
          bowlingEntries: [],
          catches: 0,
          runOuts: 0,
          stumpings: 0
        });
      }

      // Process each innings
      for (const inn of inningsList) {
        // Batting stats
        const battingStats = Array.isArray(inn.battingStats) ? inn.battingStats : [];
        for (const bStat of battingStats) {
          const pId = bStat.playerId;
          if (pId && playerMatchStatsMap.has(pId)) {
            playerMatchStatsMap.get(pId).battingEntries.push(bStat);
          }
        }

        // Bowling stats
        const bowlingStats = Array.isArray(inn.bowlingStats) ? inn.bowlingStats : [];
        for (const bwStat of bowlingStats) {
          const pId = bwStat.playerId;
          if (pId && playerMatchStatsMap.has(pId)) {
            playerMatchStatsMap.get(pId).bowlingEntries.push(bwStat);
          }
        }

        // Fielding stats from ballEvents (using IDs)
        const ballEvents = Array.isArray(inn.ballByBall) ? inn.ballByBall : [];
        for (const ball of ballEvents) {
          if (!ball.isWicket) continue;

          const fId = ball.fielderId;
          const fIds = Array.isArray(ball.fielderIds) ? ball.fielderIds : (fId ? [fId] : []);

          if (ball.dismissalType === 'caught' && fId && playerMatchStatsMap.has(fId)) {
            playerMatchStatsMap.get(fId).catches += 1;
          } else if (ball.dismissalType === 'stumped' && fId && playerMatchStatsMap.has(fId)) {
            playerMatchStatsMap.get(fId).stumpings += 1;
          } else if (ball.dismissalType === 'run-out') {
            for (const rid of fIds) {
              if (rid && playerMatchStatsMap.has(rid)) {
                playerMatchStatsMap.get(rid).runOuts += 1;
              }
            }
          }
        }
      }

      // ──────────────────────────────────────────────────────────
      // 3. Update Each Player Document in MongoDB (by ID)
      // ──────────────────────────────────────────────────────────
      for (const playerId of allParticipatingIds) {
        const playerDoc = await playerCollection.findOne({ id: playerId });
        if (!playerDoc) continue;

        const currentStats = playerDoc.stats || PlayerModel.createDefaultStats();
        const batting = currentStats.batting || PlayerModel.createDefaultStats().batting;
        const bowling = currentStats.bowling || PlayerModel.createDefaultStats().bowling;
        const fielding = currentStats.fielding || PlayerModel.createDefaultStats().fielding;
        const matchHistory = currentStats.matchHistory || PlayerModel.createDefaultStats().matchHistory;

        // Determine player's team and outcome
        const isTeam1 = team1PlayerIds.includes(playerId);
        const playerTeamId = isTeam1 ? team1Id : team2Id;

        // Update match history
        currentStats.matches = (currentStats.matches || 0) + 1;
        matchHistory.played = (matchHistory.played || 0) + 1;

        if (isTie) {
          matchHistory.tied = (matchHistory.tied || 0) + 1;
        } else if (winningTeamId === playerTeamId) {
          matchHistory.won = (matchHistory.won || 0) + 1;
        } else if (winningTeamId) {
          matchHistory.lost = (matchHistory.lost || 0) + 1;
        }

        const matchData = playerMatchStatsMap.get(playerId);

        // ── Batting Update ──
        for (const bStat of matchData.battingEntries) {
          const didBat = bStat.hasBatted === true || bStat.balls > 0 || bStat.isOut || bStat.isRetiredHurt;
          if (!didBat) continue;

          batting.innings = (batting.innings || 0) + 1;
          batting.runs = (batting.runs || 0) + (bStat.runs || 0);
          batting.balls = (batting.balls || 0) + (bStat.balls || 0);
          batting.fours = (batting.fours || 0) + (bStat.fours || 0);
          batting.sixes = (batting.sixes || 0) + (bStat.sixes || 0);

          if (bStat.isOut) {
            batting.outs = (batting.outs || 0) + 1;
            if (bStat.runs === 0) {
              batting.ducks = (batting.ducks || 0) + 1;
            }
          } else {
            batting.notOuts = (batting.notOuts || 0) + 1;
          }

          if (bStat.runs >= 50 && bStat.runs < 100) {
            batting.fifties = (batting.fifties || 0) + 1;
          }

          if (bStat.runs > (batting.highestScore || 0)) {
            batting.highestScore = bStat.runs;
          }
        }

        // Recompute career batting averages and strike rates
        if (batting.outs > 0) {
          batting.average = Number((batting.runs / batting.outs).toFixed(2));
        } else {
          batting.average = batting.runs || 0.0;
        }
        if (batting.balls > 0) {
          batting.strikeRate = Number(((batting.runs / batting.balls) * 100).toFixed(2));
        } else {
          batting.strikeRate = 0.0;
        }

        // ── Bowling Update ──
        for (const bwStat of matchData.bowlingEntries) {
          const matchLegalBalls = (bwStat.overs || 0) * 6 + (bwStat.balls || 0);
          if (matchLegalBalls === 0) continue;

          bowling.innings = (bowling.innings || 0) + 1;

          // Convert existing career overs to balls and add match balls
          const prevBalls = this.oversToBalls(bowling.overs || 0);
          const totalBalls = prevBalls + matchLegalBalls;
          bowling.overs = this.ballsToOvers(totalBalls);

          bowling.maidens = (bowling.maidens || 0) + (bwStat.maidens || 0);
          bowling.runs = (bowling.runs || 0) + (bwStat.runs || 0);
          bowling.wickets = (bowling.wickets || 0) + (bwStat.wickets || 0);

          if (bwStat.wickets >= 5) {
            bowling.fiveWicketHauls = (bowling.fiveWicketHauls || 0) + 1;
          } else if (bwStat.wickets >= 3) {
            bowling.threeWicketHauls = (bowling.threeWicketHauls || 0) + 1;
          }

          // Compare best bowling
          if (this.isBetterBowling(bwStat.wickets || 0, bwStat.runs || 0, bowling.bestBowling)) {
            bowling.bestBowling = `${bwStat.wickets || 0}/${bwStat.runs || 0}`;
          }
        }

        // Recompute career bowling economy
        const careerTotalBalls = this.oversToBalls(bowling.overs || 0);
        if (careerTotalBalls > 0) {
          bowling.economy = Number(((bowling.runs / careerTotalBalls) * 6).toFixed(2));
        } else {
          bowling.economy = 0.0;
        }

        // ── Fielding Update ──
        fielding.catches = (fielding.catches || 0) + matchData.catches;
        fielding.runOuts = (fielding.runOuts || 0) + matchData.runOuts;
        fielding.stumpings = (fielding.stumpings || 0) + matchData.stumpings;

        // Persist player stats update
        await playerCollection.updateOne(
          { id: playerId },
          {
            $set: {
              stats: {
                matches: currentStats.matches,
                batting,
                bowling,
                fielding,
                matchHistory
              },
              updatedAt: new Date().toISOString()
            }
          }
        );
      }
    }

    // ──────────────────────────────────────────────────────────
    // 4. Mark Match as Synchronized
    // ──────────────────────────────────────────────────────────
    await matchCollection.updateOne(
      { id: matchId },
      {
        $set: {
          statsSynced: true,
          winningTeamId: winningTeamId,
          updatedAt: new Date().toISOString()
        }
      }
    );

    return { success: true, synced: true, message: 'Match stats synchronized successfully' };
  }
}

export const statsSyncService = new StatsSyncService();
