/**
 * Match Model
 * Represents a cricket match document in MongoDB ('matches' collection)
 */

export class MatchModel {
  static collectionName = 'matches';

  /**
   * MongoDB JSON Schema for collection validation / documentation
   */
  static schema = {
    bsonType: 'object',
    required: ['id', 'team1', 'team2', 'status', 'maxOvers'],
    properties: {
      id: { bsonType: 'string', description: 'Unique match identifier' },
      team1: {
        bsonType: 'object',
        required: ['id', 'name', 'shortName', 'players'],
        properties: {
          id: { bsonType: 'string' },
          name: { bsonType: 'string' },
          shortName: { bsonType: 'string' },
          color: { bsonType: 'string' },
          players: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['id', 'name'],
              properties: {
                id: { bsonType: 'string' },
                name: { bsonType: 'string' },
                role: { bsonType: 'string' },
                isCaptain: { bsonType: 'bool' }
              }
            }
          }
        }
      },
      team2: {
        bsonType: 'object',
        required: ['id', 'name', 'shortName', 'players'],
        properties: {
          id: { bsonType: 'string' },
          name: { bsonType: 'string' },
          shortName: { bsonType: 'string' },
          color: { bsonType: 'string' },
          players: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['id', 'name'],
              properties: {
                id: { bsonType: 'string' },
                name: { bsonType: 'string' },
                role: { bsonType: 'string' },
                isCaptain: { bsonType: 'bool' }
              }
            }
          }
        }
      },
      format: { bsonType: 'string' },
      maxOvers: { bsonType: 'int' },
      status: { enum: ['upcoming', 'live', 'completed', 'abandoned'] },
      tossWinner: { bsonType: ['string', 'null'] },
      tossDecision: { enum: ['bat', 'bowl', null] },
      currentInnings: { bsonType: 'int' },
      venue: { bsonType: 'string' },
      date: { bsonType: 'string' },
      time: { bsonType: ['string', 'null'] },
      matchType: { bsonType: 'string' },
      result: { bsonType: ['string', 'null'] },
      target: { bsonType: ['int', 'null'] },
      remainingRuns: { bsonType: ['int', 'null'] },
      remainingBalls: { bsonType: ['int', 'null'] },
      requiredRunRate: { bsonType: ['string', 'null'] },
      innings: { bsonType: 'array' },
      liveState: {
        bsonType: ['object', 'null'],
        description: 'Embedded authoritative live scoring state for this match'
      },
      extraRunsCounted: { bsonType: 'bool' },
      statsSynced: { bsonType: 'bool' },
      winningTeamId: { bsonType: ['string', 'null'] },
      scorerId: { bsonType: ['string', 'null'], description: 'User ID of the player designated to score the match' },
      creatorId: { bsonType: ['string', 'null'], description: 'User ID of the player who created the match' },
      createdAt: { bsonType: 'string' },
      updatedAt: { bsonType: 'string' }
    }
  };

  /**
   * Factory method to create a sanitized Match document
   */
  static create(data) {
    const id = data.id || `match-${Date.now()}`;
    const now = new Date().toISOString();

    return {
      id,
      team1: {
        id: data.team1?.id || `team1-${Date.now()}`,
        name: data.team1?.name || 'Team 1',
        shortName: data.team1?.shortName || (data.team1?.name ? data.team1.name.substring(0, 3).toUpperCase() : 'TM1'),
        color: data.team1?.color || '#2563eb',
        players: (data.team1?.players || []).map((p, idx) => ({
          id: p.id || `team1-p${idx}`,
          name: p.name || `Player ${idx + 1}`,
          role: p.role || 'batsman',
          isCaptain: !!p.isCaptain
        }))
      },
      team2: {
        id: data.team2?.id || `team2-${Date.now()}`,
        name: data.team2?.name || 'Team 2',
        shortName: data.team2?.shortName || (data.team2?.name ? data.team2.name.substring(0, 3).toUpperCase() : 'TM2'),
        color: data.team2?.color || '#dc2626',
        players: (data.team2?.players || []).map((p, idx) => ({
          id: p.id || `team2-p${idx}`,
          name: p.name || `Player ${idx + 1}`,
          role: p.role || 'bowler',
          isCaptain: !!p.isCaptain
        }))
      },
      format: data.format || `T${data.maxOvers || 5}`,
      maxOvers: Number(data.maxOvers) || 5,
      extraRunsCounted: typeof data.extraRunsCounted === 'boolean' ? data.extraRunsCounted : false,
      status: data.status || 'live',
      tossWinner: data.tossWinner || null,
      tossDecision: data.tossDecision || null,
      currentInnings: Number(data.currentInnings) || 1,
      venue: data.venue || 'Local Ground',
      date: data.date || now.split('T')[0],
      time: data.time || null,
      matchType: data.matchType || 'Friendly',
      result: data.result || null,
      winningTeamId: data.winningTeamId !== undefined ? data.winningTeamId : null,
      statsSynced: typeof data.statsSynced === 'boolean' ? data.statsSynced : false,
      target: data.target !== undefined ? data.target : null,
      remainingRuns: data.remainingRuns !== undefined ? data.remainingRuns : null,
      remainingBalls: data.remainingBalls !== undefined ? data.remainingBalls : null,
      requiredRunRate: data.requiredRunRate || null,
      innings: Array.isArray(data.innings) ? data.innings : [],
      liveState: data.liveState || null,
      scorerId: data.scorerId || data.creatorId || null,
      creatorId: data.creatorId || data.scorerId || null,
      createdAt: data.createdAt || now,
      updatedAt: now
    };
  }

  /**
   * Validate a match object has mandatory fields
   */
  static validate(match) {
    if (!match || typeof match !== 'object') {
      return { valid: false, error: 'Match must be an object' };
    }
    if (!match.id) {
      return { valid: false, error: 'Match id is required' };
    }
    if (!match.team1 || !match.team2) {
      return { valid: false, error: 'Both team1 and team2 are required' };
    }
    return { valid: true };
  }
}
