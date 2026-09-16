/**
 * Team Model
 * Represents a registered team document in MongoDB ('teams' collection)
 */

export class TeamModel {
  static collectionName = 'teams';

  /**
   * MongoDB JSON Schema for collection validation / documentation
   */
  static schema = {
    bsonType: 'object',
    required: ['id', 'teamName'],
    properties: {
      id: { bsonType: 'string', description: 'Unique team identifier' },
      teamName: { bsonType: 'string', description: 'Name of the team' },
      shortName: { bsonType: 'string' },
      teamSize: { bsonType: 'int', description: 'Standard playing team size' },
      creatorId: { bsonType: ['string', 'null'], description: 'User ID of player who created the team' },
      involvedPlayerIds: {
        bsonType: 'array',
        items: { bsonType: 'string' },
        description: 'Array of player IDs belonging to this team'
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
      },
      createdAt: { bsonType: 'string' },
      updatedAt: { bsonType: 'string' }
    }
  };

  /**
   * Default initial match history for a new team
   */
  static createDefaultMatchHistory() {
    return {
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      abandoned: 0
    };
  }

  /**
   * Sanitizes and structures team data for storing in MongoDB
   */
  static sanitize(data) {
    const now = new Date().toISOString();
    return {
      id: data.id || `team-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      teamName: (data.teamName || '').trim(),
      shortName: (data.shortName || (data.teamName ? data.teamName.substring(0, 3).toUpperCase() : 'TM')).trim(),
      teamSize: Number(data.teamSize) || 11,
      creatorId: data.creatorId || null,
      involvedPlayerIds: Array.isArray(data.involvedPlayerIds) ? data.involvedPlayerIds : [],
      matchHistory: data.matchHistory || TeamModel.createDefaultMatchHistory(),
      createdAt: data.createdAt || now,
      updatedAt: now
    };
  }

  /**
   * Clean team object for client output
   */
  static toClient(doc) {
    if (!doc) return null;
    const { _id, ...clientDoc } = doc;
    return clientDoc;
  }
}
