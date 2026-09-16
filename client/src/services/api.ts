/**
 * API Service - Thin HTTP client communicating directly with the backend server and MongoDB.
 * All computations, validations, and state machines are authoritative on the server.
 */

import { Match, Team, ScoringSession, ScorerPhase, RegisteredPlayer, RegisteredTeam } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL;

// ── Types ──

export interface MatchSetup {
  team1Id?: string;
  team2Id?: string;
  team1Name: string;
  team2Name: string;
  team1ShortName?: string;
  team2ShortName?: string;
  team1Color?: string;
  team2Color?: string;
  teamSize?: number;
  overs: number;
  extraRunsCounted?: boolean;
  venue: string;
  date: string;
  time?: string;
  team1CaptainIdx?: number;
  team2CaptainIdx?: number;
  scorerId?: string | null;
  creatorId?: string | null;
  status?: 'upcoming' | 'live';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Generic Fetch Helper ──

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`API error on ${endpoint}:`, error);
    return {
      success: false,
      error: error.message || 'Network request failed',
    };
  }
}

// ── Match API ──

class MatchAPI {
  async createMatch(
    setup: MatchSetup,
    team1Players: Array<{ id?: string; name: string; role?: 'batsman' | 'bowler' | 'allrounder'; isCaptain?: boolean }>,
    team2Players: Array<{ id?: string; name: string; role?: 'batsman' | 'bowler' | 'allrounder'; isCaptain?: boolean }>
  ): Promise<ApiResponse<Match>> {
    const team1Id = setup.team1Id || `team1-${Date.now()}`;
    const team2Id = setup.team2Id || `team2-${Date.now()}`;

    const team1: Team = {
      id: team1Id,
      name: setup.team1Name,
      shortName: setup.team1ShortName || setup.team1Name.substring(0, 3).toUpperCase(),
      players: team1Players.map((p, idx) => ({
        id: p.id || `${team1Id}-p${idx}`,
        name: p.name,
        role: p.role || 'batsman',
        isCaptain: p.isCaptain !== undefined ? p.isCaptain : idx === setup.team1CaptainIdx,
      })),
      color: setup.team1Color || '#2563eb',
    };

    const team2: Team = {
      id: team2Id,
      name: setup.team2Name,
      shortName: setup.team2ShortName || setup.team2Name.substring(0, 3).toUpperCase(),
      players: team2Players.map((p, idx) => ({
        id: p.id || `${team2Id}-p${idx}`,
        name: p.name,
        role: p.role || 'bowler',
        isCaptain: p.isCaptain !== undefined ? p.isCaptain : idx === setup.team2CaptainIdx,
      })),
      color: setup.team2Color || '#dc2626',
    };

    const matchPayload: Partial<Match> = {
      id: `match-${Date.now()}`,
      team1,
      team2,
      format: `T${setup.overs}`,
      maxOvers: setup.overs,
      extraRunsCounted: typeof setup.extraRunsCounted === 'boolean' ? setup.extraRunsCounted : false,
      status: setup.status || 'live',
      currentInnings: 1,
      venue: setup.venue || 'Local Ground',
      date: setup.date,
      time: setup.time,
      matchType: 'Friendly',
      scorerId: setup.scorerId || setup.creatorId || null,
      creatorId: setup.creatorId || setup.scorerId || null,
      innings: [],
    };

    return apiFetch<Match>('/matches', {
      method: 'POST',
      body: JSON.stringify(matchPayload),
    });
  }

  async getAllMatches(): Promise<Match[]> {
    const res = await apiFetch<Match[]>('/matches');
    if (res.success && Array.isArray(res.data)) {
      return res.data.filter(m => m && m.id && m.team1 && m.team2);
    }
    return [];
  }

  async getMatchById(id: string): Promise<Match | null> {
    const res = await apiFetch<Match>(`/matches/${id}`);
    return res.success && res.data ? res.data : null;
  }

  async getLiveMatches(): Promise<Match[]> {
    const matches = await this.getAllMatches();
    return matches.filter(m => m.status === 'live');
  }

  async getCompletedMatches(): Promise<Match[]> {
    const matches = await this.getAllMatches();
    return matches.filter(m => m.status === 'completed');
  }

  async updateMatch(match: Match): Promise<ApiResponse<Match>> {
    return apiFetch<Match>(`/matches/${match.id}`, {
      method: 'PUT',
      body: JSON.stringify(match),
    });
  }

  async deleteMatch(id: string): Promise<ApiResponse<boolean>> {
    return apiFetch<boolean>(`/matches/${id}`, {
      method: 'DELETE',
    });
  }
}

// ── Scoring API ──

class ScoringAPI {
  async getSession(matchId: string): Promise<ApiResponse<{ session: ScoringSession; match: Match }>> {
    return apiFetch<{ session: ScoringSession; match: Match }>(`/sessions/${matchId}`);
  }

  async deleteSession(matchId: string): Promise<ApiResponse<boolean>> {
    return apiFetch<boolean>(`/sessions/${matchId}`, {
      method: 'DELETE',
    });
  }

  async updateSessionPhase(matchId: string, phase: ScorerPhase): Promise<ApiResponse<ScoringSession>> {
    return apiFetch<ScoringSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ matchId, phase }),
    });
  }

  async completeToss(matchId: string, tossWinner: string, tossDecision: string): Promise<ApiResponse<{ session: ScoringSession; match: Match }>> {
    return apiFetch<{ session: ScoringSession; match: Match }>('/scoring/toss', {
      method: 'POST',
      body: JSON.stringify({ matchId, tossWinner, tossDecision }),
    });
  }

  async selectOpeners(matchId: string, strikerIdx: number, nonStrikerIdx: number): Promise<ApiResponse<{ session: ScoringSession; match: Match }>> {
    return apiFetch<{ session: ScoringSession; match: Match }>('/scoring/select-openers', {
      method: 'POST',
      body: JSON.stringify({ matchId, strikerIdx, nonStrikerIdx }),
    });
  }

  async selectBowler(matchId: string, bowlerIdx: number): Promise<ApiResponse<{ session: ScoringSession; match: Match }>> {
    return apiFetch<{ session: ScoringSession; match: Match }>('/scoring/select-bowler', {
      method: 'POST',
      body: JSON.stringify({ matchId, bowlerIdx }),
    });
  }

  async selectNextBatsman(matchId: string, batsmanIdx: number): Promise<ApiResponse<{ session: ScoringSession; match: Match }>> {
    return apiFetch<{ session: ScoringSession; match: Match }>('/scoring/select-next-batsman', {
      method: 'POST',
      body: JSON.stringify({ matchId, batsmanIdx }),
    });
  }

  async scoreRuns(matchId: string, runs: number): Promise<ApiResponse<{ state: ScoringSession; events: any[]; match: Match }>> {
    return apiFetch<{ state: ScoringSession; events: any[]; match: Match }>('/scoring/score-runs', {
      method: 'POST',
      body: JSON.stringify({ matchId, runs }),
    });
  }

  async recordWicket(
    matchId: string,
    dismissalType: string = 'bowled',
    fielderName?: string,
    otherBatsmanIdx?: number,
    fielderNames?: string[],
    runsScored: number = 0,
    fielderId?: string,
    fielderIds?: string[],
    runOutEnd?: 'bowlers-end' | 'keepers-end'
  ): Promise<ApiResponse<{ state: ScoringSession; events: any[]; match: Match }>> {
    return apiFetch<{ state: ScoringSession; events: any[]; match: Match }>('/scoring/wicket', {
      method: 'POST',
      body: JSON.stringify({
        matchId,
        dismissalType,
        fielderName,
        otherBatsmanIdx,
        fielderNames,
        runsScored,
        fielderId,
        fielderIds,
        runOutEnd,
      }),
    });
  }

  async recordWide(matchId: string, runsScored: number = 0): Promise<ApiResponse<{ state: ScoringSession; events: any[]; match: Match }>> {
    return apiFetch<{ state: ScoringSession; events: any[]; match: Match }>('/scoring/wide', {
      method: 'POST',
      body: JSON.stringify({ matchId, runsScored }),
    });
  }

  async recordNoBall(matchId: string, runsScored: number = 0): Promise<ApiResponse<{ state: ScoringSession; events: any[]; match: Match }>> {
    return apiFetch<{ state: ScoringSession; events: any[]; match: Match }>('/scoring/no-ball', {
      method: 'POST',
      body: JSON.stringify({ matchId, runsScored }),
    });
  }

  async recordNoBallRunOut(
    matchId: string,
    batRuns: number = 0,
    otherBatsmanIdx?: number,
    fielderName?: string,
    fielderNames?: string[],
    fielderId?: string,
    fielderIds?: string[],
    runOutEnd?: 'bowlers-end' | 'keepers-end'
  ): Promise<ApiResponse<{ state: ScoringSession; events: any[]; match: Match }>> {
    return apiFetch<{ state: ScoringSession; events: any[]; match: Match }>('/scoring/no-ball-run-out', {
      method: 'POST',
      body: JSON.stringify({ matchId, batRuns, otherBatsmanIdx, fielderName, fielderNames, fielderId, fielderIds, runOutEnd }),
    });
  }


  async recordRetiredHurt(matchId: string, targetBatsmanIdx?: number): Promise<ApiResponse<{ state: ScoringSession; events: any[]; match: Match }>> {
    return apiFetch<{ state: ScoringSession; events: any[]; match: Match }>('/scoring/retired-hurt', {
      method: 'POST',
      body: JSON.stringify({ matchId, targetBatsmanIdx }),
    });
  }

  async confirmRetiredHurt(matchId: string, canReturn: boolean): Promise<ApiResponse<{ state: ScoringSession; events: any[]; match: Match }>> {
    return apiFetch<{ state: ScoringSession; events: any[]; match: Match }>('/scoring/confirm-retired-hurt', {
      method: 'POST',
      body: JSON.stringify({ matchId, canReturn }),
    });
  }

  async undoLastAction(matchId: string): Promise<ApiResponse<{ state: ScoringSession; events: any[]; match: Match }>> {
    return apiFetch<{ state: ScoringSession; events: any[]; match: Match }>('/scoring/undo', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    });
  }

  async swapStrike(matchId: string): Promise<ApiResponse<{ session: ScoringSession; match: Match }>> {
    return apiFetch<{ session: ScoringSession; match: Match }>('/scoring/swap-strike', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    });
  }

  async startSecondInnings(matchId: string): Promise<ApiResponse<{ session: ScoringSession; match: Match }>> {
    return apiFetch<{ session: ScoringSession; match: Match }>('/scoring/start-second-innings', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    });
  }

  async startSuperOver(matchId: string): Promise<ApiResponse<{ session: ScoringSession; match: Match }>> {
    return apiFetch<{ session: ScoringSession; match: Match }>('/scoring/super-over/start', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    });
  }

  async declineSuperOver(matchId: string): Promise<ApiResponse<{ session: ScoringSession; match: Match }>> {
    return apiFetch<{ session: ScoringSession; match: Match }>('/scoring/super-over/decline', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    });
  }

  async endMatch(matchId: string): Promise<ApiResponse<{ state: ScoringSession; result: string; match: Match }>> {
    return apiFetch<{ state: ScoringSession; result: string; match: Match }>('/scoring/end-match', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    });
  }

  async getCurrentMatchState(matchId: string): Promise<ApiResponse<{ match: Match; session: ScoringSession }>> {
    const res = await apiFetch<{ match: Match; session: ScoringSession }>(`/sessions/${matchId}`);
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }

    // If session not found (completed match), fetch match directly
    const matchRes = await apiFetch<Match>(`/matches/${matchId}`);
    if (matchRes.success && matchRes.data) {
      return {
        success: true,
        data: {
          match: matchRes.data,
          session: { phase: 'matchComplete' } as any,
        },
      };
    }

    return { success: false, error: res.error || 'Match or session not found' };
  }
}

// ── Player API ──

class PlayerAPI {
  async checkUsername(username: string): Promise<ApiResponse<{ available: boolean; message: string }>> {
    const res = await apiFetch<{ available: boolean; message: string }>(`/players/check-username?username=${encodeURIComponent(username)}`);
    if (res.success) {
      const raw = res as any;
      const available = res.data?.available ?? raw.available ?? true;
      const message = res.data?.message ?? raw.message ?? (available ? 'Username is available!' : 'Username is already taken.');
      return {
        success: true,
        data: { available, message }
      };
    }
    return res;
  }

  async register(data: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    playerType: string;
  }): Promise<ApiResponse<RegisteredPlayer>> {
    return apiFetch<RegisteredPlayer>('/players/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { username: string; password: string }): Promise<ApiResponse<RegisteredPlayer>> {
    return apiFetch<RegisteredPlayer>('/players/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPlayers(search?: string, playerType?: string): Promise<ApiResponse<RegisteredPlayer[]>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (playerType) params.append('playerType', playerType);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<RegisteredPlayer[]>(`/players${query}`);
  }

  async getPlayerById(id: string): Promise<ApiResponse<RegisteredPlayer>> {
    return apiFetch<RegisteredPlayer>(`/players/${id}`);
  }
}

// ── Team API ──

class TeamAPI {
  async getTeams(): Promise<ApiResponse<RegisteredTeam[]>> {
    return apiFetch<RegisteredTeam[]>('/teams');
  }

  async registerTeam(data: {
    teamName: string;
    shortName?: string;
    color?: string;
    teamSize?: number;
    creatorId?: string | null;
    involvedPlayerIds?: string[];
  }): Promise<ApiResponse<RegisteredTeam>> {
    return apiFetch<RegisteredTeam>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, data: {
    teamName?: string;
    shortName?: string;
    color?: string;
    teamSize?: number;
    involvedPlayerIds?: string[];
    requestingPlayerId?: string;
  }): Promise<ApiResponse<RegisteredTeam>> {
    return apiFetch<RegisteredTeam>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getTeamById(id: string): Promise<ApiResponse<RegisteredTeam>> {
    return apiFetch<RegisteredTeam>(`/teams/${id}`);
  }
}

// ── Export Instances ──

export const matchAPI = new MatchAPI();
export const scoringAPI = new ScoringAPI();
export const playerAPI = new PlayerAPI();
export const teamAPI = new TeamAPI();
