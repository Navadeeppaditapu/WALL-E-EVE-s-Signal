/**
 * WALL-E Autonomous Agent Implementation.
 * Encapsulates the Perception-Planning-Action cognitive architecture:
 * 1. Perceive: Ingest realistic observation, maintain local memory.
 * 2. Update Beliefs: Online Bayesian probability update over EVE's location.
 * 3. Strategy & Evaluate: Evaluate candidate actions, compute information gain & safe return.
 * 4. Act & Record: Execute chosen action and record verifiable telemetry trace.
 */

import {
  ActionType,
  AgentObservation,
  FinalMissionReport,
  MissionConfig,
  Point,
  StrategyMode,
  TraceStep
} from './types.ts';
import { BeliefSystem } from './belief.ts';
import { AutonomousPlanner } from './planner.ts';
import { manhattanDistance, pointToString } from './pathfinding.ts';

export interface AgentDecisionResult {
  action: ActionType;
  explanation: string;
  strategyMode: StrategyMode;
  beliefEntropy: number;
  peakBelief: { x: number; y: number; probability: number };
  traceStep: TraceStep;
}

export class WallEAgent {
  public readonly config: MissionConfig;
  public readonly belief: BeliefSystem;
  private planner: AutonomousPlanner;

  // Agent internal memory (never accesses environment ground truth)
  private currentPosition: Point;
  private batteryRemaining: number;
  private timeRemaining: number;
  private visitedPath: Point[];
  private discoveredClues: string[];
  private currentStrategy: StrategyMode;
  private traceHistory: TraceStep[];
  private strategyTransitions: { step: number; mode: StrategyMode; reason: string }[];
  private totalEnergyConsumed: number;

  constructor(config: MissionConfig) {
    this.config = config;
    this.currentPosition = { ...config.basePosition };
    this.batteryRemaining = config.startingBattery;
    this.timeRemaining = config.timeLimit;
    this.visitedPath = [{ ...config.basePosition }];
    this.discoveredClues = [];
    this.currentStrategy = 'EXPLORING';
    this.traceHistory = [];
    this.strategyTransitions = [];
    this.totalEnergyConsumed = 0;

    this.belief = new BeliefSystem(
      config.width,
      config.height,
      config.obstacles,
      config.basePosition
    );

    this.planner = new AutonomousPlanner(config);
  }

  /**
   * Main cognitive decision cycle: Perception -> Belief Update -> Planning -> Action Selection
   */
  public async decideNextAction(
    observation: AgentObservation,
    options?: {
      enableGeminiAdvisor?: boolean;
    }
  ): Promise<AgentDecisionResult> {
    const step = observation.step;
    this.currentPosition = { ...observation.currentPosition };
    this.batteryRemaining = observation.batteryRemaining;
    this.timeRemaining = observation.timeRemaining;
    this.visitedPath.push({ ...this.currentPosition });

    // --- STEP 1: PERCEPTION & BELIEF UPDATES ---
    // Rule out inspected cells where EVE was not found
    const negativeCells: Point[] = [];
    for (const cell of observation.localCells) {
      if (!cell.hasEve) {
        negativeCells.push({ x: cell.x, y: cell.y });
      }
    }
    this.belief.updateNegativeObservation(negativeCells);

    // If EVE is detected here, collapse distribution
    if (observation.eveDetectedHere) {
      this.belief.updateDirectDetection(this.currentPosition);
    } else {
      // Update with noisy directional & distance sensor reading
      this.belief.updateWithSensorSignal(
        this.currentPosition,
        observation.signalReading,
        this.config.sensorNoise.distanceNoiseStdDev,
        this.config.sensorNoise.angleNoiseDegrees
      );
    }

    // If a clue was inspected/discovered in this step, incorporate its evidence
    if (observation.discoveredClue && observation.discoveredClue.discovered) {
      const clueId = observation.discoveredClue.id;
      if (!this.discoveredClues.includes(clueId)) {
        this.discoveredClues.push(clueId);
        this.belief.updateWithClue(observation.discoveredClue);
      }
    }

    // Update planner spatial knowledge
    this.planner.updateObservations(observation);

    // --- STEP 2: STRATEGY MODE ARBITRATION ---
    const newStrategy = this.planner.determineStrategyMode(observation, this.belief);
    if (newStrategy !== this.currentStrategy) {
      this.strategyTransitions.push({
        step,
        mode: newStrategy,
        reason: `Shifted from ${this.currentStrategy} to ${newStrategy} based on evidence & resource state`
      });
      this.currentStrategy = newStrategy;
    }

    const entropy = this.belief.calculateEntropy();
    const peakBelief = this.belief.getPeakBelief();

    // If mission already accomplished, stop
    if (observation.eveDetectedHere || this.currentStrategy === 'MISSION_ACCOMPLISHED') {
      const stopCandidate = {
        action: 'STOP' as ActionType,
        energyCost: 0,
        timeCost: 0,
        expectedInfoGain: 0,
        eveProximityUtility: 100,
        explorationBonus: 0,
        safetyPenalty: 0,
        isSafe: true,
        utility: 100,
        explanation: 'EVE has been located! Holding coordinates.'
      };
      const trace: TraceStep = {
        step,
        timestamp: new Date().toISOString(),
        position: { ...this.currentPosition },
        batteryRemaining: this.batteryRemaining,
        timeRemaining: this.timeRemaining,
        strategyMode: 'MISSION_ACCOMPLISHED',
        beliefEntropy: entropy,
        peakBelief,
        observationSummary: `Direct contact established with EVE at (${this.currentPosition.x}, ${this.currentPosition.y})`,
        candidateActions: [stopCandidate],
        chosenAction: 'STOP',
        explanation: 'Mission goal achieved: Target verified.'
      };
      this.traceHistory.push(trace);
      return {
        action: 'STOP',
        explanation: trace.explanation,
        strategyMode: 'MISSION_ACCOMPLISHED',
        beliefEntropy: entropy,
        peakBelief,
        traceStep: trace
      };
    }

    // --- STEP 3: PLANNER CANDIDATE ACTION EVALUATION ---
    const candidateActions = this.planner.evaluateCandidateActions(
      observation,
      this.belief,
      this.currentStrategy
    );

    let chosenCandidate = candidateActions[0] || {
      action: 'STOP' as ActionType,
      utility: 0,
      explanation: 'No viable action found'
    };

    let geminiAdvised = false;
    let geminiRecommendation: string | undefined;
    let geminiAccepted = false;

    // --- STEP 4: OPTIONAL GEMINI ADVISORY LAYER ---
    if (options?.enableGeminiAdvisor) {
      try {
        const payload = {
          step,
          position: this.currentPosition,
          batteryRemaining: this.batteryRemaining,
          timeRemaining: this.timeRemaining,
          batteryCapacity: this.config.batteryCapacity,
          strategyMode: this.currentStrategy,
          entropy,
          peakBelief,
          cluesDiscovered: this.discoveredClues,
          candidateActions: candidateActions.slice(0, 4),
          recentPath: this.visitedPath.slice(-5)
        };

        const res = await fetch('/api/gemini/reason', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.recommendation?.recommendedAction) {
            geminiAdvised = true;
            geminiRecommendation = `${data.recommendation.recommendedAction}: ${data.recommendation.strategicRationale}`;

            // STRICT VALIDATION: Action must be in legal candidate list and meet safety
            const matchedCandidate = candidateActions.find(
              c => c.action === data.recommendation.recommendedAction
            );

            if (matchedCandidate && matchedCandidate.isSafe) {
              chosenCandidate = matchedCandidate;
              geminiAccepted = true;
            }
          }
        }
      } catch (err) {
        // Fall back gracefully to local autonomous planner without failing
        console.warn('Gemini advisor unavailable; local planner active:', err);
      }
    }

    // Build observation text summary
    const obsSummary = `Pos: (${this.currentPosition.x}, ${this.currentPosition.y}) | Signal est: ${observation.signalReading.noisyDistance.toFixed(1)} cells @ ${observation.signalReading.noisyBearing.toFixed(0)}° | Battery: ${this.batteryRemaining} mAh`;

    // Construct verifiable trace step
    const traceStep: TraceStep = {
      step,
      timestamp: new Date().toISOString(),
      position: { ...this.currentPosition },
      batteryRemaining: this.batteryRemaining,
      timeRemaining: this.timeRemaining,
      strategyMode: this.currentStrategy,
      beliefEntropy: entropy,
      peakBelief,
      observationSummary: obsSummary,
      candidateActions,
      chosenAction: chosenCandidate.action,
      explanation: chosenCandidate.explanation,
      geminiAdvised,
      geminiRecommendation,
      geminiAccepted
    };

    this.traceHistory.push(traceStep);

    return {
      action: chosenCandidate.action,
      explanation: chosenCandidate.explanation,
      strategyMode: this.currentStrategy,
      beliefEntropy: entropy,
      peakBelief,
      traceStep
    };
  }

  public getTraceHistory(): TraceStep[] {
    return [...this.traceHistory];
  }

  public getVisitedPath(): Point[] {
    return [...this.visitedPath];
  }

  /**
   * Compiles the comprehensive Final Mission Report at mission conclusion.
   */
  public generateFinalReport(
    success: boolean,
    terminationReason: string,
    groundTruthTarget?: Point
  ): FinalMissionReport {
    const peak = this.belief.getPeakBelief();
    const uniqueVisited = new Set(this.visitedPath.map(pointToString));
    const totalCells = this.config.width * this.config.height - this.config.obstacles.length;
    const coverage = Math.min(100, (uniqueVisited.size / Math.max(1, totalCells)) * 100);

    const estimationError = groundTruthTarget
      ? manhattanDistance(peak, groundTruthTarget)
      : undefined;

    const recommendations: string[] = [];
    if (success) {
      recommendations.push('Mission succeeded: Target EVE confirmed. Recommend powering up beacon handshake.');
    } else if (this.batteryRemaining <= 0) {
      recommendations.push('Battery depletion occurred: Increase solar recharge weighting in exploration phase.');
    } else {
      recommendations.push('Time expired: Deploy higher sensor scan radius or prioritize clue investigation earlier.');
    }

    return {
      missionId: this.config.missionId,
      missionTitle: this.config.title,
      success,
      terminationReason,
      totalSteps: this.traceHistory.length,
      totalTimeElapsed: this.config.timeLimit - this.timeRemaining,
      totalBatteryConsumed: this.config.startingBattery - this.batteryRemaining,
      finalPosition: { ...this.currentPosition },
      eveFound: success,
      eveEstimatedLocation: { x: peak.x, y: peak.y },
      eveActualLocation: groundTruthTarget ? { ...groundTruthTarget } : undefined,
      estimationErrorCells: estimationError,
      beliefConfidence: peak.probability,
      cluesDiscoveredCount: this.discoveredClues.length,
      totalCluesCount: this.config.clues.length,
      cellsExploredCount: uniqueVisited.size,
      totalTraversableCells: totalCells,
      explorationCoveragePercent: Number(coverage.toFixed(1)),
      safeReturnMaintained: this.batteryRemaining > 0,
      strategyTransitions: [...this.strategyTransitions],
      recommendations
    };
  }
}
