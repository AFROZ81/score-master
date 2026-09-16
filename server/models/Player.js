/**
 * Player Model
 * Represents a player document in MongoDB ('players' collection)
 */

export class PlayerModel {
  static collectionName = 'players';

  /**
   * MongoDB JSON Schema for collection validation / documentation
   */
  static schema = {
    bsonType: 'object',
    required: ['id', 'username', 'password', 'firstName', 'lastName', 'playerType'],
    properties: {
      id: { bsonType: 'string', description: 'Unique player identifier' },
      username: { bsonType: 'string', description: 'Unique username for login' },
      password: { bsonType: 'string', description: 'Unencrypted password' },
      firstName: { bsonType: 'string' },
      lastName: { bsonType: 'string' },
      playerType: { enum: ['Batter', 'Bowler', 'All-Rounder'] },
      teamsInvolved: {
        bsonType: 'array',
        items: { bsonType: 'string' },
        description: 'List of team IDs or team names involved'
      },
      stats: {
        bsonType: 'object',
        properties: {
          matches: { bsonType: 'int' },
          batting: {
            bsonType: 'object',
            properties: {
              innings: { bsonType: 'int' },
              balls: { bsonType: 'int' },
              runs: { bsonType: 'int' },
              fours: { bsonType: 'int' },
              sixes: { bsonType: 'int' },
              outs: { bsonType: 'int' },
              notOuts: { bsonType: 'int' },
              highestScore: { bsonType: 'int' },
              average: { bsonType: 'double' },
              strikeRate: { bsonType: 'double' },
              fifties: { bsonType: 'int' },
              ducks: { bsonType: 'int' }
            }
          },
          bowling: {
            bsonType: 'object',
            properties: {
              innings: { bsonType: 'int' },
              overs: { bsonType: 'double' },
              maidens: { bsonType: 'int' },
              runs: { bsonType: 'int' },
              wickets: { bsonType: 'int' },
              economy: { bsonType: 'double' },
              threeWicketHauls: { bsonType: 'int' },
              fiveWicketHauls: { bsonType: 'int' },
              bestBowling: { bsonType: 'string' }
            }
          },
          fielding: {
            bsonType: 'object',
            properties: {
              catches: { bsonType: 'int' },
              runOuts: { bsonType: 'int' },
              stumpings: { bsonType: 'int' }
            }
          },
          matchHistory: {
            bsonType: 'object',
            properties: {
              played: { bsonType: 'int' },
              won: { bsonType: 'int' },
              lost: { bsonType: 'int' },
              tied: { bsonType: 'int' },
              abandoned: { bsonType: 'int' }
            }
          }
        }
      },
      createdAt: { bsonType: 'string' },
      updatedAt: { bsonType: 'string' }
    }
  };

  /**
   * Default initial statistics for a newly registered player
   */
  static createDefaultStats() {
    return {
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
        ducks: 0
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
        bestBowling: '0/0'
      },
      fielding: {
        catches: 0,
        runOuts: 0,
        stumpings: 0
      },
      matchHistory: {
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        abandoned: 0
      }
    };
  }

  /**
   * Sanitizes and structures input data for storing in MongoDB
   */
  static sanitize(data) {
    const now = new Date().toISOString();
    return {
      id: data.id || `player-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      username: (data.username || '').trim().toLowerCase(),
      password: data.password || '',
      firstName: (data.firstName || '').trim(),
      lastName: (data.lastName || '').trim(),
      playerType: data.playerType || 'Batter',
      teamsInvolved: Array.isArray(data.teamsInvolved) ? data.teamsInvolved : [],
      stats: data.stats || PlayerModel.createDefaultStats(),
      createdAt: data.createdAt || now,
      updatedAt: now
    };
  }

  /**
   * Clean player object for public view (e.g., omitting password if needed)
   */
  static toClient(doc) {
    if (!doc) return null;
    const { _id, password, ...clientDoc } = doc;
    return clientDoc;
  }
}
