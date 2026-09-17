import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { scoringEngine } from './services/scoringEngine.js';
import { statsSyncService } from './services/statsSyncService.js';
import { MatchModel, PlayerModel, TeamModel } from './models/index.js';
import dotenv from 'dotenv';

dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from client dist folder
const clientDistPath = path.resolve(__dirname, '../client/dist');
console.log('Serving static files from:', clientDistPath);
app.use(express.static(clientDistPath));

// MongoDB connection
let db;
let client;

async function connectToMongo() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);

    // Auto-create collections and indexes using model definitions
    await db.collection(MatchModel.collectionName).createIndex({ id: 1 }, { unique: true });
    await db.collection(MatchModel.collectionName).createIndex({ status: 1 });
    await db.collection(MatchModel.collectionName).createIndex({ date: -1 });

    // Indexes for Player and Team collections
    await db.collection(PlayerModel.collectionName).createIndex({ id: 1 }, { unique: true });
    await db.collection(PlayerModel.collectionName).createIndex({ username: 1 }, { unique: true });
    await db.collection(TeamModel.collectionName).createIndex({ id: 1 }, { unique: true });
    await db.collection(TeamModel.collectionName).createIndex({ teamName: 1 });

    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`📁 Collections: ${MatchModel.collectionName}, ${PlayerModel.collectionName}, ${TeamModel.collectionName}`);
    console.log('🔑 Indexes created');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Server will start but database operations will fail');
    console.log('💡 Check your MONGODB_URI in .env file');
  }
}

// ═══════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: db ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    }
  });
});

// ═══════════════════════════════════════════════
// MATCH ENDPOINTS
// ═══════════════════════════════════════════════

// GET /api/matches - Get all matches
app.get('/api/matches', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { status } = req.query;
    const filter = status ? { status } : {};
    const matches = await db.collection(MatchModel.collectionName)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/matches/:id - Get match by ID
app.get('/api/matches/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const match = await db.collection(MatchModel.collectionName).findOne({ id: req.params.id });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    // If there is an active liveState, ensure the returned match is fully up-to-date with computed analytics
    if (match.liveState) {
      const session = match.liveState;
      const firstBattingTeamId = session.firstInningsBattingTeamId || session.team1Id;
      const secondBattingTeamId = firstBattingTeamId === session.team1Id ? session.team2Id : session.team1Id;
      const battingTeamId = session.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
      const bowlingTeamId = session.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;

      const builtMatch = scoringEngine.buildMatch(match, session, battingTeamId, bowlingTeamId);
      return res.json({ success: true, data: builtMatch });
    }

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/matches - Create match
app.post('/api/matches', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    // Validate and instantiate Match document via model
    const validation = MatchModel.validate(req.body);
    if (!validation.valid && (!req.body.team1 || !req.body.team2)) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const match = MatchModel.create(req.body);

    // Initialize scoring liveState directly in match if not present
    if (!match.liveState && match.team1 && match.team2) {
      const initialLiveState = scoringEngine.initializeSession(
        match.id,
        match.team1,
        match.team2,
        match.team1.players?.length || 6,
        match.maxOvers || 5,
        match.extraRunsCounted || false
      );
      initialLiveState.phase = 'toss';
      match.liveState = initialLiveState;
    }

    await db.collection(MatchModel.collectionName).updateOne(
      { id: match.id },
      { $set: match },
      { upsert: true }
    );

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/matches/:id - Update match
app.put('/api/matches/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { _id, id, ...updateData } = req.body;

    // If updateData does not explicitly provide liveState, preserve existing liveState
    const existing = await db.collection(MatchModel.collectionName).findOne({ id: req.params.id });
    if (!existing) return res.status(404).json({ success: false, error: 'Match not found' });

    const finalUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    if (updateData.liveState === undefined && existing.liveState) {
      finalUpdate.liveState = existing.liveState;
    }

    const result = await db.collection(MatchModel.collectionName).findOneAndUpdate(
      { id: req.params.id },
      { $set: finalUpdate },
      { returnDocument: 'after' }
    );

    res.json({ success: true, data: result });
    if (updateData.status === 'completed') {
      try {
        await statsSyncService.syncMatchStats(db, req.params.id);
      } catch (syncErr) {
        console.error('Error synchronizing explicitly completed match:', syncErr);
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/matches/:id - Delete match
app.delete('/api/matches/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    await db.collection(MatchModel.collectionName).deleteOne({ id: req.params.id });
    res.json({ success: true, data: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════
// SCORING ENDPOINTS - Backend handles all business logic
// ═══════════════════════════════════════════════

// Helper function to persist match with liveState directly to matches collection
async function saveMatchWithLiveState(matchId, liveState, matchData = {}) {
  if (!db) throw new Error('Database not connected');

  const updateFields = {
    ...matchData,
    liveState: {
      ...liveState,
      updatedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };

  delete updateFields._id;

  await db.collection(MatchModel.collectionName).updateOne(
    { id: matchId },
    { $set: updateFields },
    { upsert: true }
  );

  // If the match has reached a terminal status ('completed' or 'abandoned'), trigger stats sync
  if (updateFields.status === 'completed' || updateFields.status === 'abandoned') {
    try {
      await statsSyncService.syncMatchStats(db, matchId);
    } catch (syncErr) {
      console.error('❌ Error in automatic stats synchronization:', syncErr);
    }
  }
}

// GET /api/sessions/:matchId - Get live scoring state by matchId
app.get('/api/sessions/:matchId', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const match = await db.collection(MatchModel.collectionName).findOne({ id: req.params.matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    let liveState = match.liveState;
    const tossIsComplete = Boolean(match.tossWinner && match.tossDecision);
    const getTossTeams = () => {
      const winnerIsTeam1 = match.tossWinner === match.team1.id;
      const battingTeam = match.tossDecision === 'bat'
        ? (winnerIsTeam1 ? match.team1 : match.team2)
        : (winnerIsTeam1 ? match.team2 : match.team1);
      const bowlingTeam = battingTeam.id === match.team1.id ? match.team2 : match.team1;
      return { battingTeam, bowlingTeam };
    };
    if (!liveState) {
      liveState = scoringEngine.initializeSession(
        match.id,
        match.team1,
        match.team2,
        match.team1.players?.length || 6,
        match.maxOvers || 5,
        match.extraRunsCounted || false
      );

      // If match already recorded toss result, reinitialize session with correct teams
      if (tossIsComplete) {
        const { battingTeam, bowlingTeam } = getTossTeams();
        liveState = scoringEngine.reinitializeAfterToss(liveState, battingTeam, bowlingTeam);
      }

      match.liveState = liveState;
      await db.collection(MatchModel.collectionName).updateOne(
        { id: match.id },
        { $set: { liveState, updatedAt: new Date().toISOString() } }
      );
    } else if (tossIsComplete && liveState.phase === 'toss') {
      // Recovery: match has completed toss but liveState is still set to 'toss'
      const { battingTeam, bowlingTeam } = getTossTeams();
      liveState = scoringEngine.reinitializeAfterToss(liveState, battingTeam, bowlingTeam);
      match.liveState = liveState;
      await db.collection(MatchModel.collectionName).updateOne(
        { id: match.id },
        { $set: { liveState, updatedAt: new Date().toISOString() } }
      );
    } else if (tossIsComplete && !liveState.firstInningsBattingTeamId) {
      // Repair legacy/corrupt states without rebuilding selected players or score data.
      const { battingTeam } = getTossTeams();
      liveState = {
        ...liveState,
        firstInningsBattingTeamId: battingTeam.id,
        updatedAt: new Date().toISOString()
      };
      match.liveState = liveState;
      await db.collection(MatchModel.collectionName).updateOne(
        { id: match.id },
        { $set: { liveState, updatedAt: liveState.updatedAt } }
      );
    }

    // Build current match state from liveState
    const firstBattingTeamId = liveState.firstInningsBattingTeamId || liveState.team1Id;
    const secondBattingTeamId = firstBattingTeamId === liveState.team1Id ? liveState.team2Id : liveState.team1Id;
    const battingTeamId = liveState.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = liveState.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;

    const currentMatch = scoringEngine.buildMatch(
      match,
      liveState,
      battingTeamId,
      bowlingTeamId
    );

    res.json({ success: true, data: { session: liveState, match: currentMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sessions - Update liveState
app.post('/api/sessions', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, phase, ...rest } = req.body;
    if (!matchId) return res.status(400).json({ success: false, error: 'matchId is required' });

    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const currentLiveState = match.liveState || scoringEngine.initializeSession(
      match.id,
      match.team1,
      match.team2,
      match.team1.players?.length || 6,
      match.maxOvers || 5
    );

    const updatedLiveState = {
      ...currentLiveState,
      ...rest,
      ...(phase ? { phase } : {}),
      updatedAt: new Date().toISOString()
    };

    await saveMatchWithLiveState(matchId, updatedLiveState);
    res.json({ success: true, data: updatedLiveState });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/select-openers - Select opening batsmen
app.post('/api/scoring/select-openers', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, strikerIdx, nonStrikerIdx } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const newState = scoringEngine.selectOpeners(match.liveState, strikerIdx, nonStrikerIdx);

    const firstBattingTeamId = newState.firstInningsBattingTeamId || newState.team1Id;
    const secondBattingTeamId = firstBattingTeamId === newState.team1Id ? newState.team2Id : newState.team1Id;
    const battingTeamId = newState.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = newState.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, newState, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, newState, updatedMatch);

    res.json({ success: true, data: { session: newState, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/select-bowler - Select bowler
app.post('/api/scoring/select-bowler', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, bowlerIdx } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const newState = scoringEngine.selectBowler(match.liveState, bowlerIdx);

    const firstBattingTeamId = newState.firstInningsBattingTeamId || newState.team1Id;
    const secondBattingTeamId = firstBattingTeamId === newState.team1Id ? newState.team2Id : newState.team1Id;
    const battingTeamId = newState.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = newState.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, newState, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, newState, updatedMatch);

    res.json({ success: true, data: { session: newState, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/reinitialize-after-toss - Reinitialize session after toss
app.post('/api/scoring/reinitialize-after-toss', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, battingTeam, bowlingTeam } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const liveState = match.liveState || scoringEngine.initializeSession(
      match.id,
      match.team1,
      match.team2,
      match.team1.players?.length || 6,
      match.maxOvers || 5
    );

    const newState = scoringEngine.reinitializeAfterToss(liveState, battingTeam, bowlingTeam);
    await saveMatchWithLiveState(matchId, newState);

    res.json({ success: true, data: newState });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/score-runs - Score runs
app.post('/api/scoring/score-runs', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, runs } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.handleRuns(match.liveState, runs);

    // Build updated match - use firstInningsBattingTeamId to determine batting/bowling teams
    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const battingTeamId = result.state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = result.state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, result.state, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    res.json({ success: true, data: { state: result.state, events: result.events, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/toss - Handle toss result
app.post('/api/scoring/toss', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, tossWinner, tossDecision } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (![match.team1.id, match.team2.id].includes(tossWinner) || !['bat', 'bowl'].includes(tossDecision)) {
      return res.status(400).json({ success: false, error: 'A valid toss winner and decision are required' });
    }

    const liveState = match.liveState || scoringEngine.initializeSession(
      match.id,
      match.team1,
      match.team2,
      match.team1.players?.length || 6,
      match.maxOvers || 5
    );

    // Determine batting & bowling teams
    let battingTeam, bowlingTeam;
    if (tossDecision === 'bat') {
      battingTeam = tossWinner === match.team1.id ? match.team1 : match.team2;
      bowlingTeam = tossWinner === match.team1.id ? match.team2 : match.team1;
    } else {
      battingTeam = tossWinner === match.team1.id ? match.team2 : match.team1;
      bowlingTeam = tossWinner === match.team1.id ? match.team1 : match.team2;
    }

    // Update match with toss info
    const updatedMatchData = {
      ...match,
      tossWinner,
      tossDecision,
      status: 'live',
      updatedAt: new Date().toISOString()
    };

    // Reinitialize state with correct teams
    const newLiveState = scoringEngine.reinitializeAfterToss(liveState, battingTeam, bowlingTeam);

    // Build fresh match object
    const finalMatch = scoringEngine.buildMatch(updatedMatchData, newLiveState, battingTeam.id, bowlingTeam.id);

    await saveMatchWithLiveState(matchId, newLiveState, finalMatch);

    res.json({ success: true, data: { session: newLiveState, match: finalMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/wicket - Record wicket
app.post('/api/scoring/wicket', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, dismissalType, fielderName, otherBatsmanIdx, fielderNames, runsScored, fielderId, fielderIds, runOutEnd } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.handleWicket(
      match.liveState,
      dismissalType || 'bowled',
      fielderName,
      otherBatsmanIdx,
      fielderNames,
      runsScored || 0,
      fielderId,
      fielderIds,
      runOutEnd
    );

    // Build updated match - use firstInningsBattingTeamId to determine batting/bowling teams
    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const battingTeamId = result.state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = result.state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, result.state, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    res.json({ success: true, data: { state: result.state, events: result.events, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/wide - Record wide
app.post('/api/scoring/wide', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, runsScored } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.handleWide(match.liveState, runsScored || 0);

    // Build updated match - use firstInningsBattingTeamId to determine batting/bowling teams
    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const battingTeamId = result.state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = result.state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, result.state, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    res.json({ success: true, data: { state: result.state, events: result.events, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/no-ball - Record no ball
app.post('/api/scoring/no-ball', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, runsScored } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.handleNoBall(match.liveState, runsScored || 0);

    // Build updated match - use firstInningsBattingTeamId to determine batting/bowling teams
    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const battingTeamId = result.state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = result.state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, result.state, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    res.json({ success: true, data: { state: result.state, events: result.events, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/no-ball-run-out - Record no-ball + run-out compound event
app.post('/api/scoring/no-ball-run-out', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, batRuns, otherBatsmanIdx, fielderName, fielderNames, fielderId, fielderIds, runOutEnd } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.handleNoBallRunOut(
      match.liveState,
      batRuns || 0,
      otherBatsmanIdx,
      fielderName,
      fielderNames,
      fielderId,
      fielderIds,
      runOutEnd
    );

    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const battingTeamId = result.state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = result.state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, result.state, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    res.json({ success: true, data: { state: result.state, events: result.events, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/super-over/start - Start Super Over
app.post('/api/scoring/super-over/start', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const newState = scoringEngine.startSuperOver(match.liveState, match.team1, match.team2);

    const firstBattingTeamId = newState.firstInningsBattingTeamId || newState.team1Id;
    const secondBattingTeamId = firstBattingTeamId === newState.team1Id ? newState.team2Id : newState.team1Id;
    const battingTeamId = newState.superOver1stBattingTeamId || secondBattingTeamId;
    const bowlingTeamId = battingTeamId === newState.team1Id ? newState.team2Id : newState.team1Id;
    const updatedMatch = scoringEngine.buildMatch(match, newState, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, newState, updatedMatch);

    res.json({ success: true, data: { session: newState, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/super-over/decline - Decline Super Over and complete match as Tied
app.post('/api/scoring/super-over/decline', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.endMatch(match.liveState, [], true);

    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const updatedMatch = scoringEngine.buildMatch(match, result.state, firstBattingTeamId, secondBattingTeamId, 'completed', 'Match Tied!');

    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    res.json({ success: true, data: { session: result.state, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// POST /api/scoring/select-next-batsman - Select next batsman
app.post('/api/scoring/select-next-batsman', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, batsmanIdx } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const newState = scoringEngine.selectNextBatsman(match.liveState, batsmanIdx);

    const firstBattingTeamId = newState.firstInningsBattingTeamId || newState.team1Id;
    const secondBattingTeamId = firstBattingTeamId === newState.team1Id ? newState.team2Id : newState.team1Id;
    const battingTeamId = newState.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = newState.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, newState, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, newState, updatedMatch);

    res.json({ success: true, data: { session: newState, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/retired-hurt - Record retired hurt
app.post('/api/scoring/retired-hurt', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, targetBatsmanIdx } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.handleRetiredHurt(match.liveState, targetBatsmanIdx);

    // Build updated match - use firstInningsBattingTeamId to determine batting/bowling teams
    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const battingTeamId = result.state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = result.state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, result.state, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    res.json({ success: true, data: { state: result.state, events: result.events, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/confirm-retired-hurt - Confirm retired hurt (can return or out)
app.post('/api/scoring/confirm-retired-hurt', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId, canReturn } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.confirmRetiredHurt(match.liveState, canReturn);

    // Build updated match - use firstInningsBattingTeamId to determine batting/bowling teams
    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const battingTeamId = result.state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = result.state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, result.state, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    res.json({ success: true, data: { state: result.state, events: result.events, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/undo - Undo last action
app.post('/api/scoring/undo', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.handleUndo(match.liveState);

    // Build updated match - use firstInningsBattingTeamId to determine batting/bowling teams
    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const battingTeamId = result.state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = result.state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, result.state, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    res.json({ success: true, data: { state: result.state, events: result.events, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/swap-strike - Swap strike
app.post('/api/scoring/swap-strike', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const newState = scoringEngine.swapStrike(match.liveState);

    const firstBattingTeamId = newState.firstInningsBattingTeamId || newState.team1Id;
    const secondBattingTeamId = firstBattingTeamId === newState.team1Id ? newState.team2Id : newState.team1Id;
    const battingTeamId = newState.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = newState.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(match, newState, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, newState, updatedMatch);

    res.json({ success: true, data: { session: newState, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/start-second-innings - Start second innings
app.post('/api/scoring/start-second-innings', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    let newState;
    let battingTeamId;
    let bowlingTeamId;

    if (match.liveState.isSuperOver) {
      newState = scoringEngine.startSuperOverSecondInnings(match.liveState, match.team1, match.team2);
      const superOver1stBattingTeamId = newState.superOver1stBattingTeamId || newState.team2Id;
      battingTeamId = superOver1stBattingTeamId === newState.team1Id ? newState.team2Id : newState.team1Id;
      bowlingTeamId = battingTeamId === newState.team1Id ? newState.team2Id : newState.team1Id;
    } else {
      // Determine which team bats in second innings (the team that didn't bat first)
      const firstInningsBattingTeamId = match.liveState.firstInningsBattingTeamId || match.liveState.team1Id;
      const secondBattingTeam = firstInningsBattingTeamId === match.team1.id ? match.team2 : match.team1;
      const secondBowlingTeam = firstInningsBattingTeamId === match.team1.id ? match.team1 : match.team2;

      newState = scoringEngine.startSecondInnings(match.liveState, secondBattingTeam, secondBowlingTeam);

      const currentFirstBattingTeamId = newState.firstInningsBattingTeamId || newState.team1Id;
      const currentSecondBattingTeamId = currentFirstBattingTeamId === newState.team1Id ? newState.team2Id : newState.team1Id;
      battingTeamId = newState.currentInningsNum === 0 ? currentFirstBattingTeamId : currentSecondBattingTeamId;
      bowlingTeamId = newState.currentInningsNum === 0 ? currentSecondBattingTeamId : currentFirstBattingTeamId;
    }

    const updatedMatch = scoringEngine.buildMatch(match, newState, battingTeamId, bowlingTeamId);

    await saveMatchWithLiveState(matchId, newState, updatedMatch);

    res.json({ success: true, data: { session: newState, match: updatedMatch } });
  } catch (error) {
    console.error('Error in start-second-innings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scoring/end-match - End match
app.post('/api/scoring/end-match', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { matchId } = req.body;
    const match = await db.collection(MatchModel.collectionName).findOne({ id: matchId });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (!match.liveState) return res.status(400).json({ success: false, error: 'Live scoring state not initialized' });

    const result = scoringEngine.endMatch(match.liveState);

    // Calculate result and determine status (abandoned if ended prematurely in 1st innings)
    const isEarlyEnd = result.state.completedInnings.length === 0 || result.state.currentInningsNum === 0;
    const matchStatus = isEarlyEnd ? 'abandoned' : 'completed';
    const resultText = isEarlyEnd
      ? `Match Abandoned. ${match.team1.name} scored ${result.state.currentRuns}/${result.state.currentWickets} in ${result.state.currentOver}.${result.state.currentBall} ov`
      : scoringEngine.calculateResult(result.state, match.team1.name, match.team2.name);

    // Build updated match - use firstInningsBattingTeamId to determine batting/bowling teams
    const firstBattingTeamId = result.state.firstInningsBattingTeamId || result.state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === result.state.team1Id ? result.state.team2Id : result.state.team1Id;
    const battingTeamId = result.state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
    const bowlingTeamId = result.state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    const updatedMatch = scoringEngine.buildMatch(
      match,
      result.state,
      battingTeamId,
      bowlingTeamId,
      matchStatus,
      resultText
    );

    // Persist final match state with completed liveState
    await saveMatchWithLiveState(matchId, result.state, updatedMatch);

    // Synchronize lifetime stats across Player and Team documents using pure IDs
    try {
      await statsSyncService.syncMatchStats(db, matchId);
    } catch (syncErr) {
      console.error('❌ Error synchronizing match stats:', syncErr);
    }

    res.json({ success: true, data: { state: result.state, result: resultText, match: updatedMatch } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sessions/:matchId - Reset/Delete live scoring state of a match
app.delete('/api/sessions/:matchId', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    await db.collection(MatchModel.collectionName).updateOne(
      { id: req.params.matchId },
      { $unset: { liveState: "" }, $set: { updatedAt: new Date().toISOString() } }
    );
    res.json({ success: true, data: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════
// PLAYERS & AUTHENTICATION ENDPOINTS
// ═══════════════════════════════════════════════

// GET /api/players/check-username - Check if a username already exists
app.get('/api/players/check-username', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const username = (req.query.username || '').toString().trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Fast check: If no records exist in the Players collection, username is immediately available
    const totalPlayers = await db.collection(PlayerModel.collectionName).countDocuments();
    if (totalPlayers === 0) {
      return res.json({
        success: true,
        data: {
          available: true,
          message: `Username is available!`
        },
        available: true,
        message: `Username is available!`
      });
    }

    const existingPlayer = await db.collection(PlayerModel.collectionName).findOne({ username });
    if (existingPlayer) {
      return res.json({
        success: true,
        data: {
          available: false,
          message: `Username is already taken. Please choose a different username.`
        },
        available: false,
        message: `Username is already taken. Please choose a different username.`
      });
    }

    res.json({
      success: true,
      data: {
        available: true,
        message: `Username is available!`
      },
      available: true,
      message: `Username is available!`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/players/register - Register a new player
app.post('/api/players/register', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { username, password, firstName, lastName, playerType } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ success: false, error: 'First name is required' });
    }
    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ success: false, error: 'Last name is required' });
    }
    if (!['Batter', 'Bowler', 'All-Rounder'].includes(playerType)) {
      return res.status(400).json({ success: false, error: 'Player type must be Batter, Bowler, or All-Rounder' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check uniqueness
    const existing = await db.collection(PlayerModel.collectionName).findOne({ username: cleanUsername });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Username '${cleanUsername}' already exists. Please choose a different username.`
      });
    }

    const newPlayer = PlayerModel.sanitize({
      username: cleanUsername,
      password: password.trim(), // unencrypted as requested
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      playerType
    });

    await db.collection(PlayerModel.collectionName).insertOne(newPlayer);

    res.status(201).json({
      success: true,
      data: PlayerModel.toClient(newPlayer),
      message: 'Player registered successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/players/login - Authenticate player by username and password
app.post('/api/players/login', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const player = await db.collection(PlayerModel.collectionName).findOne({ username: cleanUsername });

    if (!player || player.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    res.json({
      success: true,
      data: PlayerModel.toClient(player),
      message: 'Login successful'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/players - List all registered players (or search by query)
app.get('/api/players', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { search, playerType } = req.query;
    const filter = {};

    if (search) {
      const searchRegex = new RegExp(search.toString().trim(), 'i');
      filter.$or = [
        { username: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex }
      ];
    }

    if (playerType && ['Batter', 'Bowler', 'All-Rounder'].includes(playerType)) {
      filter.playerType = playerType;
    }

    const players = await db.collection(PlayerModel.collectionName)
      .find(filter)
      .collation({ locale: 'en', strength: 2 })
      .sort({ firstName: 1, lastName: 1 })
      .toArray();

    res.json({
      success: true,
      data: players.map(PlayerModel.toClient)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/players/:id - Get single player profile
app.get('/api/players/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const player = await db.collection(PlayerModel.collectionName).findOne({ id: req.params.id });
    if (!player) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    res.json({
      success: true,
      data: PlayerModel.toClient(player)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════
// TEAMS ENDPOINTS
// ═══════════════════════════════════════════════

// GET /api/teams - List all teams (sorted alphabetically by teamName)
app.get('/api/teams', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const teams = await db.collection(TeamModel.collectionName)
      .find({})
      .collation({ locale: 'en', strength: 2 })
      .sort({ teamName: 1 })
      .toArray();

    res.json({
      success: true,
      data: teams.map(TeamModel.toClient)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/teams - Register a new team
app.post('/api/teams', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { teamName, shortName, teamSize, involvedPlayerIds, creatorId } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, error: 'Team name is required' });
    }

    const newTeam = TeamModel.sanitize({
      teamName,
      shortName,
      teamSize: Number(teamSize) || 11,
      creatorId: creatorId || null,
      involvedPlayerIds: Array.isArray(involvedPlayerIds) ? involvedPlayerIds : []
    });

    await db.collection(TeamModel.collectionName).insertOne(newTeam);

    // If there are involvedPlayerIds, link this team to the players' teamsInvolved list
    if (newTeam.involvedPlayerIds && newTeam.involvedPlayerIds.length > 0) {
      await db.collection(PlayerModel.collectionName).updateMany(
        { id: { $in: newTeam.involvedPlayerIds } },
        { $addToSet: { teamsInvolved: newTeam.id } }
      );
    }

    res.status(201).json({
      success: true,
      data: TeamModel.toClient(newTeam),
      message: 'Team registered successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/teams/:id - Update team info and players (Only team creator can update)
app.put('/api/teams/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const { id } = req.params;
    const { teamName, shortName, teamSize, involvedPlayerIds, requestingPlayerId } = req.body;

    const existingTeam = await db.collection(TeamModel.collectionName).findOne({ id });
    if (!existingTeam) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    // Check authorization: if creatorId is set on the team, only the creator can update
    if (existingTeam.creatorId && requestingPlayerId && existingTeam.creatorId !== requestingPlayerId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the player who created this team can edit its info and roster.'
      });
    }

    // Build update document
    const updateDoc = {
      updatedAt: new Date().toISOString()
    };

    if (teamName !== undefined && teamName.trim()) {
      updateDoc.teamName = teamName.trim();
    }
    if (shortName !== undefined) {
      updateDoc.shortName = shortName.trim().toUpperCase();
    }
    if (teamSize !== undefined) {
      updateDoc.teamSize = Number(teamSize) || 11;
    }
    if (involvedPlayerIds !== undefined && Array.isArray(involvedPlayerIds)) {
      updateDoc.involvedPlayerIds = involvedPlayerIds;

      // Also update player documents: remove team from players no longer in squad, add to new players
      const previousPlayerIds = existingTeam.involvedPlayerIds || [];
      const removedPlayerIds = previousPlayerIds.filter(pid => !involvedPlayerIds.includes(pid));
      const addedPlayerIds = involvedPlayerIds.filter(pid => !previousPlayerIds.includes(pid));

      if (removedPlayerIds.length > 0) {
        await db.collection(PlayerModel.collectionName).updateMany(
          { id: { $in: removedPlayerIds } },
          { $pull: { teamsInvolved: existingTeam.id } }
        );
      }
      if (addedPlayerIds.length > 0) {
        await db.collection(PlayerModel.collectionName).updateMany(
          { id: { $in: addedPlayerIds } },
          { $addToSet: { teamsInvolved: existingTeam.id } }
        );
      }
    }

    await db.collection(TeamModel.collectionName).updateOne(
      { id },
      { $set: updateDoc }
    );

    const updated = await db.collection(TeamModel.collectionName).findOne({ id });
    res.json({
      success: true,
      data: TeamModel.toClient(updated),
      message: 'Team updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/teams/:id - Get team details
app.get('/api/teams/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });

    const team = await db.collection(TeamModel.collectionName).findOne({ id: req.params.id });
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    res.json({
      success: true,
      data: TeamModel.toClient(team)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════
// CLIENT-SIDE ROUTING SUPPORT
// ═══════════════════════════════════════════════

// Catch-all route for client-side routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes - return 404 for undefined API endpoints
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  res.sendFile(path.resolve(clientDistPath, 'index.html'));
});

// ═══════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════

connectToMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏏 Score Master Backend Server`);
    console.log(`🚀 Running on http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (client) await client.close();
  process.exit(0);
});
