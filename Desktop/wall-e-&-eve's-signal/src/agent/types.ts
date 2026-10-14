/**
 * Type definitions for WALL-E & EVE Autonomous Agent System
 */

export interface Point {
  x: number;
  y: number;
}

export type CellType = 'empty' | 'obstacle' | 'base' | 'charger';

export interface Clue {
  id: string;
  x: number;
  y: number;
  type: 'directional' | 'proximity' | 'environmental' | 'beacon_echo';
  discovered: boolean;
  text: string;
  // Clue payload hints (available only upon agent inspection)
  hintData?: {
    bearingDegrees?: number; // Approximate compass angle to EVE (0 = East, 90 = South, etc.)
    maxDistance?: number;   // EVE is within N cells of this clue
    minDistance?: number;
    quadrant?: 'NE' | 'NW' | 'SE' | 'SW';
  };
}

export interface ChargingStation {
  id: string;
  x: number;
  y: number;
  chargeRate: number; // Battery restored per recharge action
  timeCost: number;   // Simulated time taken per recharge
}

export interface MissionConfig {
  missionId: string;
  title: string;
  description: string;
  seed: number;
  width: number;
  height: number;
  basePosition: Point;
  batteryCapacity: number;
  startingBattery: number;
  timeLimit: number; // Max simulated time units
  actionCosts: {
    moveCost: number;        // Energy used per step
    moveTime: number;        // Time elapsed per step
    scanCost: number;        // Energy used for deep sensor scan
    scanTime: number;        // Time elapsed for deep scan
    investigateCost: number; // Energy to inspect a clue
    investigateTime: number;
    rechargeCost: number;    // Time cost to recharge (battery is gained)
  };
  sensorNoise: {
    distanceNoiseStdDev: number; // Standard deviation of distance noise
    angleNoiseDegrees: number;   // Standard deviation of direction noise
    scanRadius: number;          // Radius in cells of deep scan
  };
  obstacles: Point[];
  chargingStations: ChargingStation[];
  clues: Clue[];
  // Ground truth target (never shared with agent)
  targetPosition: Point;
  // Safety configuration
  safetyMarginBattery: number; // Buffer energy to reserve for returning to base/charger
}

export type ActionType =
  | 'MOVE_NORTH'
  | 'MOVE_SOUTH'
  | 'MOVE_EAST'
  | 'MOVE_WEST'
  | 'SCAN_DEEP'
  | 'INVESTIGATE_CLUE'
  | 'RECHARGE'
  | 'STOP';

export interface ActionCandidate {
  action: ActionType;
  targetPoint?: Point;
  energyCost: number;
  timeCost: number;
  expectedInfoGain: number;   // Entropy reduction estimate
  eveProximityUtility: number;// Attraction to peak probability regions
  explorationBonus: number;   // Attraction to unvisited / under-explored areas
  safetyPenalty: number;      // Penalty if action risks stranding agent
  isSafe: boolean;            // Can agent still reach base/charger after this action?
  utility: number;            // Final composite score
  explanation: string;
}

export interface NoisySensorReading {
  hasSignal: boolean;
  noisyDistance: number;    // Distance reading with Gaussian noise
  noisyBearing: number;     // Bearing degrees (0=E, 90=S, 180=W, 270=N) with noise
  signalStrength: number;   // 1 / (distance + 1)
  noiseStdDev: number;
}

export interface VisibleCellObservation {
  x: number;
  y: number;
  type: CellType;
  hasClue: boolean;
  hasEve: boolean;          // True only if EVE is directly in line-of-sight / adjacent
  isTraversable: boolean;
}

export interface AgentObservation {
  step: number;
  currentTime: number;
  currentPosition: Point;
  batteryRemaining: number;
  timeRemaining: number;
  isAtBase: boolean;
  isAtCharger: boolean;
  currentCharger?: ChargingStation;
  signalReading: NoisySensorReading;
  localCells: VisibleCellObservation[]; // 3x3 local neighborhood or deep scanned cells
  discoveredClue?: Clue;                // Clue discovered at current location if any
  eveDetectedHere: boolean;             // Target successfully located
}

export type StrategyMode =
  | 'EXPLORING'             // High uncertainty, seeking clues/signals across map
  | 'INVESTIGATING_CLUE'    // Clue nearby, moving to extract higher resolution data
  | 'TARGETED_APPROACH'     // Probability mass concentrated, approaching peak belief
  | 'RETURNING_TO_RECHARGE' // Battery low, safely navigating to nearest charger
  | 'RETURNING_TO_BASE'     // Target found or budget critical, heading to base
  | 'MISSION_ACCOMPLISHED'  // EVE located!
  | 'EMERGENCY_STOP';       // Resources depleted or no safe actions

export interface TraceStep {
  step: number;
  timestamp: string;
  position: Point;
  batteryRemaining: number;
  timeRemaining: number;
  strategyMode: StrategyMode;
  beliefEntropy: number;
  peakBelief: { x: number; y: number; probability: number };
  observationSummary: string;
  candidateActions: ActionCandidate[];
  chosenAction: ActionType;
  explanation: string;
  geminiAdvised?: boolean;
  geminiRecommendation?: string;
  geminiAccepted?: boolean;
  resultingEvent?: string;
}

export interface FinalMissionReport {
  missionId: string;
  missionTitle: string;
  success: boolean;
  terminationReason: string;
  totalSteps: number;
  totalTimeElapsed: number;
  totalBatteryConsumed: number;
  finalPosition: Point;
  eveFound: boolean;
  eveEstimatedLocation: Point;
  eveActualLocation?: Point; // Revealed only if user enables ground-truth review
  estimationErrorCells?: number;
  beliefConfidence: number;
  cluesDiscoveredCount: number;
  totalCluesCount: number;
  cellsExploredCount: number;
  totalTraversableCells: number;
  explorationCoveragePercent: number;
  safeReturnMaintained: boolean;
  strategyTransitions: { step: number; mode: StrategyMode; reason: string }[];
  recommendations: string[];
}
