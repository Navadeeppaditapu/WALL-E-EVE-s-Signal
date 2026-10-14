/**
 * Uncertainty-Aware Utility Planner and Resource Safety System.
 * Balances expected information gain, target pursuit, energy conservation,
 * and safe-return guarantees using A* pathfinding.
 */

import {
  ActionType,
  ActionCandidate,
  AgentObservation,
  Point,
  StrategyMode,
  MissionConfig
} from './types.ts';
import { BeliefSystem } from './belief.ts';
import {
  aStarPath,
  findShortestPathToClosest,
  manhattanDistance,
  pointEquals,
  pointToString
} from './pathfinding.ts';

export class AutonomousPlanner {
  private config: MissionConfig;
  private knownObstacles: Set<string>;
  private knownChargers: Point[];
  private visitedPositions: Map<string, number>; // Position -> step last visited
  private recentMoves: Point[];

  constructor(config: MissionConfig) {
    this.config = config;
    this.knownObstacles = new Set();
    this.knownChargers = [
      { ...config.basePosition },
      ...config.chargingStations.map(c => ({ x: c.x, y: c.y }))
    ];
    this.visitedPositions = new Map();
    this.recentMoves = [];
  }

  /**
   * Updates planner's spatial map with cells observed in the current step
   */
  public updateObservations(obs: AgentObservation): void {
    const key = pointToString(obs.currentPosition);
    this.visitedPositions.set(key, obs.step);
    this.recentMoves.push({ ...obs.currentPosition });
    if (this.recentMoves.length > 8) {
      this.recentMoves.shift();
    }

    // Incorporate known obstacles and chargers from local vision
    for (const cell of obs.localCells) {
      const cellKey = `${cell.x},${cell.y}`;
      if (cell.type === 'obstacle') {
        this.knownObstacles.add(cellKey);
      } else if (cell.type === 'charger') {
        if (!this.knownChargers.some(c => c.x === cell.x && c.y === cell.y)) {
          this.knownChargers.push({ x: cell.x, y: cell.y });
        }
      }
    }
  }

  /**
   * Determines the optimal tactical strategy mode
   */
  public determineStrategyMode(
    obs: AgentObservation,
    belief: BeliefSystem
  ): StrategyMode {
    if (obs.eveDetectedHere) {
      return 'MISSION_ACCOMPLISHED';
    }

    const currentPos = obs.currentPosition;
    const peak = belief.getPeakBelief();
    const entropy = belief.calculateEntropy();

    // Check safe return requirement: distance to nearest charger or base
    const returnRoute = findShortestPathToClosest(
      currentPos,
      this.knownChargers,
      this.config.width,
      this.config.height,
      this.knownObstacles
    );

    const minReturnSteps = returnRoute ? returnRoute.distance : 999;
    const minReturnEnergy =
      minReturnSteps * this.config.actionCosts.moveCost + this.config.safetyMarginBattery;

    // Critical battery condition: must head to charger/base immediately
    if (obs.batteryRemaining <= minReturnEnergy + 2) {
      if (obs.isAtCharger || obs.isAtBase) {
        if (obs.batteryRemaining < this.config.batteryCapacity * 0.85) {
          return 'RETURNING_TO_RECHARGE';
        }
      } else {
        return 'RETURNING_TO_RECHARGE';
      }
    }

    // If standing on an uninspected clue, prioritize investigation
    if (obs.discoveredClue && !obs.discoveredClue.discovered) {
      return 'INVESTIGATING_CLUE';
    }

    // If peak belief has high probability mass concentrated (confidence > 0.25)
    if (peak.probability > 0.25 || entropy < 3.2) {
      return 'TARGETED_APPROACH';
    }

    return 'EXPLORING';
  }

  /**
   * Generates and evaluates all valid candidate actions with transparent utility scores.
   */
  public evaluateCandidateActions(
    obs: AgentObservation,
    belief: BeliefSystem,
    strategyMode: StrategyMode
  ): ActionCandidate[] {
    const candidates: ActionCandidate[] = [];
    const currentPos = obs.currentPosition;
    const peak = belief.getPeakBelief();

    // 1. Evaluate directional moves: North, South, East, West
    const directions: { action: ActionType; dx: number; dy: number; label: string }[] = [
      { action: 'MOVE_NORTH', dx: 0, dy: -1, label: 'North' },
      { action: 'MOVE_SOUTH', dx: 0, dy: 1, label: 'South' },
      { action: 'MOVE_EAST', dx: 1, dy: 0, label: 'East' },
      { action: 'MOVE_WEST', dx: -1, dy: 0, label: 'West' }
    ];

    for (const dir of directions) {
      const nextPos: Point = { x: currentPos.x + dir.dx, y: currentPos.y + dir.dy };

      // Check boundaries
      if (
        nextPos.x < 0 ||
        nextPos.x >= this.config.width ||
        nextPos.y < 0 ||
        nextPos.y >= this.config.height
      ) {
        continue;
      }

      // Check known obstacles
      const nextKey = pointToString(nextPos);
      if (this.knownObstacles.has(nextKey)) {
        continue;
      }

      const moveCost = this.config.actionCosts.moveCost;
      const moveTime = this.config.actionCosts.moveTime;

      // Calculate safe return from candidate next position
      const batteryAfterMove = obs.batteryRemaining - moveCost;
      const returnRoute = findShortestPathToClosest(
        nextPos,
        this.knownChargers,
        this.config.width,
        this.config.height,
        this.knownObstacles
      );

      const returnSteps = returnRoute ? returnRoute.distance : 999;
      const requiredReturnEnergy =
        returnSteps * this.config.actionCosts.moveCost + this.config.safetyMarginBattery;

      const isSafe = batteryAfterMove >= requiredReturnEnergy;
      let safetyPenalty = 0;
      if (!isSafe) {
        // Severe penalty for stranding
        safetyPenalty = 60 + (requiredReturnEnergy - batteryAfterMove) * 5;
      }

      // Information Gain utility: expected entropy reduction by visiting/viewing nextPos
      const infoGain = belief.estimateInformationGain(nextPos, 1);

      // Target Proximity utility: moving closer to the peak belief cell
      const currentDistToPeak = manhattanDistance(currentPos, peak);
      const nextDistToPeak = manhattanDistance(nextPos, peak);
      const eveProximityUtility = (currentDistToPeak - nextDistToPeak) * (peak.probability * 35);

      // Exploration bonus: penalize recently visited cells, reward unvisited
      const lastVisitedStep = this.visitedPositions.get(nextKey);
      let explorationBonus = 0;
      if (lastVisitedStep === undefined) {
        explorationBonus = 12; // High priority for virgin territory
      } else {
        const stepsAgo = obs.step - lastVisitedStep;
        if (stepsAgo <= 2) {
          explorationBonus = -25; // Anti-oscillation penalty
        } else if (stepsAgo <= 5) {
          explorationBonus = -12;
        } else {
          explorationBonus = -3;
        }
      }

      // Specific strategy biases
      let modeBonus = 0;
      if (strategyMode === 'RETURNING_TO_RECHARGE') {
        // Strongly reward moving towards the closest charger/base
        if (returnRoute && returnRoute.path.length > 1) {
          const nextStepInReturn = returnRoute.path[1];
          if (pointEquals(nextPos, nextStepInReturn)) {
            modeBonus = 45;
          }
        }
      } else if (strategyMode === 'TARGETED_APPROACH') {
        if (nextDistToPeak < currentDistToPeak) {
          modeBonus = 20;
        }
      }

      const utility =
        infoGain * 14 +
        eveProximityUtility +
        explorationBonus +
        modeBonus -
        safetyPenalty -
        moveCost * 0.5;

      const explanation = this.buildMoveExplanation(
        dir.label,
        nextPos,
        utility,
        isSafe,
        strategyMode,
        explorationBonus,
        infoGain
      );

      candidates.push({
        action: dir.action,
        targetPoint: nextPos,
        energyCost: moveCost,
        timeCost: moveTime,
        expectedInfoGain: infoGain,
        eveProximityUtility,
        explorationBonus,
        safetyPenalty,
        isSafe,
        utility,
        explanation
      });
    }

    // 2. Evaluate DEEP SCAN action
    if (obs.batteryRemaining >= this.config.actionCosts.scanCost) {
      const scanCost = this.config.actionCosts.scanCost;
      const scanTime = this.config.actionCosts.scanTime;
      const batteryAfterScan = obs.batteryRemaining - scanCost;

      const returnRoute = findShortestPathToClosest(
        currentPos,
        this.knownChargers,
        this.config.width,
        this.config.height,
        this.knownObstacles
      );
      const returnSteps = returnRoute ? returnRoute.distance : 999;
      const requiredReturnEnergy =
        returnSteps * this.config.actionCosts.moveCost + this.config.safetyMarginBattery;

      const isSafe = batteryAfterScan >= requiredReturnEnergy;
      const safetyPenalty = isSafe ? 0 : 50;

      // Deep scan clears out large radius around current position
      const scanInfoGain = belief.estimateInformationGain(
        currentPos,
        this.config.sensorNoise.scanRadius
      );

      let scanUtility = scanInfoGain * 22 - safetyPenalty - scanCost * 0.6;
      if (strategyMode === 'EXPLORING' && scanInfoGain > 0.4) {
        scanUtility += 15;
      }

      candidates.push({
        action: 'SCAN_DEEP',
        energyCost: scanCost,
        timeCost: scanTime,
        expectedInfoGain: scanInfoGain,
        eveProximityUtility: 0,
        explorationBonus: 0,
        safetyPenalty,
        isSafe,
        utility: scanUtility,
        explanation: `360-degree sensor sweep (Info Gain: ${scanInfoGain.toFixed(2)}, Cost: ${scanCost} mAh)`
      });
    }

    // 3. Evaluate CLUE INVESTIGATION action
    if (
      obs.discoveredClue &&
      !obs.discoveredClue.discovered &&
      obs.batteryRemaining >= this.config.actionCosts.investigateCost
    ) {
      const invCost = this.config.actionCosts.investigateCost;
      candidates.push({
        action: 'INVESTIGATE_CLUE',
        targetPoint: obs.currentPosition,
        energyCost: invCost,
        timeCost: this.config.actionCosts.investigateTime,
        expectedInfoGain: 1.5,
        eveProximityUtility: 10,
        explorationBonus: 20,
        safetyPenalty: 0,
        isSafe: true,
        utility: 48, // Very high utility to decode discovered clue
        explanation: `Extract high-value clue telemetry: "${obs.discoveredClue.text}"`
      });
    }

    // 4. Evaluate RECHARGE action (if at charger or base)
    if (obs.isAtCharger || obs.isAtBase) {
      const isDepleted = obs.batteryRemaining < this.config.batteryCapacity * 0.9;
      let rechargeUtility = 0;
      if (strategyMode === 'RETURNING_TO_RECHARGE') {
        rechargeUtility = 55;
      } else if (obs.batteryRemaining < this.config.batteryCapacity * 0.5) {
        rechargeUtility = 35;
      } else if (isDepleted) {
        rechargeUtility = 10;
      }

      candidates.push({
        action: 'RECHARGE',
        targetPoint: obs.currentPosition,
        energyCost: 0, // Restores battery
        timeCost: this.config.actionCosts.rechargeCost,
        expectedInfoGain: 0,
        eveProximityUtility: 0,
        explorationBonus: 0,
        safetyPenalty: 0,
        isSafe: true,
        utility: rechargeUtility,
        explanation: `Couple with solar array to restore battery reserves (+35 mAh)`
      });
    }

    // 5. Evaluate STOP action
    const allUnsafe = candidates.every(c => !c.isSafe);
    candidates.push({
      action: 'STOP',
      energyCost: 0,
      timeCost: 0,
      expectedInfoGain: 0,
      eveProximityUtility: 0,
      explorationBonus: 0,
      safetyPenalty: 0,
      isSafe: true,
      utility: allUnsafe ? 100 : -100, // Trigger stop only when completely stranded
      explanation: allUnsafe
        ? 'Emergency shutdown: No safe path remains without stranding'
        : 'Abort mission sequence'
    });

    // Sort descending by utility
    candidates.sort((a, b) => b.utility - a.utility);

    return candidates;
  }

  private buildMoveExplanation(
    dirName: string,
    pos: Point,
    utility: number,
    isSafe: boolean,
    mode: StrategyMode,
    explorationBonus: number,
    infoGain: number
  ): string {
    if (!isSafe) {
      return `Move ${dirName} to (${pos.x},${pos.y}) violates safe-return battery reservation`;
    }
    if (mode === 'RETURNING_TO_RECHARGE') {
      return `Navigate ${dirName} toward charging facility (Safe return route)`;
    }
    if (explorationBonus > 5) {
      return `Explore unvisited territory ${dirName} to (${pos.x},${pos.y}) (Info gain: ${infoGain.toFixed(2)})`;
    }
    if (explorationBonus < -10) {
      return `Retrace ${dirName} to (${pos.x},${pos.y}) [Penalized for recent visit]`;
    }
    return `Advance ${dirName} to (${pos.x},${pos.y}) (Utility: ${utility.toFixed(1)})`;
  }
}
