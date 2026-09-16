export interface Player {
  id: string;
  name: string;
  role: 'batsman' | 'bowler' | 'allrounder';
  isCaptain?: boolean;
}

export type PlayerType = 'Batter' | 'Bowler' | 'All-Rounder';

export interface PlayerBattingProfileStats {
  innings: number;
  balls: number;
  runs: number;
  fours: number;
  sixes: number;
  outs: number;
  notOuts: number;
  highestScore: number;
  average: number;
  strikeRate: number;
  fifties: number;
  ducks: number;
}

export interface PlayerBowlingProfileStats {
  innings: number;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  threeWicketHauls: number;
  fiveWicketHauls: number;
  bestBowling: string;
}

export interface PlayerFieldingProfileStats {
  catches: number;
  runOuts: number;
  stumpings: number;
}

export interface PlayerProfileStats {
  matches: number;
  batting: PlayerBattingProfileStats;
  bowling: PlayerBowlingProfileStats;
  fielding: PlayerFieldingProfileStats;
  matchHistory?: {
    played: number;
    won: number;
    lost: number;
    tied: number;
    abandoned: number;
  };
}

export interface RegisteredPlayer {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  playerType: PlayerType;
  teamsInvolved: string[];
  stats: PlayerProfileStats;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisteredTeam {
  id: string;
  teamName: string;
  shortName?: string;
  color?: string;
  teamSize?: number;
  creatorId?: string | null;
  involvedPlayerIds?: string[];
  matchHistory: {
    played: number;
    won: number;
    lost: number;
    tied: number;
    abandoned: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface BattingStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  hasBatted?: boolean; // Whether the batsman has entered the crease to bat
  isRetiredHurt?: boolean; // Player is retired out (can return)
  justRetired?: boolean; // Retired out on the immediate previous ball (cannot return immediately)
  canReturn?: boolean; // Whether retired out player can return to bat
  dismissal?: string;
  dismissalType?: 'bowled' | 'caught' | 'lbw' | 'run-out' | 'stumped' | 'hit-wicket' | 'handled-the-ball' | 'obstructing-the-field' | 'retired-hurt' | 'retired-out';
  dismissedBy?: string; // Bowler's name for bowled, lbw, stumped
  bowlerId?: string; // Bowler's player ID
  fielder?: string; // Fielder's name for caught, run-out, stumped
  fielderId?: string; // Fielder's player ID
  fielderIds?: string[]; // Multiple fielders' player IDs (for run-outs)
  strikeRate: number;
  isCaptain?: boolean;
}

export interface BowlingStats {
  playerId: string;
  playerName: string;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
  isCaptain?: boolean;
}

export interface BallEvent {
  over: number;
  ball: number;
  ballLabel?: string; // e.g. "1.3" = 3rd legal delivery of over 1; extras share label with next legal ball
  runs: number;
  isWicket: boolean;
  isWide: boolean;
  isNoBall: boolean;
  isRetiredHurt?: boolean; // Mark retired hurt events (not a legal delivery)
  batsman: string;
  batsmanId?: string;
  bowler: string;
  bowlerId?: string;
  commentary: string;
  strikerIdx?: number;
  nonStrikerIdx?: number;
  strikerId?: string;
  nonStrikerId?: string;
  outBatsmanId?: string;
  fielderId?: string;
  fielderIds?: string[];
  dismissalType?: string;
}

export interface FallOfWicket {
  wicket: number;
  score: number;
  batsman: string;
  over: string;
}

export interface Partnership {
  wicket: number;
  batsmen: string;
  runs: number;
  balls: number;
}

export interface OverSummaryBall {
  text: string;
  runs: number;
  isWicket: boolean;
  isWide: boolean;
  isNoBall: boolean;
  isRetiredHurt: boolean;
}

export interface OverSummary {
  over: number;
  overDisplay: number;
  bowler: string;
  runs: number;
  legalBalls: number;
  wickets: number;
  balls: OverSummaryBall[];
}

export interface Innings {
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  totalBalls: number;
  currentRunRate?: string;
  extras: number;
  extrasBreakdown?: {
    byes: number;
    legByes: number;
    wides: number;
    noBalls: number;
  };
  battingStats: BattingStats[];
  bowlingStats: BowlingStats[];
  ballByBall: BallEvent[];
  currentBatsmen: string[];
  currentBowler: string;
  fallOfWickets?: FallOfWicket[];
  partnerships?: Partnership[];
  overSummaries?: OverSummary[];
  extraRunsCounted?: boolean;
  isSuperOver?: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  players: Player[];
  color: string;
}

export interface Match {
  id: string;
  team1: Team;
  team2: Team;
  format: string;
  maxOvers: number;
  status: 'live' | 'completed' | 'upcoming' | 'abandoned';
  tossWinner?: string;
  tossDecision?: string;
  tossCoinResult?: 'heads' | 'tails';
  innings: Innings[];
  currentInnings: number;
  result?: string;
  venue: string;
  date: string;
  time?: string;
  matchType: string;
  target?: number | null;
  remainingRuns?: number | null;
  remainingBalls?: number | null;
  requiredRunRate?: string | null;
  extraRunsCounted?: boolean;
  statsSynced?: boolean;
  winningTeamId?: string | null;
  liveState?: ScoringSession | null;
  scorerId?: string | null;
  creatorId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ScorerPhase =
  | 'select'
  | 'teamSetup'
  | 'toss'
  | 'selectOpeners'
  | 'selectBowler'
  | 'scoring'
  | 'selectNextBatsman'
  | 'retiredHurtConfirm'
  | 'tiePrompt'
  | 'inningsBreak'
  | 'matchComplete';

// ScoringSession is the authoritative scoring state from the server
export type ScoringSession = {
  matchId: string;
  phase: ScorerPhase;
  currentRuns: number;
  currentWickets: number;
  currentOver: number;
  currentBall: number;
  strikerIdx: number;
  nonStrikerIdx: number;
  batsmenStats: BattingStats[];
  bowlersStats: BowlingStats[];
  currentBowlerIdx: number;
  ballEvents: BallEvent[];
  extras: number;
  extrasBreakdown?: {
    byes: number;
    legByes: number;
    wides: number;
    noBalls: number;
  };
  currentInningsNum: number;
  completedInnings: Innings[];
  pendingOverEnd: boolean;
  lastBowlerIdx: number | null;
  teamSize: number;
  maxOvers: number;
  extraRunsCounted?: boolean;
  team1Id: string;
  team2Id: string;
  firstInningsBattingTeamId?: string;
  isSuperOver?: boolean;
  superOverNumber?: number;
  maxWickets?: number;
  superOver1stBattingTeamId?: string;
};
