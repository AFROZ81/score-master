/**
 * Scoring Engine - Core cricket scoring business logic
 * Operates on the match.liveState object directly
 */

class ScoringEngine {
  /**
   * Initialize a new live scoring state object for a match
   */
  initializeSession(matchId, team1, team2, teamSize, maxOvers, extraRunsCounted = false) {
    return {
      matchId,
      phase: 'toss',
      currentRuns: 0,
      currentWickets: 0,
      currentOver: 0,
      currentBall: 0,
      strikerIdx: 0,
      nonStrikerIdx: 1,
      batsmenStats: [],
      bowlersStats: [],
      currentBowlerIdx: 0,
      ballEvents: [],
      extras: 0,
      extrasBreakdown: {
        byes: 0,
        legByes: 0,
        wides: 0,
        noBalls: 0,
      },
      currentInningsNum: 0,
      completedInnings: [],
      pendingOverEnd: false,
      lastBowlerIdx: null,
      teamSize: Number(teamSize) || 6,
      maxOvers: Number(maxOvers) || 5,
      extraRunsCounted: !!extraRunsCounted,
      team1Id: team1?.id || '',
      team2Id: team2?.id || '',
      firstInningsBattingTeamId: null,
      updatedAt: new Date().toISOString()
    };
  }


  /**
   * Reinitialize session after toss with correct batting team
   */
  reinitializeAfterToss(state, battingTeam, bowlingTeam) {
    const initialBattingStats = battingTeam.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      hasBatted: false,
      strikeRate: 0,
      isCaptain: p.isCaptain || false,
    }));

    const initialBowlingStats = bowlingTeam.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      overs: 0,
      balls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      noBalls: 0,
      isCaptain: p.isCaptain || false,
    }));

    return {
      ...state,
      phase: 'selectOpeners',
      batsmenStats: initialBattingStats,
      bowlersStats: initialBowlingStats,
      firstInningsBattingTeamId: battingTeam.id, // Store which team bats first
    };
  }

  /**
   * Select opening batsmen
   */
  selectOpeners(state, strikerIdx, nonStrikerIdx) {
    if (!Number.isInteger(strikerIdx) || !Number.isInteger(nonStrikerIdx) ||
        strikerIdx === nonStrikerIdx ||
        !state.batsmenStats[strikerIdx] || !state.batsmenStats[nonStrikerIdx]) {
      throw new Error('Two different valid opening batsmen must be selected');
    }
    const updatedBatsmen = [...state.batsmenStats];
    if (updatedBatsmen[strikerIdx]) {
      updatedBatsmen[strikerIdx] = { ...updatedBatsmen[strikerIdx], hasBatted: true };
    }
    if (updatedBatsmen[nonStrikerIdx]) {
      updatedBatsmen[nonStrikerIdx] = { ...updatedBatsmen[nonStrikerIdx], hasBatted: true };
    }

    return {
      ...state,
      strikerIdx,
      nonStrikerIdx,
      batsmenStats: updatedBatsmen,
      phase: 'selectBowler',
    };
  }

  /**
   * Select bowler for an over
   */
  selectBowler(state, bowlerIdx) {
    if (!Number.isInteger(bowlerIdx) || !state.bowlersStats[bowlerIdx]) {
      throw new Error('A valid bowler must be selected');
    }
    return {
      ...state,
      currentBowlerIdx: bowlerIdx,
      phase: 'scoring',
    };
  }

  /**
   * Handle scoring runs (0-6)
   */
  handleRuns(state, runs) {
    const newState = { ...state };
    const events = [];

    // Update batsman stats
    const updatedBatsmen = [...state.batsmenStats];
    const striker = { ...updatedBatsmen[state.strikerIdx] };
    striker.runs += runs;
    striker.balls += 1;
    if (runs === 4) striker.fours += 1;
    if (runs === 6) striker.sixes += 1;
    striker.strikeRate = striker.balls > 0 ? (striker.runs / striker.balls) * 100 : 0;
    updatedBatsmen[state.strikerIdx] = striker;

    // Update bowler stats
    const updatedBowlers = [...state.bowlersStats];
    const bowler = { ...updatedBowlers[state.currentBowlerIdx] };
    bowler.runs += runs;
    bowler.balls += 1;
    if (bowler.balls >= 6) {
      bowler.overs += 1;
      bowler.balls = 0;
    }
    updatedBowlers[state.currentBowlerIdx] = bowler;

    // Create ball event
    const ballEvent = {
      over: state.currentOver,
      ball: state.currentBall,
      ballLabel: this._computeBallLabel(state.ballEvents, state.currentOver),
      runs,
      isWicket: false,
      isWide: false,
      isNoBall: false,
      batsman: striker.playerName,
      bowler: bowler.playerName,
      commentary: this.getRunCommentary(runs, striker.playerName, bowler.playerName),
      strikerIdx: state.strikerIdx,
      nonStrikerIdx: state.nonStrikerIdx,
    };

    newState.batsmenStats = updatedBatsmen;
    newState.bowlersStats = updatedBowlers;
    newState.ballEvents = [...state.ballEvents, ballEvent];
    newState.currentRuns = state.currentRuns + runs;

    // Rotate strike for odd runs
    let newStrikerIdx = state.strikerIdx;
    let newNonStrikerIdx = state.nonStrikerIdx;
    if (runs % 2 === 1) {
      newStrikerIdx = state.nonStrikerIdx;
      newNonStrikerIdx = state.strikerIdx;
    }

    // Check target in 2nd innings FIRST (before advancing ball)
    if (state.currentInningsNum === 1 && state.completedInnings.length > 0) {
      let target;
      if (state.isSuperOver) {
        const superOver1stInnings = state.completedInnings[2] || state.completedInnings[state.completedInnings.length - 1];
        target = (superOver1stInnings ? superOver1stInnings.totalRuns : 0) + 1;
      } else {
        target = state.completedInnings[0].totalRuns + 1;
      }
      if (newState.currentRuns >= target) {
        // Target chased! Match ends immediately
        newState.strikerIdx = newStrikerIdx;
        newState.nonStrikerIdx = newNonStrikerIdx;
        return this.endMatch(newState, events);
      }
    }

    // Advance ball
    const ballResult = this.advanceBall(
      state.currentOver,
      state.currentBall,
      newStrikerIdx,
      newNonStrikerIdx,
      state.maxOvers
    );

    newState.currentOver = ballResult.over;
    newState.currentBall = ballResult.ball;
    newState.strikerIdx = ballResult.strikerIdx;
    newState.nonStrikerIdx = ballResult.nonStrikerIdx;

    events.push({ type: 'run', description: `${runs} run${runs !== 1 ? 's' : ''}` });

    // Check if over ended
    if (ballResult.overEnded) {
      // Recalculate bowler economy
      const finalBowlers = [...newState.bowlersStats];
      const b = { ...finalBowlers[state.currentBowlerIdx] };
      const totalBalls = (b.overs || 0) * 6 + (b.balls || 0);
      b.economy = totalBalls > 0 ? (b.runs / totalBalls) * 6 : 0;

      // Check for maiden over (6 legal balls in current over, 0 runs scored off the bat)
      const overBalls = newState.ballEvents.filter(
        e => e.over === state.currentOver && !e.isWide && !e.isNoBall
      );
      const overRunsOffBat = overBalls.reduce((s, e) => s + e.runs, 0);
      if (overRunsOffBat === 0 && overBalls.length === 6) {
        b.maidens += 1;
      }

      finalBowlers[state.currentBowlerIdx] = b;
      newState.bowlersStats = finalBowlers;

      newState.lastBowlerIdx = state.currentBowlerIdx;
      events.push({ type: 'overEnd', description: `Over ${state.currentOver + 1} complete` });
    }

    // Check if innings ended (overs complete)
    if (ballResult.inningsEnded) {
      return this.endInnings(newState, events);
    }

    // Check if over ended - need new bowler
    if (ballResult.overEnded && !ballResult.inningsEnded) {
      newState.phase = 'selectBowler';
    }

    return { state: newState, events };
  }

  /**
   * Handle a wicket with detailed dismissal information
   */
  handleWicket(state, dismissalType, fielderName, otherBatsmanIdx, fielderNames, runsScored = 0, fielderId, fielderIds, runOutEnd) {
    const newState = { ...state };
    const events = [];

    // Determine which batsman is out (for run-out, it could be either)
    const outBatsmanIdx = otherBatsmanIdx !== undefined ? otherBatsmanIdx : state.strikerIdx;

    // Update batsman
    // Clear justRetired flag on all batsmen when a wicket occurs
    const updatedBatsmen = state.batsmenStats.map(b => ({ ...b, justRetired: false }));
    const outBatsman = { ...updatedBatsmen[outBatsmanIdx] };
    outBatsman.isOut = true;
    if (outBatsmanIdx === state.strikerIdx || dismissalType !== 'run-out') {
      outBatsman.balls += 1;
    }
    outBatsman.dismissalType = dismissalType;

    // Generate dismissal text based on type
    const bowler = state.bowlersStats[state.currentBowlerIdx];
    let dismissalText = '';

    switch (dismissalType) {
      case 'bowled':
        dismissalText = `b ${bowler.playerName}`;
        outBatsman.dismissedBy = bowler.playerName;
        outBatsman.bowlerId = bowler.playerId;
        break;
      case 'caught': {
        const isCaughtAndBowled = (fielderId && bowler.playerId && fielderId === bowler.playerId) ||
          (fielderName && bowler.playerName && fielderName.trim().toLowerCase() === bowler.playerName.trim().toLowerCase());
        dismissalText = isCaughtAndBowled ? `c & b ${bowler.playerName}` : `c ${fielderName} b ${bowler.playerName}`;
        outBatsman.dismissedBy = bowler.playerName;
        outBatsman.bowlerId = bowler.playerId;
        outBatsman.fielder = fielderName;
        outBatsman.fielderId = fielderId;
        break;
      }
      case 'lbw':
        dismissalText = `lbw b ${bowler.playerName}`;
        outBatsman.dismissedBy = bowler.playerName;
        outBatsman.bowlerId = bowler.playerId;
        break;
      case 'run-out':
        // Handle multiple fielders
        if (fielderNames && fielderNames.length > 0) {
          const fieldersText = fielderNames.join(' & ');
          dismissalText = runsScored > 0
            ? `run out (${fieldersText}) ${runsScored} run${runsScored > 1 ? 's' : ''}`
            : `run out (${fieldersText})`;
          outBatsman.fielder = fieldersText;
          outBatsman.fielderIds = fielderIds;
          outBatsman.fielderId = fielderId;
        } else if (fielderName) {
          dismissalText = runsScored > 0
            ? `run out (${fielderName}) ${runsScored} run${runsScored > 1 ? 's' : ''}`
            : `run out (${fielderName})`;
          outBatsman.fielder = fielderName;
          outBatsman.fielderId = fielderId;
        } else {
          dismissalText = runsScored > 0
            ? `run out ${runsScored} run${runsScored > 1 ? 's' : ''}`
            : 'run out';
        }
        break;
      case 'stumped':
        dismissalText = `st ${fielderName} b ${bowler.playerName}`;
        outBatsman.dismissedBy = bowler.playerName;
        outBatsman.bowlerId = bowler.playerId;
        outBatsman.fielder = fielderName;
        outBatsman.fielderId = fielderId;
        break;
      case 'hit-wicket':
        dismissalText = `hit wicket b ${bowler.playerName}`;
        outBatsman.dismissedBy = bowler.playerName;
        outBatsman.bowlerId = bowler.playerId;
        break;
      case 'handled-the-ball':
        dismissalText = 'handled the ball';
        break;
      case 'obstructing-the-field':
        dismissalText = 'obstructing the field';
        break;
      default:
        dismissalText = dismissalType;
    }

    outBatsman.dismissal = dismissalText;
    updatedBatsmen[outBatsmanIdx] = outBatsman;

    // Update bowler — run-out, handled-the-ball, obstructing-the-field do NOT count as bowler's wickets
    const updatedBowlers = [...state.bowlersStats];
    const currentBowler = { ...updatedBowlers[state.currentBowlerIdx] };
    const bowlerWicketDismissals = ['run-out', 'handled-the-ball', 'obstructing-the-field'];
    if (!bowlerWicketDismissals.includes(dismissalType)) {
      currentBowler.wickets += 1;
    }
    currentBowler.balls += 1;
    if (currentBowler.balls >= 6) {
      currentBowler.overs += 1;
      currentBowler.balls = 0;
    }
    updatedBowlers[state.currentBowlerIdx] = currentBowler;

    // Update stats if runs were completed on run-out
    if (dismissalType === 'run-out') {
      if (outBatsmanIdx === state.strikerIdx) {
        // Striker got out - faced the ball, credit runsScored to outBatsman
        outBatsman.balls += 1;
        outBatsman.runs += runsScored;
        if (runsScored === 4) outBatsman.fours += 1;
        if (runsScored === 6) outBatsman.sixes += 1;
        outBatsman.strikeRate = outBatsman.balls > 0 ? (outBatsman.runs / outBatsman.balls) * 100 : 0;
        updatedBatsmen[outBatsmanIdx] = outBatsman;
      } else {
        // Non-striker got out - striker faced delivery, credit runsScored to striker
        const strikerStats = { ...updatedBatsmen[state.strikerIdx] };
        strikerStats.balls += 1;
        if (runsScored > 0) {
          strikerStats.runs += runsScored;
          if (runsScored === 4) strikerStats.fours += 1;
          if (runsScored === 6) strikerStats.sixes += 1;
        }
        strikerStats.strikeRate = strikerStats.balls > 0 ? (strikerStats.runs / strikerStats.balls) * 100 : 0;
        updatedBatsmen[state.strikerIdx] = strikerStats;
      }

      if (runsScored > 0) {
        currentBowler.runs += runsScored;
        updatedBowlers[state.currentBowlerIdx] = currentBowler;
        newState.currentRuns = state.currentRuns + runsScored;
      }
    }

    // Generate detailed commentary
    const commentary = this.generateWicketCommentary(
      dismissalType,
      outBatsman.playerName,
      bowler.playerName,
      fielderName,
      outBatsmanIdx === state.strikerIdx ? 'striker' : 'non-striker',
      fielderNames,
      runsScored,
      runOutEnd
    );

    // Create ball event with IDs
    const ballEvent = {
      over: state.currentOver,
      ball: state.currentBall,
      ballLabel: this._computeBallLabel(state.ballEvents, state.currentOver),
      runs: runsScored,
      isWicket: true,
      isWide: false,
      isNoBall: false,
      batsman: outBatsman.playerName,
      batsmanId: outBatsman.playerId,
      bowler: currentBowler.playerName,
      bowlerId: currentBowler.playerId,
      commentary,
      strikerIdx: state.strikerIdx,
      nonStrikerIdx: state.nonStrikerIdx,
      strikerId: state.batsmenStats[state.strikerIdx]?.playerId,
      nonStrikerId: state.batsmenStats[state.nonStrikerIdx]?.playerId,
      outBatsmanId: outBatsman.playerId,
      fielderId: fielderId || null,
      fielderIds: fielderIds || (fielderId ? [fielderId] : []),
      dismissalType: dismissalType,
      runOutEnd: runOutEnd || null,
    };

    newState.batsmenStats = updatedBatsmen;
    newState.bowlersStats = updatedBowlers;
    newState.ballEvents = [...state.ballEvents, ballEvent];
    newState.currentWickets = state.currentWickets + 1;

    events.push({ type: 'wicket', description: commentary });

    // If target was reached on runs scored before run-out in 2nd innings
    if (state.currentInningsNum === 1 && state.completedInnings.length > 0 && runsScored > 0) {
      const target = state.completedInnings[0].totalRuns + 1;
      if (newState.currentRuns >= target) {
        return this.endMatch(newState, events);
      }
    }

    // After a wicket, we need to advance the ball count but NOT rotate strike
    // The batsman at the other end remains, and we'll select a new batsman to replace the out batsman
    const newBall = state.currentBall + 1;
    let newOver = state.currentOver;
    let overEnded = false;
    let inningsEnded = false;

    if (newBall >= 6) {
      newOver = state.currentOver + 1;
      overEnded = true;
      inningsEnded = newOver >= state.maxOvers;
    }

    newState.currentOver = newOver;
    newState.currentBall = overEnded ? 0 : newBall;

    // Determine which end the run-out occurred at
    if (dismissalType === 'run-out' && runOutEnd) {
      const isBowlersEnd = runOutEnd === 'bowlers-end';
      const survivingIdx = outBatsmanIdx === state.strikerIdx ? state.nonStrikerIdx : state.strikerIdx;

      // Bowler's End (non-striker's crease): vacant slot for new batter is nonStrikerIdx.
      // Keeper's End (striker's crease): vacant slot for new batter is strikerIdx.
      if (isBowlersEnd) {
        newState.strikerIdx = survivingIdx;     // Surviving batter takes/remains at striker end
        newState.nonStrikerIdx = outBatsmanIdx; // Vacant non-striker end for new batter
      } else {
        newState.strikerIdx = outBatsmanIdx;    // Vacant striker end for new batter
        newState.nonStrikerIdx = survivingIdx; // Surviving batter takes/remains at non-striker end
      }
    } else {
      // For regular dismissals (bowled, caught, lbw, stumped, hit-wicket):
      // Striker was out at striker end. Non-striker remains at non-striker end.
      newState.strikerIdx = state.strikerIdx; // out batter at striker end (vacant)
      newState.nonStrikerIdx = state.nonStrikerIdx;
    }

    // Check if over ended
    if (overEnded) {
      // Recalculate bowler economy
      const finalBowlers = [...newState.bowlersStats];
      const b = { ...finalBowlers[state.currentBowlerIdx] };
      const totalBalls = (b.overs || 0) * 6 + (b.balls || 0);
      b.economy = totalBalls > 0 ? (b.runs / totalBalls) * 6 : 0;

      // Check for maiden over (6 legal balls, 0 runs scored off the bat)
      const overBalls = newState.ballEvents.filter(
        e => e.over === state.currentOver && !e.isWide && !e.isNoBall
      );
      const overRunsOffBat = overBalls.reduce((s, e) => s + e.runs, 0);
      if (overRunsOffBat === 0 && overBalls.length === 6) {
        b.maidens += 1;
      }

      finalBowlers[state.currentBowlerIdx] = b;
      newState.bowlersStats = finalBowlers;

      newState.lastBowlerIdx = state.currentBowlerIdx;
      events.push({ type: 'overEnd', description: `Over ${state.currentOver + 1} complete` });
    }

    const newWickets = newState.currentWickets;
    const allOut = newWickets >= state.teamSize - 1;

    // Check if all out
    if (allOut) {
      return this.endInnings(newState, events);
    }

    // Check if remaining batsmen
    // Filter out the batsman who is at the crease (not the one who got out)
    const batsmanAtCreaseIdx = outBatsmanIdx === state.strikerIdx ? state.nonStrikerIdx : state.strikerIdx;
    const remainingActiveBatsmen = updatedBatsmen.filter(
      (b, idx) => !b.isOut && !b.isRetiredHurt && idx !== batsmanAtCreaseIdx
    );
    const retiredBatsmen = updatedBatsmen.filter(b => b.isRetiredHurt);

    // If no regular batsmen available, but retired out players exist, prompt whether to bring them back
    if (remainingActiveBatsmen.length === 0 && retiredBatsmen.length > 0) {
      newState.pendingOverEnd = overEnded;
      newState.phase = 'retiredHurtConfirm';
      return { state: newState, events };
    }

    // Check if no more batsmen available at all
    const remainingBatsmen = updatedBatsmen.filter(
      (b, idx) => !b.isOut && idx !== batsmanAtCreaseIdx
    );
    if (remainingBatsmen.length === 0) {
      return this.endInnings(newState, events);
    }

    // Check if innings ended (overs complete)
    if (inningsEnded) {
      return this.endInnings(newState, events);
    }

    // Need new batsman (and possibly new bowler if over ended)
    newState.pendingOverEnd = overEnded;
    newState.phase = 'selectNextBatsman';
    return { state: newState, events };
  }

  /**
  /**
   * Handle retired hurt for a specific batsman (striker or non-striker)
   */
  handleRetiredHurt(state, targetBatsmanIdx) {
    const newState = { ...state };
    const events = [];

    // Determine target batsman: default to strikerIdx if targetBatsmanIdx is invalid
    const retiredIdx = (targetBatsmanIdx !== undefined && state.batsmenStats[targetBatsmanIdx]) ? targetBatsmanIdx : state.strikerIdx;
    const survivingIdx = retiredIdx === state.strikerIdx ? state.nonStrikerIdx : state.strikerIdx;

    // Mark the selected batsman as retired out (temporarily unavailable, can return)
    // Clear previous justRetired flags, and set justRetired on newly retired player
    const updatedBatsmen = state.batsmenStats.map(b => ({ ...b, justRetired: false }));
    const retiredBatsman = { ...updatedBatsmen[retiredIdx] };
    retiredBatsman.isRetiredHurt = true;
    retiredBatsman.justRetired = true; // Cannot return immediately on the next batsman selection
    retiredBatsman.dismissalType = 'retired-out';
    retiredBatsman.dismissal = 'retired out';
    updatedBatsmen[retiredIdx] = retiredBatsman;

    // Retired out does NOT count as a ball - bowler stats remain unchanged
    const updatedBowlers = [...state.bowlersStats];
    const bowler = { ...updatedBowlers[state.currentBowlerIdx] };

    // Position vacant end for incoming batter:
    // If striker retired: vacant slot is strikerIdx. Surviving non-striker stays at nonStrikerIdx.
    // If non-striker retired: vacant slot is nonStrikerIdx. Surviving striker stays at strikerIdx.
    if (retiredIdx === state.strikerIdx) {
      newState.strikerIdx = retiredIdx;       // Vacant striker slot for new batter
      newState.nonStrikerIdx = survivingIdx; // Surviving non-striker stays at non-striker end
    } else {
      newState.strikerIdx = survivingIdx;    // Surviving striker stays at striker end
      newState.nonStrikerIdx = retiredIdx;   // Vacant non-striker slot for new batter
    }

    // Generate commentary
    const positionText = retiredIdx === state.strikerIdx ? 'striker' : 'non-striker';
    const commentary = `Retired out! ${retiredBatsman.playerName} (${positionText}) has retired out and can return later.`;

    // Create ball event (not a legal delivery)
    const ballEvent = {
      over: state.currentOver,
      ball: state.currentBall,
      ballLabel: this._computeBallLabel(state.ballEvents, state.currentOver),
      runs: 0,
      isWicket: false, // Not counted as a wicket immediately
      isWide: false,
      isNoBall: false,
      isRetiredHurt: true, // Mark as retired out event
      batsman: retiredBatsman.playerName,
      batsmanId: retiredBatsman.playerId,
      outBatsmanId: retiredBatsman.playerId,
      bowler: bowler.playerName,
      commentary,
      strikerIdx: state.strikerIdx,
      nonStrikerIdx: state.nonStrikerIdx,
    };

    newState.batsmenStats = updatedBatsmen;
    newState.bowlersStats = updatedBowlers;
    newState.ballEvents = [...state.ballEvents, ballEvent];

    events.push({ type: 'retiredHurt', description: commentary });

    // Retired out does NOT advance the ball count
    newState.currentOver = state.currentOver;
    newState.currentBall = state.currentBall;

    // Check if only retired out players are available to bat
    const retiredOutBatsmen = updatedBatsmen.filter(b => b.isRetiredHurt);
    const availableBatsmen = updatedBatsmen.filter(
      (b, idx) => !b.isOut && !b.isRetiredHurt && idx !== survivingIdx
    );

    // If no regular batsmen available but retired out players exist
    if (availableBatsmen.length === 0 && retiredOutBatsmen.length > 0) {
      newState.phase = 'retiredHurtConfirm';
      return { state: newState, events };
    }

    // Need new batsman
    newState.pendingOverEnd = false;
    newState.phase = 'selectNextBatsman';
    return { state: newState, events };
  }

  /**
   * Confirm whether retired out player(s) can return or innings ends
   */
  confirmRetiredHurt(state, canReturn) {
    const newState = { ...state };
    const events = [];

    if (canReturn) {
      // Players can return, allow selection
      const updatedBatsmen = [...state.batsmenStats];
      const retiredBatsmen = updatedBatsmen.filter(b => b.isRetiredHurt);

      // Mark them as able to return
      retiredBatsmen.forEach(retiredBatsman => {
        const idx = updatedBatsmen.indexOf(retiredBatsman);
        updatedBatsmen[idx] = { ...retiredBatsman, canReturn: true };
      });

      newState.batsmenStats = updatedBatsmen;
      newState.phase = 'selectNextBatsman';

      const commentary = `Retired out player(s) returning to bat.`;
      events.push({ type: 'run', description: commentary });
    } else {
      // Players do not return, mark all retired out as out and count wickets to the fullest
      const updatedBatsmen = [...state.batsmenStats];
      const retiredBatsmen = updatedBatsmen.filter(b => b.isRetiredHurt);
      const numRetiredHurt = retiredBatsmen.length;

      // Mark all retired out players as out
      retiredBatsmen.forEach(retiredBatsman => {
        const idx = updatedBatsmen.indexOf(retiredBatsman);
        updatedBatsmen[idx] = {
          ...retiredBatsman,
          isOut: true,
          isRetiredHurt: false,
          dismissal: 'retired out'
        };
      });

      newState.batsmenStats = updatedBatsmen;
      // Wickets must be counted to the fullest (teamSize - 1)
      const maxWickets = Math.max(0, state.teamSize - 1);
      newState.currentWickets = Math.max(state.currentWickets + numRetiredHurt, maxWickets);

      const playerNames = retiredBatsmen.map(b => b.playerName).join(', ');
      const commentary = `${playerNames} opted not to return. Innings ended with ${newState.currentWickets} wickets.`;
      events.push({ type: 'wicket', description: commentary });

      // End innings as team has ended their innings
      return this.endInnings(newState, events);
    }

    return { state: newState, events };
  }

  /**
   * Handle a wide ball
   */
  handleWide(state, runsScored = 0) {
    const newState = { ...state };
    const events = [];
    const extraRunsCounted = !!state.extraRunsCounted;

    // In cricket: 1 base penalty run for wide if extras are counted, plus any runs scored
    // If extra runs are not counted, 0 runs added
    const totalWideRuns = extraRunsCounted ? (1 + runsScored) : 0;

    const updatedBowlers = [...state.bowlersStats];
    const bowler = { ...updatedBowlers[state.currentBowlerIdx] };
    bowler.wides += 1;
    bowler.runs += totalWideRuns;
    updatedBowlers[state.currentBowlerIdx] = bowler;

    // Update extras breakdown
    const extrasBreakdown = state.extrasBreakdown || { byes: 0, legByes: 0, wides: 0, noBalls: 0 };
    newState.extrasBreakdown = {
      ...extrasBreakdown,
      wides: extrasBreakdown.wides + (extraRunsCounted ? totalWideRuns : 0),
    };
    newState.extras = (state.extras || 0) + totalWideRuns;
    newState.currentRuns = state.currentRuns + totalWideRuns;

    // Rotate strike if odd runs were completed on the wide
    let newStrikerIdx = state.strikerIdx;
    let newNonStrikerIdx = state.nonStrikerIdx;
    if (runsScored % 2 === 1) {
      newStrikerIdx = state.nonStrikerIdx;
      newNonStrikerIdx = state.strikerIdx;
    }
    newState.strikerIdx = newStrikerIdx;
    newState.nonStrikerIdx = newNonStrikerIdx;

    const commentary = runsScored > 0 ? `Wide ball + ${runsScored} extra run${runsScored > 1 ? 's' : ''}!` : 'Wide ball!';
    const ballEvent = {
      over: state.currentOver,
      ball: state.currentBall,
      ballLabel: this._computeBallLabel(state.ballEvents, state.currentOver),
      runs: totalWideRuns,
      isWicket: false,
      isWide: true,
      isNoBall: false,
      batsman: state.batsmenStats[state.strikerIdx]?.playerName || '',
      bowler: bowler.playerName,
      commentary,
      strikerIdx: state.strikerIdx,
      nonStrikerIdx: state.nonStrikerIdx,
    };

    newState.bowlersStats = updatedBowlers;
    newState.ballEvents = [...state.ballEvents, ballEvent];

    events.push({ type: 'wide', description: commentary });

    // Check target in 2nd innings
    if (state.currentInningsNum === 1 && state.completedInnings.length > 0) {
      const target = state.completedInnings[0].totalRuns + 1;
      if (newState.currentRuns >= target) {
        return this.endMatch(newState, events);
      }
    }

    return { state: newState, events };
  }

  /**
   * Handle a no ball
   */
  handleNoBall(state, runsScored = 0) {
    const newState = { ...state };
    const events = [];
    const extraRunsCounted = !!state.extraRunsCounted;

    // 1 base penalty run if extra runs are counted
    const basePenalty = extraRunsCounted ? 1 : 0;
    const totalRunsAdded = basePenalty + runsScored;

    const updatedBowlers = [...state.bowlersStats];
    const bowler = { ...updatedBowlers[state.currentBowlerIdx] };
    bowler.noBalls += 1;
    bowler.runs += totalRunsAdded; // Penalty + bat runs charged to bowler
    updatedBowlers[state.currentBowlerIdx] = bowler;

    // Update extras breakdown
    const extrasBreakdown = state.extrasBreakdown || { byes: 0, legByes: 0, wides: 0, noBalls: 0 };
    newState.extrasBreakdown = {
      ...extrasBreakdown,
      noBalls: extrasBreakdown.noBalls + (extraRunsCounted ? 1 : 0),
    };
    newState.extras = (state.extras || 0) + basePenalty;

    // Update batsman stats - no-ball always counts as a ball faced
    const updatedBatsmen = [...state.batsmenStats];
    const striker = { ...updatedBatsmen[state.strikerIdx] };
    striker.balls += 1; // Ball counts for batsman on no ball
    if (runsScored > 0) {
      striker.runs += runsScored;
      if (runsScored === 4) striker.fours += 1;
      if (runsScored === 6) striker.sixes += 1;
    }
    striker.strikeRate = striker.balls > 0 ? (striker.runs / striker.balls) * 100 : 0;
    updatedBatsmen[state.strikerIdx] = striker;

    // Rotate strike if odd runs
    if (runsScored % 2 === 1) {
      newState.strikerIdx = state.nonStrikerIdx;
      newState.nonStrikerIdx = state.strikerIdx;
    }

    // Update total runs
    newState.currentRuns = state.currentRuns + totalRunsAdded;

    let commentary = 'No ball!';
    if (runsScored > 0 && basePenalty > 0) {
      commentary = `No ball! 1 penalty run + ${runsScored} run${runsScored > 1 ? 's' : ''} scored off bat.`;
    } else if (runsScored > 0) {
      commentary = `No ball! ${runsScored} run${runsScored > 1 ? 's' : ''} scored off bat.`;
    }

    const ballEvent = {
      over: state.currentOver,
      ball: state.currentBall,
      ballLabel: this._computeBallLabel(state.ballEvents, state.currentOver),
      runs: totalRunsAdded,
      isWicket: false,
      isWide: false,
      isNoBall: true,
      batsman: state.batsmenStats[state.strikerIdx]?.playerName || '',
      bowler: bowler.playerName,
      commentary,
      strikerIdx: state.strikerIdx,
      nonStrikerIdx: state.nonStrikerIdx,
    };

    newState.batsmenStats = updatedBatsmen;
    newState.bowlersStats = updatedBowlers;
    newState.ballEvents = [...state.ballEvents, ballEvent];

    events.push({ type: 'noBall', description: commentary });

    // Check target in 2nd innings
    if (state.currentInningsNum === 1 && state.completedInnings.length > 0) {
      const target = state.completedInnings[0].totalRuns + 1;
      if (newState.currentRuns >= target) {
        return this.endMatch(newState, events);
      }
    }

    return { state: newState, events };
  }

  /**
   * Select next batsman after wicket
   */
  selectNextBatsman(state, batsmanIdx) {
    // Determine which batsman was out by checking the last ball event
    const lastBallEvent = state.ballEvents[state.ballEvents.length - 1];
    const outBatsmanId = lastBallEvent?.outBatsmanId;
    const outBatsmanIdx = state.batsmenStats.findIndex(b => b.playerId === outBatsmanId);

    // Determine which end is vacant:
    // Check if nonStrikerIdx or strikerIdx points to an out batsman OR a retired hurt batsman.
    const nonStrikerIsVacant = state.nonStrikerIdx === outBatsmanIdx || 
      !!state.batsmenStats[state.nonStrikerIdx]?.isOut || 
      !!state.batsmenStats[state.nonStrikerIdx]?.isRetiredHurt;
    const strikerIsVacant = state.strikerIdx === outBatsmanIdx || 
      !!state.batsmenStats[state.strikerIdx]?.isOut || 
      !!state.batsmenStats[state.strikerIdx]?.isRetiredHurt;

    let newState;

    if (state.pendingOverEnd) {
      // Wicket occurred on ball 6.
      // After placing new batter at vacant end, over-end swap rotates strike for next over!
      if (nonStrikerIsVacant) {
        // Vacant position is non-striker end (e.g. Bowler's End run out).
        // Before over-end: surviving batter is striker, new batter is non-striker.
        // After over-end swap: new batter becomes striker, surviving batter becomes non-striker.
        newState = {
          ...state,
          strikerIdx: batsmanIdx,
          nonStrikerIdx: state.strikerIdx,
          pendingOverEnd: false,
        };
      } else {
        // Vacant position is striker end (e.g. Keeper's End run out).
        // Before over-end: new batter is striker, surviving batter is non-striker.
        // After over-end swap: surviving batter becomes striker, new batter becomes non-striker.
        newState = {
          ...state,
          strikerIdx: state.nonStrikerIdx,
          nonStrikerIdx: batsmanIdx,
          pendingOverEnd: false,
        };
      }
    } else {
      // Regular ball within over (balls 1 to 5)
      if (nonStrikerIsVacant) {
        // Vacant position is non-striker end (e.g. Bowler's End run out):
        // Surviving batter stays at striker end (ON STRIKE).
        // New incoming batter takes non-striker end (OFF STRIKE).
        newState = {
          ...state,
          strikerIdx: state.strikerIdx,   // Surviving batter stays on strike
          nonStrikerIdx: batsmanIdx,     // New batter comes to non-striker end
          pendingOverEnd: false,
        };
      } else {
        // Vacant position is striker end (e.g. Keeper's End run out):
        // New incoming batter takes striker end (ON STRIKE).
        // Surviving batter stays at non-striker end (OFF STRIKE).
        newState = {
          ...state,
          strikerIdx: batsmanIdx,        // New batter comes to striker end
          nonStrikerIdx: state.nonStrikerIdx, // Surviving batter stays at non-striker end
          pendingOverEnd: false,
        };
      }
    }

    // Mark the newly selected batsman as having batted
    const updatedBatsmen = [...state.batsmenStats];
    const selectedBatsman = updatedBatsmen[batsmanIdx];
    if (selectedBatsman) {
      updatedBatsmen[batsmanIdx] = {
        ...selectedBatsman,
        hasBatted: true,
        ...(selectedBatsman.isRetiredHurt ? { isRetiredHurt: false, canReturn: false } : {})
      };
      newState.batsmenStats = updatedBatsmen;
    }

    if (state.pendingOverEnd) {
      newState.phase = 'selectBowler';
    } else {
      newState.phase = 'scoring';
    }

    return newState;
  }

  /**
   * Handle undo of last ball
   */
  handleUndo(state) {
    if (state.ballEvents.length === 0) {
      return { state, events: [] };
    }

    const newState = { ...state };
    const events = [];
    const lastEvent = state.ballEvents[state.ballEvents.length - 1];
    newState.ballEvents = state.ballEvents.slice(0, -1);

    if (lastEvent.isRetiredHurt) {
      const updatedBatsmen = [...state.batsmenStats];
      const retIdx = updatedBatsmen.findIndex(b => (lastEvent.batsmanId ? b.playerId === lastEvent.batsmanId : b.playerName === lastEvent.batsman));

      if (retIdx >= 0) {
        updatedBatsmen[retIdx] = {
          ...updatedBatsmen[retIdx],
          isRetiredHurt: false,
          justRetired: false,
          dismissal: undefined,
          dismissalType: undefined,
        };
      }
      newState.batsmenStats = updatedBatsmen;

      // Restore exact striker and non-striker positions from event
      if (lastEvent.strikerIdx !== undefined && lastEvent.nonStrikerIdx !== undefined) {
        newState.strikerIdx = lastEvent.strikerIdx;
        newState.nonStrikerIdx = lastEvent.nonStrikerIdx;
      }

      // Ensure phase is set back to scoring
      newState.phase = 'scoring';
      events.push({ type: 'undo', description: 'Retired out undone' });
    } else if (lastEvent.isWicket) {
      const updatedBatsmen = [...state.batsmenStats];
      const outIdx = updatedBatsmen.findIndex(b => (lastEvent.batsmanId ? b.playerId === lastEvent.batsmanId : b.playerName === lastEvent.batsman));
      const strikerIdxAtEvent = lastEvent.strikerIdx !== undefined ? lastEvent.strikerIdx : state.strikerIdx;
      const isRunOut = lastEvent.dismissalType === 'run-out';
      const isStrikerOut = outIdx === strikerIdxAtEvent;

      // Mark dismissed batsman as not out and clear dismissal
      if (outIdx >= 0) {
        updatedBatsmen[outIdx] = {
          ...updatedBatsmen[outIdx],
          isOut: false,
          dismissal: undefined,
        };
      }

      // Deduct ball faced from the striker who faced the delivery:
      // For standard dismissals or run-out of striker: outIdx is strikerIdxAtEvent, so deduct from outIdx.
      // For run-out of non-striker: strikerIdxAtEvent faced the delivery, so deduct ball from strikerIdxAtEvent (not non-striker).
      const facedBatsmanIdx = isRunOut ? strikerIdxAtEvent : outIdx;
      if (facedBatsmanIdx >= 0 && updatedBatsmen[facedBatsmanIdx]) {
        const faced = { ...updatedBatsmen[facedBatsmanIdx] };
        faced.balls = Math.max(0, faced.balls - 1);
        faced.strikeRate = faced.balls > 0 ? (faced.runs / faced.balls) * 100 : 0;
        updatedBatsmen[facedBatsmanIdx] = faced;
      }

      // If runs were scored on a run-out wicket, revert them from team score, striker, and bowler
      const wicketRuns = lastEvent.runs || 0;
      if (isRunOut && wicketRuns > 0) {
        newState.currentRuns = Math.max(0, state.currentRuns - wicketRuns);

        // Revert completed bat runs from striker
        if (strikerIdxAtEvent >= 0 && updatedBatsmen[strikerIdxAtEvent]) {
          const s = { ...updatedBatsmen[strikerIdxAtEvent] };
          s.runs = Math.max(0, s.runs - wicketRuns);
          if (wicketRuns === 4) s.fours = Math.max(0, s.fours - 1);
          if (wicketRuns === 6) s.sixes = Math.max(0, s.sixes - 1);
          s.strikeRate = s.balls > 0 ? (s.runs / s.balls) * 100 : 0;
          updatedBatsmen[strikerIdxAtEvent] = s;
        }

        // Revert runs from bowler's conceded runs
        const updatedBowlers = [...state.bowlersStats];
        const bIdx = updatedBowlers.findIndex(b => b.playerName === lastEvent.bowler);
        if (bIdx >= 0) {
          updatedBowlers[bIdx] = {
            ...updatedBowlers[bIdx],
            runs: Math.max(0, updatedBowlers[bIdx].runs - wicketRuns),
          };
          newState.bowlersStats = updatedBowlers;
        }
      }

      // If a new batsman came in at strikerIdx or nonStrikerIdx and hasn't faced a ball or scored, revert their hasBatted
      const currentStriker = updatedBatsmen[state.strikerIdx];
      if (currentStriker && currentStriker.balls === 0 && currentStriker.runs === 0 && state.strikerIdx !== lastEvent.strikerIdx) {
        updatedBatsmen[state.strikerIdx] = {
          ...currentStriker,
          hasBatted: false
        };
      }
      const currentNonStriker = updatedBatsmen[state.nonStrikerIdx];
      if (currentNonStriker && currentNonStriker.balls === 0 && currentNonStriker.runs === 0 && state.nonStrikerIdx !== lastEvent.nonStrikerIdx) {
        updatedBatsmen[state.nonStrikerIdx] = {
          ...currentNonStriker,
          hasBatted: false
        };
      }

      newState.batsmenStats = updatedBatsmen;
      newState.currentWickets = Math.max(0, state.currentWickets - 1);

      if (lastEvent.strikerIdx !== undefined && lastEvent.nonStrikerIdx !== undefined) {
        newState.strikerIdx = lastEvent.strikerIdx;
        newState.nonStrikerIdx = lastEvent.nonStrikerIdx;
      }

      const updatedBowlers = newState.bowlersStats || [...state.bowlersStats];
      const bowlerIdx = updatedBowlers.findIndex(b => (lastEvent.bowlerId ? b.playerId === lastEvent.bowlerId : b.playerName === lastEvent.bowler));
      if (bowlerIdx >= 0) {
        const isBowlerWicket = !['run-out', 'handled-the-ball', 'obstructing-the-field'].includes(lastEvent.dismissalType);
        const b = { ...updatedBowlers[bowlerIdx] };
        if (isBowlerWicket) {
          b.wickets = Math.max(0, b.wickets - 1);
        }
        // Wickets on legal deliveries incremented bowler.balls, so decrement bowler.balls
        if (b.balls === 0 && b.overs > 0) {
          b.overs -= 1;
          b.balls = 5;
        } else {
          b.balls = Math.max(0, b.balls - 1);
        }
        // Recalculate economy rate
        const totalBalls = b.overs * 6 + b.balls;
        b.economy = totalBalls > 0 ? (b.runs / totalBalls) * 6 : 0;
        updatedBowlers[bowlerIdx] = b;
      }
      newState.bowlersStats = updatedBowlers;

      if (state.currentBall === 0 && state.currentOver > 0) {
        newState.currentOver = state.currentOver - 1;
        newState.currentBall = 5;
      } else {
        newState.currentBall = Math.max(0, state.currentBall - 1);
      }

      events.push({ type: 'undo', description: 'Wicket undone' });
    } else if (lastEvent.isWide || lastEvent.isNoBall) {
      // Revert extra runs from team score and bowler runs (Wides/No-balls DO NOT increment bowler.balls count)
      const runsToRevert = lastEvent.runs || 0;
      newState.currentRuns = Math.max(0, state.currentRuns - runsToRevert);
      newState.extras = Math.max(0, (state.extras || 0) - runsToRevert);

      const updatedBowlers = [...state.bowlersStats];
      const bIdx = updatedBowlers.findIndex(b => (lastEvent.bowlerId ? b.playerId === lastEvent.bowlerId : b.playerName === lastEvent.bowler));
      if (bIdx >= 0) {
        const b = { ...updatedBowlers[bIdx] };
        b.runs = Math.max(0, b.runs - runsToRevert);
        if (lastEvent.isWide) b.wides = Math.max(0, b.wides - 1);
        if (lastEvent.isNoBall) b.noBalls = Math.max(0, b.noBalls - 1);
        const totalBalls = b.overs * 6 + b.balls;
        b.economy = totalBalls > 0 ? (b.runs / totalBalls) * 6 : 0;
        updatedBowlers[bIdx] = b;
      }
      newState.bowlersStats = updatedBowlers;

      // If runs were scored off bat on no-ball, revert them from batsman
      if (lastEvent.isNoBall) {
        const extraRunsCounted = !!state.extraRunsCounted;
        const batRuns = extraRunsCounted ? Math.max(0, runsToRevert - 1) : runsToRevert;
        if (batRuns > 0) {
          const updatedBatsmen = [...state.batsmenStats];
          const bIdx = updatedBatsmen.findIndex(b => b.playerName === lastEvent.batsman);
          if (bIdx >= 0) {
            const b = updatedBatsmen[bIdx];
            updatedBatsmen[bIdx] = {
              ...b,
              runs: Math.max(0, b.runs - batRuns),
              balls: Math.max(0, b.balls - 1),
              fours: batRuns === 4 ? Math.max(0, b.fours - 1) : b.fours,
              sixes: batRuns === 6 ? Math.max(0, b.sixes - 1) : b.sixes,
              strikeRate: Math.max(0, b.balls - 1) > 0 ? (Math.max(0, b.runs - batRuns) / Math.max(1, b.balls - 1)) * 100 : 0,
            };
          }
          newState.batsmenStats = updatedBatsmen;
        }
      }

      // Restore strike positions if odd runs were scored
      if (lastEvent.strikerIdx !== undefined && lastEvent.nonStrikerIdx !== undefined) {
        newState.strikerIdx = lastEvent.strikerIdx;
        newState.nonStrikerIdx = lastEvent.nonStrikerIdx;
      }

      events.push({ type: 'undo', description: 'Extra undone' });
    } else {
      newState.currentRuns = Math.max(0, state.currentRuns - lastEvent.runs);

      const updatedBatsmen = [...state.batsmenStats];
      const bIdx = updatedBatsmen.findIndex(b => b.playerName === lastEvent.batsman);
      if (bIdx >= 0) {
        const b = updatedBatsmen[bIdx];
        updatedBatsmen[bIdx] = {
          ...b,
          runs: Math.max(0, b.runs - lastEvent.runs),
          balls: Math.max(0, b.balls - 1),
          fours: lastEvent.runs === 4 ? Math.max(0, b.fours - 1) : b.fours,
          sixes: lastEvent.runs === 6 ? Math.max(0, b.sixes - 1) : b.sixes,
          strikeRate: Math.max(0, b.balls - 1) > 0 ? (Math.max(0, b.runs - lastEvent.runs) / Math.max(1, b.balls - 1)) * 100 : 0,
        };
      }
      newState.batsmenStats = updatedBatsmen;

      const updatedBowlers = [...state.bowlersStats];
      const bowlerIdx = updatedBowlers.findIndex(b => (lastEvent.bowlerId ? b.playerId === lastEvent.bowlerId : b.playerName === lastEvent.bowler));
      if (bowlerIdx >= 0) {
        const b = { ...updatedBowlers[bowlerIdx] };
        b.runs = Math.max(0, b.runs - lastEvent.runs);

        // Legal run deliveries increment bowler.balls (or bowler.overs if completed)
        if (b.balls === 0 && b.overs > 0) {
          b.overs -= 1;
          b.balls = 5;
        } else {
          b.balls = Math.max(0, b.balls - 1);
        }

        const totalBalls = b.overs * 6 + b.balls;
        b.economy = totalBalls > 0 ? (b.runs / totalBalls) * 6 : 0;
        updatedBowlers[bowlerIdx] = b;
      }
      newState.bowlersStats = updatedBowlers;

      if (lastEvent.runs % 2 === 1) {
        newState.strikerIdx = state.nonStrikerIdx;
        newState.nonStrikerIdx = state.strikerIdx;
      }

      if (state.currentBall === 0 && state.currentOver > 0) {
        newState.currentOver = state.currentOver - 1;
        newState.currentBall = 5;
      } else {
        newState.currentBall = Math.max(0, state.currentBall - 1);
      }

      events.push({ type: 'undo', description: `${lastEvent.runs} run(s) undone` });
    }

    // Always restore active bowler (currentBowlerIdx) to the bowler who delivered the undone ball
    const activeBowlerIdx = newState.bowlersStats.findIndex(b => (lastEvent.bowlerId ? b.playerId === lastEvent.bowlerId : b.playerName === lastEvent.bowler));
    if (activeBowlerIdx >= 0) {
      newState.currentBowlerIdx = activeBowlerIdx;
    }

    newState.phase = 'scoring';
    return { state: newState, events };
  }

  /**
   * Swap strike
   */
  swapStrike(state) {
    return {
      ...state,
      strikerIdx: state.nonStrikerIdx,
      nonStrikerIdx: state.strikerIdx,
    };
  }

  /**
   * End current innings
   */
  endInnings(state, events = []) {
    let battingTeamId;
    let bowlingTeamId;

    if (state.isSuperOver) {
      const superOver1stBattingTeamId = state.superOver1stBattingTeamId || state.team2Id;
      const superOver2ndBattingTeamId = superOver1stBattingTeamId === state.team1Id ? state.team2Id : state.team1Id;
      battingTeamId = state.currentInningsNum === 0 ? superOver1stBattingTeamId : superOver2ndBattingTeamId;
      bowlingTeamId = battingTeamId === state.team1Id ? state.team2Id : state.team1Id;
    } else {
      const firstBattingTeamId = state.firstInningsBattingTeamId || state.team1Id;
      const secondBattingTeamId = firstBattingTeamId === state.team1Id ? state.team2Id : state.team1Id;
      battingTeamId = state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId;
      bowlingTeamId = state.currentInningsNum === 0 ? secondBattingTeamId : firstBattingTeamId;
    }

    // Check if there are any unreturned retired out players
    let updatedBatsmen = [...state.batsmenStats];
    let totalWickets = state.currentWickets;
    const retiredBatsmen = updatedBatsmen.filter(b => b.isRetiredHurt);

    if (retiredBatsmen.length > 0) {
      // Mark all unreturned retired players as out
      retiredBatsmen.forEach(retiredBatsman => {
        const idx = updatedBatsmen.indexOf(retiredBatsman);
        updatedBatsmen[idx] = {
          ...retiredBatsman,
          isOut: true,
          isRetiredHurt: false,
          dismissal: 'retired out'
        };
      });

      // Count wickets to the fullest (teamSize - 1) if innings ends without overs being completed
      const totalConsumedBalls = state.currentOver * 6 + state.currentBall;
      const maxBalls = state.maxOvers * 6;
      if (totalConsumedBalls < maxBalls) {
        const maxWickets = Math.max(0, state.teamSize - 1);
        totalWickets = Math.max(state.currentWickets + retiredBatsmen.length, maxWickets);
      } else {
        totalWickets = state.currentWickets + retiredBatsmen.length;
      }
    }

    const completedInnings = {
      battingTeamId,
      bowlingTeamId,
      totalRuns: state.currentRuns,
      totalWickets: totalWickets,
      totalOvers: state.currentOver,
      totalBalls: state.currentOver >= state.maxOvers ? 0 : state.currentBall,
      extras: state.extras,
      battingStats: updatedBatsmen,
      bowlingStats: state.bowlersStats,
      ballByBall: state.ballEvents,
      currentBatsmen: [],
      currentBowler: '',
    };

    const newState = {
      ...state,
      batsmenStats: updatedBatsmen,
      currentWickets: totalWickets,
      completedInnings: [...state.completedInnings, completedInnings],
    };

    events.push({ type: 'inningsEnd', description: 'Innings complete' });

    if (state.currentInningsNum === 0) {
      newState.phase = 'inningsBreak';
    } else {
      // 2nd Innings finished: Check if match ended in a Tie
      if (state.isSuperOver) {
        const superOver1st = newState.completedInnings[2] || newState.completedInnings[newState.completedInnings.length - 2];
        const superOver1stRuns = superOver1st ? superOver1st.totalRuns : 0;
        const superOver2ndRuns = newState.currentRuns;

        if (superOver1stRuns === superOver2ndRuns) {
          // Super Over tied! Allow playing another Super Over
          newState.phase = 'tiePrompt';
          return { state: newState, events };
        }
      } else {
        const firstInnings = newState.completedInnings[0];
        const firstInningsRuns = firstInnings ? firstInnings.totalRuns : 0;
        const secondInningsRuns = newState.currentRuns;

        if (firstInningsRuns === secondInningsRuns) {
          // Tied! Prompt user to choose between Ending as Tied vs Playing Super Over
          newState.phase = 'tiePrompt';
          return { state: newState, events };
        }
      }

      return this.endMatch(newState, events);
    }

    return { state: newState, events };
  }

  /**
   * Start Super Over 1st Innings
   */
  startSuperOver(state, team1, team2) {
    const isFirstSuperOver = !state.isSuperOver;
    const superOverNum = (state.superOverNumber || 0) + 1;

    // Team batting 2nd in regular match (or previous Super Over) bats 1st in Super Over
    const firstBattingTeamId = state.firstInningsBattingTeamId || state.team1Id;
    const secondBattingTeamId = firstBattingTeamId === state.team1Id ? state.team2Id : state.team1Id;

    const superOver1stBattingTeamId = isFirstSuperOver ? secondBattingTeamId : (state.superOver1stBattingTeamId === state.team1Id ? state.team2Id : state.team1Id);
    const superOver1stBowlingTeamId = superOver1stBattingTeamId === state.team1Id ? state.team2Id : state.team1Id;

    const superOver1stBattingTeamObj = superOver1stBattingTeamId === team1.id ? team1 : team2;
    const superOver1stBowlingTeamObj = superOver1stBowlingTeamId === team1.id ? team1 : team2;

    const initialBattingStats = superOver1stBattingTeamObj.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      hasBatted: false,
      strikeRate: 0,
      isCaptain: p.isCaptain || false,
    }));

    const initialBowlingStats = superOver1stBowlingTeamObj.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      overs: 0,
      balls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      noBalls: 0,
      isCaptain: p.isCaptain || false,
    }));

    // Keep regular completedInnings for match history, but start fresh live state for Super Over
    const preservedCompletedInnings = state.completedInnings || [];

    return {
      matchId: state.matchId,
      team1Id: state.team1Id,
      team2Id: state.team2Id,
      extraRunsCounted: state.extraRunsCounted,
      firstInningsBattingTeamId: state.firstInningsBattingTeamId,
      isSuperOver: true,
      superOverNumber: superOverNum,
      superOver1stBattingTeamId,
      maxWickets: 2, // Maximum 2 wickets allowed in Super Over (3 batsmen max)
      maxOvers: 1,   // 1 over limit
      teamSize: 3,   // Only 3 batsmen max
      currentInningsNum: 0, // Reset to 0 for Super Over 1st innings so InningsBreak triggers for Super Over 2nd innings
      currentRuns: 0,
      currentWickets: 0,
      currentOver: 0,
      currentBall: 0,
      strikerIdx: 0,
      nonStrikerIdx: 1,
      batsmenStats: initialBattingStats,
      bowlersStats: initialBowlingStats,
      currentBowlerIdx: 0,
      ballEvents: [],
      extras: 0,
      pendingOverEnd: false,
      lastBowlerIdx: null,
      phase: 'selectOpeners',
      completedInnings: preservedCompletedInnings,
      regularMatchInnings: preservedCompletedInnings, // Store regular match innings safely
    };
  }

  /**
   * Start Super Over 2nd Innings
   */
  startSuperOverSecondInnings(state, team1, team2) {
    const superOver1stBattingTeamId = state.superOver1stBattingTeamId || state.team2Id;
    const superOver2ndBattingTeamId = superOver1stBattingTeamId === state.team1Id ? state.team2Id : state.team1Id;

    const superOver2ndBattingTeamObj = superOver2ndBattingTeamId === team1.id ? team1 : team2;
    const superOver2ndBowlingTeamObj = superOver1stBattingTeamId === team1.id ? team1 : team2;

    const initialBattingStats = superOver2ndBattingTeamObj.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      hasBatted: false,
      strikeRate: 0,
      isCaptain: p.isCaptain || false,
    }));

    const initialBowlingStats = superOver2ndBowlingTeamObj.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      overs: 0,
      balls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      noBalls: 0,
      isCaptain: p.isCaptain || false,
    }));

    return {
      ...state,
      currentInningsNum: 1, // Super Over 2nd Innings
      currentRuns: 0,
      currentWickets: 0,
      currentOver: 0,
      currentBall: 0,
      strikerIdx: 0,
      nonStrikerIdx: 1,
      batsmenStats: initialBattingStats,
      bowlersStats: initialBowlingStats,
      currentBowlerIdx: 0,
      ballEvents: [],
      extras: 0,
      pendingOverEnd: false,
      lastBowlerIdx: null,
      phase: 'selectOpeners',
    };
  }

  /**
   * Start second innings
   */
  startSecondInnings(state, team2, team1) {
    const initialBattingStats = team2.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      hasBatted: false,
      strikeRate: 0,
      isCaptain: p.isCaptain || false,
    }));

    const initialBowlingStats = team1.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      overs: 0,
      balls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      noBalls: 0,
      isCaptain: p.isCaptain || false,
    }));

    // Explicitly preserve completedInnings to ensure it's not lost
    const preservedCompletedInnings = state.completedInnings || [];

    console.log('🔄 startSecondInnings called');
    console.log('  Preserving completedInnings:', preservedCompletedInnings.length, 'innings');
    if (preservedCompletedInnings.length > 0) {
      preservedCompletedInnings.forEach((inn, idx) => {
        console.log(`  Innings ${idx}: battingTeamId=${inn.battingTeamId}, bowlingTeamId=${inn.bowlingTeamId}`);
      });
    }

    return {
      ...state,
      currentInningsNum: 1,
      currentRuns: 0,
      currentWickets: 0,
      currentOver: 0,
      currentBall: 0,
      strikerIdx: 0,
      nonStrikerIdx: 1,
      batsmenStats: initialBattingStats,
      bowlersStats: initialBowlingStats,
      currentBowlerIdx: 0,
      ballEvents: [],
      extras: 0,
      pendingOverEnd: false,
      lastBowlerIdx: null,
      phase: 'selectOpeners',
      completedInnings: preservedCompletedInnings, // Explicitly set to ensure it's preserved
    };
  }

  /**
   * End the match
   */
  endMatch(state, events = [], forceEnd = false) {
    events.push({ type: 'matchEnd', description: 'Match complete' });

    let finalCompletedInnings = [...(state.completedInnings || [])];
    
    // Ensure current active innings is saved into completedInnings if not already there
    const lastCompleted = finalCompletedInnings[finalCompletedInnings.length - 1];
    const isCurrentInningsSaved = lastCompleted && lastCompleted.totalRuns === state.currentRuns && lastCompleted.ballByBall?.length === state.ballEvents?.length;

    if (!isCurrentInningsSaved) {
      const firstBattingTeamId = state.firstInningsBattingTeamId || state.team1Id;
      const secondBattingTeamId = firstBattingTeamId === state.team1Id ? state.team2Id : state.team1Id;
      const battingTeamId = state.isSuperOver 
        ? (state.currentInningsNum === 0 ? (state.superOver1stBattingTeamId || secondBattingTeamId) : (state.superOver1stBattingTeamId === state.team1Id ? state.team2Id : state.team1Id))
        : (state.currentInningsNum === 0 ? firstBattingTeamId : secondBattingTeamId);
      const bowlingTeamId = battingTeamId === state.team1Id ? state.team2Id : state.team1Id;

      finalCompletedInnings.push({
        battingTeamId,
        bowlingTeamId,
        totalRuns: state.currentRuns,
        totalWickets: state.currentWickets,
        totalOvers: state.currentOver,
        totalBalls: state.currentOver >= state.maxOvers ? 0 : state.currentBall,
        extras: state.extras,
        battingStats: state.batsmenStats,
        bowlingStats: state.bowlersStats,
        ballByBall: state.ballEvents,
        currentBatsmen: [],
        currentBowler: '',
      });
    }

    // Check if regular match ended in a tie
    if (!state.isSuperOver) {
      const firstInnings = finalCompletedInnings[0];
      const secondInnings = finalCompletedInnings[1];
      const isTied = firstInnings && secondInnings && firstInnings.totalRuns === secondInnings.totalRuns;

      if (isTied && !forceEnd) {
        const newState = {
          ...state,
          completedInnings: finalCompletedInnings,
          phase: 'tiePrompt',
        };
        return { state: newState, events };
      }
    }

    const newState = {
      ...state,
      completedInnings: finalCompletedInnings,
      phase: 'matchComplete',
    };

    return { state: newState, events };
  }

  /**
   * Calculate match result string
   */
  calculateResult(state, team1Name, team2Name) {
    const outcome = this.determineOutcome(state, { id: state.team1Id, name: team1Name }, { id: state.team2Id, name: team2Name });
    return outcome.resultText;
  }

  /**
   * Determine authoritative match outcome with pure IDs
   */
  determineOutcome(state, team1, team2) {
    const t1Id = team1?.id || state.team1Id;
    const t2Id = team2?.id || state.team2Id;
    const t1Name = team1?.name || 'Team 1';
    const t2Name = team2?.name || 'Team 2';

    if (!state.completedInnings || state.completedInnings.length === 0) {
      return {
        winningTeamId: null,
        isTie: false,
        isAbandoned: true,
        resultText: `Match Abandoned. ${t1Name} scored ${state.currentRuns}/${state.currentWickets}`
      };
    }

    // If Super Over took place, calculate result from Super Over innings
    if (state.isSuperOver && state.completedInnings.length >= 4) {
      const so1 = state.completedInnings[2];
      const so2 = state.completedInnings[3] || { totalRuns: state.currentRuns, wickets: state.currentWickets, battingTeamId: so1.bowlingTeamId };
      
      const so1TeamName = so1.battingTeamId === t1Id ? t1Name : t2Name;
      const so2TeamName = so2.battingTeamId === t1Id ? t1Name : t2Name;

      if (so2.totalRuns > so1.totalRuns) {
        const wicketsLeft = (state.maxWickets || 2) - so2.totalWickets;
        return {
          winningTeamId: so2.battingTeamId,
          isTie: false,
          isAbandoned: false,
          resultText: `${so2TeamName} won via Super Over (${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''} left)`
        };
      } else if (so2.totalRuns < so1.totalRuns) {
        const runDiff = so1.totalRuns - so2.totalRuns;
        return {
          winningTeamId: so1.battingTeamId,
          isTie: false,
          isAbandoned: false,
          resultText: `${so1TeamName} won via Super Over by ${runDiff} run${runDiff !== 1 ? 's' : ''}`
        };
      } else {
        return {
          winningTeamId: null,
          isTie: true,
          isAbandoned: false,
          resultText: 'Match Tied in Super Over!'
        };
      }
    }

    const firstInnings = state.completedInnings[0];
    const secondInnings = state.completedInnings[1] || { totalRuns: state.currentRuns, totalWickets: state.currentWickets };
    const firstBattingTeamId = firstInnings.battingTeamId || state.firstInningsBattingTeamId || t1Id;
    const secondBattingTeamId = firstBattingTeamId === t1Id ? t2Id : t1Id;
    const firstBattingTeamName = firstBattingTeamId === t1Id ? t1Name : t2Name;
    const secondBattingTeamName = secondBattingTeamId === t1Id ? t1Name : t2Name;

    const firstInningsRuns = firstInnings.totalRuns;
    const secondInningsRuns = secondInnings.totalRuns;

    if (secondInningsRuns > firstInningsRuns) {
      const wicketsLeft = state.teamSize - 1 - secondInnings.totalWickets;
      return {
        winningTeamId: secondBattingTeamId,
        isTie: false,
        isAbandoned: false,
        resultText: `${secondBattingTeamName} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`
      };
    } else if (secondInningsRuns < firstInningsRuns) {
      const runDiff = firstInningsRuns - secondInningsRuns;
      return {
        winningTeamId: firstBattingTeamId,
        isTie: false,
        isAbandoned: false,
        resultText: `${firstBattingTeamName} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`
      };
    } else {
      return {
        winningTeamId: null,
        isTie: true,
        isAbandoned: false,
        resultText: 'Match Tied!'
      };
    }
  }

  /**
   * Calculate fall of wickets from ball-by-ball events
   */
  calculateFallOfWickets(ballEvents) {
    const fallOfWickets = [];
    let runningScore = 0;
    let wicketCount = 0;

    for (const ball of ballEvents) {
      runningScore += (ball.runs || 0) + (ball.isWide ? 1 : 0) + (ball.isNoBall ? 1 : 0);
      if (ball.isWicket) {
        wicketCount++;
        fallOfWickets.push({
          wicket: wicketCount,
          score: runningScore,
          batsman: ball.batsman,
          over: `${ball.over}.${ball.ball + 1}`
        });
      }
    }
    return fallOfWickets;
  }

  /**
   * Calculate partnerships from batting stats and ball events
   */
  calculatePartnerships(battingStats, ballEvents, currentBatsmen = []) {
    const partnerships = [];
    const wicketEvents = ballEvents
      .map((ball, idx) => ({ ...ball, index: idx }))
      .filter(ball => ball.isWicket);

    const batsmenWhoBatted = battingStats.filter(s => s.balls > 0 || s.isOut);

    if (batsmenWhoBatted.length >= 2) {
      let batsman1Idx = 0;
      let batsman2Idx = 1;
      let partnershipRuns = 0;
      let partnershipBalls = 0;

      const firstWicketIdx = wicketEvents.length > 0 ? wicketEvents[0].index : ballEvents.length;
      for (let i = 0; i < firstWicketIdx; i++) {
        const ball = ballEvents[i];
        if (!ball.isWide && !ball.isNoBall) {
          partnershipBalls++;
        }
        partnershipRuns += ball.runs;
      }

      partnerships.push({
        wicket: 1,
        batsmen: `${batsmenWhoBatted[0].playerName.split(' ')[0]} & ${batsmenWhoBatted[1].playerName.split(' ')[0]}`,
        runs: partnershipRuns,
        balls: partnershipBalls
      });

      let nextBatsmanIdx = 2;
      for (let w = 0; w < wicketEvents.length; w++) {
        const wicketEvent = wicketEvents[w];
        const nextWicketIdx = w + 1 < wicketEvents.length ? wicketEvents[w + 1].index : ballEvents.length;

        const outBatsmanName = wicketEvent.batsman;
        const outBatsmanIdx = batsmenWhoBatted.findIndex(b => b.playerName === outBatsmanName);
        const remainingBatsmanIdx = outBatsmanIdx === batsman1Idx ? batsman2Idx : batsman1Idx;

        if (nextBatsmanIdx < batsmenWhoBatted.length) {
          const newBatsmanIdx = nextBatsmanIdx;
          partnershipRuns = 0;
          partnershipBalls = 0;

          for (let i = wicketEvent.index + 1; i < nextWicketIdx; i++) {
            const ball = ballEvents[i];
            if (!ball.isWide && !ball.isNoBall) {
              partnershipBalls++;
            }
            partnershipRuns += ball.runs;
          }

          const remainingBatsman = batsmenWhoBatted[remainingBatsmanIdx];
          const newBatsman = batsmenWhoBatted[newBatsmanIdx];

          if (remainingBatsman && newBatsman) {
            partnerships.push({
              wicket: w + 2,
              batsmen: `${remainingBatsman.playerName.split(' ')[0]} & ${newBatsman.playerName.split(' ')[0]}`,
              runs: partnershipRuns,
              balls: partnershipBalls
            });
          }

          batsman1Idx = remainingBatsmanIdx;
          batsman2Idx = newBatsmanIdx;
          nextBatsmanIdx++;
        }
      }

      if (currentBatsmen.length === 2 && wicketEvents.length < batsmenWhoBatted.length - 2) {
        const currentBatsman1 = battingStats.find(s => s.playerId === currentBatsmen[0]);
        const currentBatsman2 = battingStats.find(s => s.playerId === currentBatsmen[1]);

        if (currentBatsman1 && currentBatsman2) {
          const lastWicketIdx = wicketEvents.length > 0 ? wicketEvents[wicketEvents.length - 1].index : -1;
          partnershipRuns = 0;
          partnershipBalls = 0;

          for (let i = lastWicketIdx + 1; i < ballEvents.length; i++) {
            const ball = ballEvents[i];
            if (!ball.isWide && !ball.isNoBall) {
              partnershipBalls++;
            }
            partnershipRuns += ball.runs;
          }

          partnerships.push({
            wicket: wicketEvents.length + 1,
            batsmen: `${currentBatsman1.playerName.split(' ')[0]} & ${currentBatsman2.playerName.split(' ')[0]}*`,
            runs: partnershipRuns,
            balls: partnershipBalls
          });
        }
      }
    }

    return partnerships;
  }

  /**
   * Group ball events into structured over summaries
   */
  calculateOverSummaries(ballEvents) {
    const oversMap = new Map();
    ballEvents.forEach(ball => {
      if (!oversMap.has(ball.over)) {
        oversMap.set(ball.over, []);
      }
      oversMap.get(ball.over).push(ball);
    });

    const summaries = [];
    const sortedOvers = Array.from(oversMap.keys()).sort((a, b) => a - b);

    for (const overNum of sortedOvers) {
      const balls = oversMap.get(overNum);
      const overRuns = balls.reduce((sum, b) => sum + (b.runs || 0) + (b.isWide ? 1 : 0) + (b.isNoBall ? 1 : 0), 0);
      const legalBalls = balls.filter(b => !b.isWide && !b.isNoBall && !b.isRetiredHurt).length;
      const wickets = balls.filter(b => b.isWicket).length;
      const bowler = balls[0]?.bowler || '';

      const ballTokens = balls.map(b => {
        let text = b.runs?.toString() || '0';
        if (b.isRetiredHurt) text = 'RO';
        else if (b.isWicket) text = b.runs > 0 ? `W+${b.runs}` : 'W';
        else if (b.isNoBall) text = b.runs > 0 ? `NB+${b.runs}` : 'NB';
        else if (b.isWide) text = 'WD';

        return {
          text,
          runs: b.runs || 0,
          isWicket: !!b.isWicket,
          isWide: !!b.isWide,
          isNoBall: !!b.isNoBall,
          isRetiredHurt: !!b.isRetiredHurt
        };
      });

      summaries.push({
        over: overNum,
        overDisplay: overNum + 1,
        bowler,
        runs: overRuns,
        legalBalls,
        wickets,
        balls: ballTokens
      });
    }

    return summaries;
  }

  /**
   * Build current innings object for display
   */
  buildCurrentInnings(state, battingTeamId, bowlingTeamId, maxOvers = 20) {
    const totalOvers = state.currentOver + state.currentBall / 6;
    const currentRunRate = totalOvers > 0 ? (state.currentRuns / totalOvers).toFixed(2) : '0.00';

    // Enrich bowlingStats with accurate economy rates
    const enrichedBowlingStats = (state.bowlersStats || []).map(stat => {
      const bowlerTotalBalls = (stat.overs || 0) * 6 + (stat.balls || 0);
      const economy = bowlerTotalBalls > 0 ? Number(((stat.runs / bowlerTotalBalls) * 6).toFixed(2)) : 0;
      return {
        ...stat,
        economy
      };
    });

    const currentBatsmen = [
      state.batsmenStats[state.strikerIdx]?.playerId || '',
      state.batsmenStats[state.nonStrikerIdx]?.playerId || '',
    ];

    const fallOfWickets = this.calculateFallOfWickets(state.ballEvents || []);
    const partnerships = this.calculatePartnerships(state.batsmenStats || [], state.ballEvents || [], currentBatsmen);
    const overSummaries = this.calculateOverSummaries(state.ballEvents || []);

    return {
      battingTeamId,
      bowlingTeamId,
      totalRuns: state.currentRuns,
      totalWickets: state.currentWickets,
      totalOvers: state.currentOver,
      totalBalls: state.currentOver >= maxOvers ? 0 : state.currentBall,
      currentRunRate,
      extras: state.extras,
      extrasBreakdown: state.extrasBreakdown,
      battingStats: state.batsmenStats,
      bowlingStats: enrichedBowlingStats,
      ballByBall: state.ballEvents,
      currentBatsmen,
      currentBowler: state.bowlersStats[state.currentBowlerIdx]?.playerId || '',
      fallOfWickets,
      partnerships,
      overSummaries
    };
  }

  /**
   * Build complete match object
   */
  buildMatch(baseMatch, state, battingTeamId, bowlingTeamId, status = 'live', result) {
    let innings;
    const maxOvers = baseMatch?.maxOvers || state.maxOvers || 20;

    if (state.phase === 'toss' || !state.firstInningsBattingTeamId) {
      innings = (state.completedInnings || []).map(inn => {
        // Fix overs display: if innings completed all overs, set totalBalls to 0
        const fixedTotalBalls = (inn.totalOvers || 0) >= maxOvers ? 0 : (inn.totalBalls || 0);
        const innOvers = (inn.totalOvers || 0) + fixedTotalBalls / 6;
        return {
          ...inn,
          totalBalls: fixedTotalBalls,
          currentRunRate: innOvers > 0 ? (inn.totalRuns / innOvers).toFixed(2) : '0.00',
          fallOfWickets: inn.fallOfWickets || this.calculateFallOfWickets(inn.ballByBall || []),
          partnerships: inn.partnerships || this.calculatePartnerships(inn.battingStats || [], inn.ballByBall || [], inn.currentBatsmen || []),
          overSummaries: inn.overSummaries || this.calculateOverSummaries(inn.ballByBall || []),
          bowlingStats: (inn.bowlingStats || []).map(stat => {
            const bBalls = (stat.overs || 0) * 6 + (stat.balls || 0);
            return {
              ...stat,
              economy: bBalls > 0 ? Number(((stat.runs / bBalls) * 6).toFixed(2)) : 0
            };
          })
        };
      });
    } else if (state.phase === 'inningsBreak') {
      const currentInnings = this.buildCurrentInnings(state, battingTeamId, bowlingTeamId, maxOvers);
      const completed = (state.completedInnings || []).map(inn => {
        // Fix overs display: if innings completed all overs, set totalBalls to 0
        const fixedTotalBalls = (inn.totalOvers || 0) >= maxOvers ? 0 : (inn.totalBalls || 0);
        const innOvers = (inn.totalOvers || 0) + fixedTotalBalls / 6;
        return {
          ...inn,
          totalBalls: fixedTotalBalls,
          currentRunRate: innOvers > 0 ? (inn.totalRuns / innOvers).toFixed(2) : '0.00',
          fallOfWickets: inn.fallOfWickets || this.calculateFallOfWickets(inn.ballByBall || []),
          partnerships: inn.partnerships || this.calculatePartnerships(inn.battingStats || [], inn.ballByBall || [], inn.currentBatsmen || []),
          overSummaries: inn.overSummaries || this.calculateOverSummaries(inn.ballByBall || []),
          bowlingStats: (inn.bowlingStats || []).map(stat => {
            const bBalls = (stat.overs || 0) * 6 + (stat.balls || 0);
            return {
              ...stat,
              economy: bBalls > 0 ? Number(((stat.runs / bBalls) * 6).toFixed(2)) : 0
            };
          })
        };
      });
      innings = completed.length > 0 ? completed : [currentInnings];
    } else if (state.phase === 'matchComplete') {
      const completed = (state.completedInnings || []).map(inn => {
        // Fix overs display: if innings completed all overs, set totalBalls to 0
        const fixedTotalBalls = (inn.totalOvers || 0) >= maxOvers ? 0 : (inn.totalBalls || 0);
        const innOvers = (inn.totalOvers || 0) + fixedTotalBalls / 6;
        const currentRunRate = innOvers > 0 ? (inn.totalRuns / innOvers).toFixed(2) : '0.00';
        const fallOfWickets = inn.fallOfWickets || this.calculateFallOfWickets(inn.ballByBall || []);
        const partnerships = inn.partnerships || this.calculatePartnerships(inn.battingStats || [], inn.ballByBall || [], inn.currentBatsmen || []);
        const overSummaries = inn.overSummaries || this.calculateOverSummaries(inn.ballByBall || []);
        const enrichedBowlingStats = (inn.bowlingStats || []).map(stat => {
          const bBalls = (stat.overs || 0) * 6 + (stat.balls || 0);
          return {
            ...stat,
            economy: bBalls > 0 ? Number(((stat.runs / bBalls) * 6).toFixed(2)) : 0
          };
        });

        return {
          ...inn,
          totalBalls: fixedTotalBalls,
          currentRunRate,
          fallOfWickets,
          partnerships,
          overSummaries,
          bowlingStats: enrichedBowlingStats
        };
      });
      if (completed.length === 0) {
        const currentInnings = this.buildCurrentInnings(state, battingTeamId, bowlingTeamId, maxOvers);
        innings = [currentInnings];
      } else {
        innings = completed;
      }
    } else {
      const currentInnings = this.buildCurrentInnings(state, battingTeamId, bowlingTeamId, maxOvers);
      const completed = (state.completedInnings || []).map(inn => {
        // Fix overs display: if innings completed all overs, set totalBalls to 0
        const fixedTotalBalls = (inn.totalOvers || 0) >= maxOvers ? 0 : (inn.totalBalls || 0);
        const innOvers = (inn.totalOvers || 0) + fixedTotalBalls / 6;
        return {
          ...inn,
          totalBalls: fixedTotalBalls,
          currentRunRate: innOvers > 0 ? (inn.totalRuns / innOvers).toFixed(2) : '0.00',
          fallOfWickets: inn.fallOfWickets || this.calculateFallOfWickets(inn.ballByBall || []),
          partnerships: inn.partnerships || this.calculatePartnerships(inn.battingStats || [], inn.ballByBall || [], inn.currentBatsmen || []),
          overSummaries: inn.overSummaries || this.calculateOverSummaries(inn.ballByBall || []),
          bowlingStats: (inn.bowlingStats || []).map(s => {
            const bBalls = (s.overs || 0) * 6 + (s.balls || 0);
            return {
              ...s,
              economy: bBalls > 0 ? Number(((s.runs / bBalls) * 6).toFixed(2)) : 0
            };
          })
        };
      });
      innings = [...completed, currentInnings];
    }

    // Target chasing metrics for 2nd innings
    let target = null;
    let remainingRuns = null;
    let remainingBalls = null;
    let requiredRunRate = null;

    if (state.isSuperOver) {
      if (state.currentInningsNum === 0) {
        // Super Over 1st innings: No target yet
        target = null;
        remainingRuns = null;
        remainingBalls = Math.max(0, 6 - (state.currentOver * 6 + state.currentBall));
      } else {
        // Super Over 2nd innings: Target is SO1 runs + 1
        const so1 = (state.completedInnings && state.completedInnings.length >= 3) ? state.completedInnings[2] : state.completedInnings[0];
        const so1Runs = so1 ? so1.totalRuns : 0;
        target = so1Runs + 1;
        remainingRuns = target - state.currentRuns;
        const consumedBalls = state.currentOver * 6 + state.currentBall;
        remainingBalls = Math.max(0, 6 - consumedBalls);
        const remainingOvers = remainingBalls / 6;
        if (remainingOvers > 0 && remainingRuns > 0) {
          requiredRunRate = (remainingRuns / remainingOvers).toFixed(2);
        } else if (remainingRuns <= 0) {
          requiredRunRate = '0.00';
        }
      }
    } else if (innings.length >= 2) {
      const firstInnings = innings[0];
      const secondInnings = innings[1];
      target = firstInnings.totalRuns + 1;
      remainingRuns = target - secondInnings.totalRuns;
      const consumedBalls = secondInnings.totalOvers * 6 + secondInnings.totalBalls;
      remainingBalls = Math.max(0, maxOvers * 6 - consumedBalls);
      const remainingOvers = remainingBalls / 6;
      if (remainingOvers > 0 && remainingRuns > 0) {
        requiredRunRate = (remainingRuns / remainingOvers).toFixed(2);
      } else if (remainingRuns <= 0) {
        requiredRunRate = '0.00';
      }
    }

    let winningTeamId = baseMatch?.winningTeamId || null;
    let finalResult = result !== undefined ? result : baseMatch?.result;

    if (status === 'completed' || state.phase === 'matchComplete' || status === 'abandoned') {
      const outcome = this.determineOutcome(state, baseMatch?.team1, baseMatch?.team2);
      if (!finalResult) finalResult = outcome.resultText;
      winningTeamId = outcome.winningTeamId;
    }

    return {
      ...baseMatch,
      status,
      result: finalResult,
      winningTeamId,
      innings,
      currentInnings: state.currentInningsNum + 1,
      target,
      remainingRuns,
      remainingBalls,
      requiredRunRate,
    };
  }


  // ── Private Helpers ──

  advanceBall(currentOver, currentBall, strikerIdx, nonStrikerIdx, maxOvers) {
    const newBall = currentBall + 1;

    if (newBall >= 6) {
      const newOver = currentOver + 1;
      const inningsEnded = newOver >= maxOvers;

      return {
        over: inningsEnded ? newOver : newOver,
        ball: inningsEnded ? 0 : 0,
        strikerIdx: nonStrikerIdx,
        nonStrikerIdx: strikerIdx,
        overEnded: true,
        inningsEnded,
      };
    }

    return {
      over: currentOver,
      ball: newBall,
      strikerIdx,
      nonStrikerIdx,
      overEnded: false,
      inningsEnded: false,
    };
  }

  getRunCommentary(runs, batsman, bowler) {
    if (runs === 0) return `No run. ${bowler} to ${batsman}`;
    if (runs === 4) return `FOUR! ${batsman} finds the boundary`;
    if (runs === 6) return `SIX! ${batsman} goes big!`;
    return `${runs} run${runs > 1 ? 's' : ''}. ${bowler} to ${batsman}`;
  }

  generateWicketCommentary(dismissalType, batsman, bowler, fielder, batsmanPosition, fielderNames, runsScored, runOutEnd) {
    const position = batsmanPosition === 'non-striker' ? 'non-striker' : 'striker';
    const endDisplay = runOutEnd === 'bowlers-end' ? "bowler's end" : runOutEnd === 'keepers-end' ? "keeper's end" : null;
    const fieldersDisplay = fielderNames && fielderNames.length > 0 ? fielderNames.join(' & ') : (fielder || '');

    switch (dismissalType) {
      case 'bowled':
        return `OUT! ${batsman} is bowled by ${bowler}! The stumps are shattered!`;
      case 'caught': {
        const isCaughtAndBowled = fieldersDisplay && bowler && fieldersDisplay.trim().toLowerCase() === bowler.trim().toLowerCase();
        if (isCaughtAndBowled) {
          return `OUT! ${batsman} is caught and bowled by ${bowler}! Great catch!`;
        }
        return `OUT! ${batsman} is caught by ${fieldersDisplay || 'a fielder'} off ${bowler}! Great catch!`;
      }
      case 'lbw':
        return `OUT! ${batsman} is lbw by ${bowler}! Plumb in front!`;
      case 'run-out': {
        const atEndText = endDisplay ? ` at the ${endDisplay}` : '';
        const byFielderText = fieldersDisplay ? ` by ${fieldersDisplay}` : '';
        const runsText = runsScored && runsScored > 0 ? ` (${runsScored} run${runsScored > 1 ? 's' : ''} completed before run out)` : '';
        return `OUT! ${batsman} (${position}) is run out${atEndText}${byFielderText}!${runsText}`;
      }
      case 'stumped':
        return `OUT! ${batsman} is stumped by ${fieldersDisplay || 'the keeper'} off ${bowler}! Quick hands!`;
      case 'hit-wicket':
        return `OUT! ${batsman} is out hit wicket off ${bowler}! Unlucky dismissal!`;
      case 'handled-the-ball':
        return `OUT! ${batsman} is out handled the ball! Rare dismissal!`;
      case 'obstructing-the-field':
        return `OUT! ${batsman} is out obstructing the field! Unusual dismissal!`;
      default:
        return `OUT! ${batsman} is out!`;
    }
  }

  /**
   * Handle a no-ball + run-out compound event.
   * The ball does NOT advance (no-ball). The bowler does NOT get a wicket (run-out).
   * The team's wicket count increments.
   */
  handleNoBallRunOut(state, batRuns, otherBatsmanIdx, fielderName, fielderNames, fielderId, fielderIds, runOutEnd) {
    const newState = { ...state };
    const events = [];
    const extraRunsCounted = !!state.extraRunsCounted;

    // 1. No-ball penalty + bat runs
    const basePenalty = extraRunsCounted ? 1 : 0;
    const totalRunsAdded = basePenalty + batRuns;

    const updatedBowlers = [...state.bowlersStats];
    const bowler = { ...updatedBowlers[state.currentBowlerIdx] };
    bowler.noBalls += 1;
    bowler.runs += totalRunsAdded; // charged to bowler
    // bowler.wickets NOT incremented (run-out)
    updatedBowlers[state.currentBowlerIdx] = bowler;

    const extrasBreakdown = state.extrasBreakdown || { byes: 0, legByes: 0, wides: 0, noBalls: 0 };
    newState.extrasBreakdown = { ...extrasBreakdown, noBalls: extrasBreakdown.noBalls + 1 };
    newState.extras = (state.extras || 0) + basePenalty;

    // 2. Apply bat runs to striker (credit runs, but only count ball for them below)
    const updatedBatsmen = [...state.batsmenStats];
    const striker = { ...updatedBatsmen[state.strikerIdx] };
    striker.runs += batRuns;
    if (batRuns === 4) striker.fours += 1;
    if (batRuns === 6) striker.sixes += 1;
    // Don't add balls to striker here — handled in step 3 based on who is out

    // 3. Apply run-out to the dismissed batsman
    const outBatsmanIdx = otherBatsmanIdx !== undefined ? otherBatsmanIdx : state.strikerIdx;
    const outBatsman = { ...updatedBatsmen[outBatsmanIdx] };
    outBatsman.isOut = true;
    outBatsman.balls += 1; // dismissed batsman always gets a ball
    outBatsman.dismissalType = 'run-out';

    // If non-striker is run out, striker still faced the ball (if they scored)
    if (outBatsmanIdx !== state.strikerIdx && batRuns > 0) {
      striker.balls += 1;
    }
    striker.strikeRate = striker.balls > 0 ? (striker.runs / striker.balls) * 100 : 0;
    updatedBatsmen[state.strikerIdx] = striker;

    // Build dismissal text
    let dismissalText = '';
    if (fielderNames && fielderNames.length > 0) {
      const fieldersText = fielderNames.join(' & ');
      dismissalText = `run out (${fieldersText})`;
      outBatsman.fielder = fieldersText;
      outBatsman.fielderIds = fielderIds;
      outBatsman.fielderId = fielderId;
    } else if (fielderName) {
      dismissalText = `run out (${fielderName})`;
      outBatsman.fielder = fielderName;
      outBatsman.fielderId = fielderId;
    } else {
      dismissalText = 'run out';
    }
    outBatsman.dismissal = dismissalText;
    outBatsman.strikeRate = outBatsman.balls > 0 ? (outBatsman.runs / outBatsman.balls) * 100 : 0;
    updatedBatsmen[outBatsmanIdx] = outBatsman;

    newState.currentRuns = state.currentRuns + totalRunsAdded;
    newState.currentWickets = state.currentWickets + 1;
    newState.batsmenStats = updatedBatsmen;
    newState.bowlersStats = updatedBowlers;

    // 4. Compose ball event (compound: isNoBall + isWicket)
    const fieldersDisplay = fielderNames && fielderNames.length > 0 ? fielderNames.join(' & ') : (fielderName || '');
    const endDisplay = runOutEnd === 'bowlers-end' ? "bowler's end" : runOutEnd === 'keepers-end' ? "keeper's end" : null;
    const position = outBatsmanIdx === state.nonStrikerIdx ? 'non-striker' : 'striker';
    const atEndText = endDisplay ? ` at the ${endDisplay}` : '';
    const byFielderText = fieldersDisplay ? ` by ${fieldersDisplay}` : '';
    const runsText = batRuns > 0 ? ` (${batRuns} run${batRuns > 1 ? 's' : ''} completed)` : '';

    const commentary = `No ball! OUT! ${outBatsman.playerName} (${position}) is run out${atEndText}${byFielderText}!${runsText}`;

    const ballEvent = {
      over: state.currentOver,
      ball: state.currentBall,
      ballLabel: this._computeBallLabel(state.ballEvents, state.currentOver),
      runs: totalRunsAdded,
      isWicket: true,
      isWide: false,
      isNoBall: true,
      dismissalType: 'run-out',
      batsman: outBatsman.playerName,
      batsmanId: outBatsman.playerId,
      bowler: bowler.playerName,
      bowlerId: bowler.playerId,
      commentary,
      strikerIdx: state.strikerIdx,
      nonStrikerIdx: state.nonStrikerIdx,
      strikerId: state.batsmenStats[state.strikerIdx]?.playerId,
      nonStrikerId: state.batsmenStats[state.nonStrikerIdx]?.playerId,
      outBatsmanId: outBatsman.playerId,
      fielderId: fielderId || null,
      fielderIds: fielderIds || (fielderId ? [fielderId] : []),
      runOutEnd: runOutEnd || null,
    };

    newState.ballEvents = [...state.ballEvents, ballEvent];
    events.push({ type: 'noBallRunOut', description: commentary });

    // 5. Check 2nd innings target
    if (state.currentInningsNum === 1 && state.completedInnings.length > 0) {
      const target = state.completedInnings[0].totalRuns + 1;
      if (newState.currentRuns >= target) {
        return this.endMatch(newState, events);
      }
    }

    // 6. Ball does NOT advance (no-ball) — but handle wicket state
    const newWickets = newState.currentWickets;
    const allOut = newWickets >= state.teamSize - 1;

    if (allOut) {
      return this.endInnings(newState, events);
    }

    const remainingActiveBatsmen = updatedBatsmen.filter(
      (b, idx) => !b.isOut && !b.isRetiredHurt && idx !== newState.nonStrikerIdx
    );
    const retiredBatsmen = updatedBatsmen.filter(b => b.isRetiredHurt);

    if (remainingActiveBatsmen.length === 0 && retiredBatsmen.length > 0) {
      newState.pendingOverEnd = false;
      newState.phase = 'retiredHurtConfirm';
      return { state: newState, events };
    }

    const remainingBatsmen = updatedBatsmen.filter(
      (b, idx) => !b.isOut && idx !== newState.nonStrikerIdx
    );
    if (remainingBatsmen.length === 0) {
      return this.endInnings(newState, events);
    }

    newState.pendingOverEnd = false;
    newState.phase = 'selectNextBatsman';
    return { state: newState, events };
  }

  /**
   * Compute the ball label for a delivery in the current over.
   * Legal deliveries: 1, 2, 3, 4, 5, 6
   * Extras (wide/no-ball/retiredHurt) share the label of the NEXT legal delivery slot.
   * e.g. Wide before ball 3 → label "Over.3"; the actual ball 3 also gets "Over.3".
   */
  _computeBallLabel(ballEvents, currentOver) {
    const legalSoFar = (ballEvents || []).filter(
      e => e.over === currentOver && !e.isWide && !e.isNoBall && !e.isRetiredHurt
    ).length;
    return `${currentOver}.${legalSoFar + 1}`;
  }
}

export const scoringEngine = new ScoringEngine();
