/**
 * Simulation Environment for WALL-E & EVE's Signal.
 * Encapsulates hidden ground truth (EVE's true location, obstacles, undiscovered clues),
 * enforces physical constraints and resource consumption, and delivers strictly realistic,
 * noise-corrupted sensor observations to the agent.
 */

import {
  MissionConfig,
  Point,
  Clue,
  ChargingStation,
  AgentObservation,
  ActionType,
  VisibleCellObservation,
  NoisySensorReading
} from './types.ts';
import { SeededRandom } from './random.ts';
import { euclideanDistance, pointEquals } from './pathfinding.ts';

export class SimulationEnvironment {
  private config: MissionConfig;
  private rng: SeededRandom;

  // Ground-truth internal state (strictly private)
  private readonly eveLocation: Point;
  private currentAgentPos: Point;
  private batteryRemaining: number;
  private timeElapsed: number;
  private currentStep: number;
  private obstaclesSet: Set<string>;
  private chargingStationsMap: Map<string, ChargingStation>;
  private cluesMap: Map<string, Clue>;
  private isTerminated: boolean;
  private terminationReason: string;
  private eveFound: boolean;

  constructor(config: MissionConfig) {
    this.config = config;
    this.rng = new SeededRandom(config.seed);

    this.eveLocation = { ...config.targetPosition };
    this.currentAgentPos = { ...config.basePosition };
    this.batteryRemaining = config.startingBattery;
    this.timeElapsed = 0;
    this.currentStep = 0;
    this.isTerminated = false;
    this.terminationReason = '';
    this.eveFound = false;

    this.obstaclesSet = new Set(config.obstacles.map(p => `${p.x},${p.y}`));
    this.chargingStationsMap = new Map();
    for (const cs of config.chargingStations) {
      this.chargingStationsMap.set(`${cs.x},${cs.y}`, { ...cs });
    }

    this.cluesMap = new Map();
    for (const clue of config.clues) {
      this.cluesMap.set(`${clue.x},${clue.y}`, { ...clue, discovered: false });
    }
  }

  /**
   * Resets simulation environment to initial state
   */
  public reset(): AgentObservation {
    this.rng = new SeededRandom(this.config.seed);
    this.currentAgentPos = { ...this.config.basePosition };
    this.batteryRemaining = this.config.startingBattery;
    this.timeElapsed = 0;
    this.currentStep = 0;
    this.isTerminated = false;
    this.terminationReason = '';
    this.eveFound = false;

    for (const clue of this.cluesMap.values()) {
      clue.discovered = false;
    }

    return this.createObservation();
  }

  /**
   * Executes an action, consumes resources, updates state, and returns observation.
   */
  public step(action: ActionType): {
    observation: AgentObservation;
    success: boolean;
    terminated: boolean;
    reason: string;
    energyConsumed: number;
    timeConsumed: number;
  } {
    if (this.isTerminated) {
      return {
        observation: this.createObservation(),
        success: false,
        terminated: true,
        reason: this.terminationReason,
        energyConsumed: 0,
        timeConsumed: 0
      };
    }

    this.currentStep++;
    let success = true;
    let energyCost = 0;
    let timeCost = 0;
    let stepReason = 'Action executed successfully';

    switch (action) {
      case 'MOVE_NORTH':
        ({ success, energyCost, timeCost, stepReason } = this.executeMove(0, -1));
        break;
      case 'MOVE_SOUTH':
        ({ success, energyCost, timeCost, stepReason } = this.executeMove(0, 1));
        break;
      case 'MOVE_EAST':
        ({ success, energyCost, timeCost, stepReason } = this.executeMove(1, 0));
        break;
      case 'MOVE_WEST':
        ({ success, energyCost, timeCost, stepReason } = this.executeMove(-1, 0));
        break;

      case 'SCAN_DEEP': {
        energyCost = this.config.actionCosts.scanCost;
        timeCost = this.config.actionCosts.scanTime;
        if (this.batteryRemaining < energyCost) {
          success = false;
          stepReason = 'Insufficient battery for deep sensor sweep';
        } else {
          this.batteryRemaining -= energyCost;
          this.timeElapsed += timeCost;
          stepReason = 'Conducted 360-degree omni-frequency sensor scan';

          // Check if EVE is within deep scan radius
          const distToEve = euclideanDistance(this.currentAgentPos, this.eveLocation);
          if (distToEve <= this.config.sensorNoise.scanRadius) {
            this.eveFound = true;
            this.isTerminated = true;
            this.terminationReason = `EVE located directly via deep sensor scan at range ${distToEve.toFixed(1)} cells!`;
            stepReason = this.terminationReason;
          }
        }
        break;
      }

      case 'INVESTIGATE_CLUE': {
        energyCost = this.config.actionCosts.investigateCost;
        timeCost = this.config.actionCosts.investigateTime;
        const clueKey = `${this.currentAgentPos.x},${this.currentAgentPos.y}`;
        const clue = this.cluesMap.get(clueKey);

        if (!clue) {
          success = false;
          stepReason = 'No physical clue found at current coordinates';
        } else if (this.batteryRemaining < energyCost) {
          success = false;
          stepReason = 'Insufficient battery to analyze clue telemetry';
        } else {
          this.batteryRemaining -= energyCost;
          this.timeElapsed += timeCost;
          clue.discovered = true;
          stepReason = `Extracted telemetry from clue: "${clue.text}"`;
        }
        break;
      }

      case 'RECHARGE': {
        timeCost = this.config.actionCosts.rechargeCost;
        const currentKey = `${this.currentAgentPos.x},${this.currentAgentPos.y}`;
        const isBase = pointEquals(this.currentAgentPos, this.config.basePosition);
        const charger = this.chargingStationsMap.get(currentKey);

        if (!isBase && !charger) {
          success = false;
          energyCost = 1; // Wasted attempt penalty
          this.batteryRemaining = Math.max(0, this.batteryRemaining - 1);
          stepReason = 'Recharge failed: current position lacks solar array or base power coupling';
        } else {
          const rate = charger ? charger.chargeRate : 35;
          const restored = Math.min(this.config.batteryCapacity - this.batteryRemaining, rate);
          this.batteryRemaining += restored;
          this.timeElapsed += timeCost;
          stepReason = `Solar coupling active: restored +${restored} battery (current: ${this.batteryRemaining})`;
        }
        break;
      }

      case 'STOP': {
        this.isTerminated = true;
        this.terminationReason = 'Agent deliberately initiated mission shutdown';
        stepReason = this.terminationReason;
        break;
      }
    }

    // Check if agent landed on EVE
    if (pointEquals(this.currentAgentPos, this.eveLocation)) {
      this.eveFound = true;
      this.isTerminated = true;
      this.terminationReason = 'MISSION ACCOMPLISHED: WALL-E reached EVE!';
    }

    // Resource termination checks
    if (this.batteryRemaining <= 0 && !this.eveFound) {
      this.batteryRemaining = 0;
      this.isTerminated = true;
      this.terminationReason = 'MISSION FAILED: Battery exhausted. WALL-E stranded.';
    }

    if (this.timeElapsed >= this.config.timeLimit && !this.eveFound) {
      this.isTerminated = true;
      this.terminationReason = 'MISSION FAILED: Time limit expired.';
    }

    const obs = this.createObservation();

    return {
      observation: obs,
      success,
      terminated: this.isTerminated,
      reason: this.isTerminated ? this.terminationReason : stepReason,
      energyConsumed: energyCost,
      timeConsumed: timeCost
    };
  }

  private executeMove(dx: number, dy: number): {
    success: boolean;
    energyCost: number;
    timeCost: number;
    stepReason: string;
  } {
    const moveCost = this.config.actionCosts.moveCost;
    const moveTime = this.config.actionCosts.moveTime;

    if (this.batteryRemaining < moveCost) {
      return {
        success: false,
        energyCost: 0,
        timeCost: 0,
        stepReason: 'Insufficient battery for traversal'
      };
    }

    const nextX = this.currentAgentPos.x + dx;
    const nextY = this.currentAgentPos.y + dy;

    // Check bounds
    if (nextX < 0 || nextX >= this.config.width || nextY < 0 || nextY >= this.config.height) {
      // Collision with boundary
      this.batteryRemaining = Math.max(0, this.batteryRemaining - 1);
      return {
        success: false,
        energyCost: 1,
        timeCost: 1,
        stepReason: 'Movement blocked: boundary collision'
      };
    }

    // Check obstacle
    if (this.obstaclesSet.has(`${nextX},${nextY}`)) {
      this.batteryRemaining = Math.max(0, this.batteryRemaining - 1);
      return {
        success: false,
        energyCost: 1,
        timeCost: 1,
        stepReason: 'Movement blocked: scrap obstacle in path'
      };
    }

    // Valid movement
    this.currentAgentPos = { x: nextX, y: nextY };
    this.batteryRemaining -= moveCost;
    this.timeElapsed += moveTime;

    return {
      success: true,
      energyCost: moveCost,
      timeCost: moveTime,
      stepReason: `Moved to (${nextX}, ${nextY})`
    };
  }

  /**
   * Generates realistic, strictly noise-corrupted observation for the agent.
   * Ground truth is NEVER passed here.
   */
  private createObservation(): AgentObservation {
    const pos = { ...this.currentAgentPos };
    const currentKey = `${pos.x},${pos.y}`;
    const isAtBase = pointEquals(pos, this.config.basePosition);
    const charger = this.chargingStationsMap.get(currentKey);

    // Compute noisy signal reading to EVE
    const trueDist = euclideanDistance(pos, this.eveLocation);
    const distNoise = this.rng.nextGaussian(0, this.config.sensorNoise.distanceNoiseStdDev);
    const noisyDistance = Math.max(0.1, trueDist + distNoise);

    // True bearing in degrees [0, 360)
    const dx = this.eveLocation.x - pos.x;
    const dy = this.eveLocation.y - pos.y;
    let trueBearing = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (trueBearing < 0) trueBearing += 360;

    const angleNoise = this.rng.nextGaussian(0, this.config.sensorNoise.angleNoiseDegrees);
    let noisyBearing = (trueBearing + angleNoise) % 360;
    if (noisyBearing < 0) noisyBearing += 360;

    const signalStrength = 1.0 / (noisyDistance + 1.0);

    const signalReading: NoisySensorReading = {
      hasSignal: true,
      noisyDistance,
      noisyBearing,
      signalStrength,
      noiseStdDev: this.config.sensorNoise.distanceNoiseStdDev
    };

    // Build local 3x3 visibility grid
    const localCells: VisibleCellObservation[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
          const key = `${nx},${ny}`;
          const isObstacle = this.obstaclesSet.has(key);
          const hasClue = this.cluesMap.has(key);
          const hasEve = nx === this.eveLocation.x && ny === this.eveLocation.y;

          let type: VisibleCellObservation['type'] = 'empty';
          if (isObstacle) type = 'obstacle';
          else if (pointEquals({ x: nx, y: ny }, this.config.basePosition)) type = 'base';
          else if (this.chargingStationsMap.has(key)) type = 'charger';

          localCells.push({
            x: nx,
            y: ny,
            type,
            hasClue,
            hasEve,
            isTraversable: !isObstacle
          });
        }
      }
    }

    // Check for clue at current position
    const currentClue = this.cluesMap.get(currentKey);

    return {
      step: this.currentStep,
      currentTime: this.timeElapsed,
      currentPosition: pos,
      batteryRemaining: this.batteryRemaining,
      timeRemaining: Math.max(0, this.config.timeLimit - this.timeElapsed),
      isAtBase,
      isAtCharger: Boolean(charger),
      currentCharger: charger ? { ...charger } : undefined,
      signalReading,
      localCells,
      discoveredClue: currentClue ? { ...currentClue } : undefined,
      eveDetectedHere: this.eveFound || pointEquals(pos, this.eveLocation)
    };
  }

  /**
   * For post-mission evaluation and debugging reports only.
   * Agent code must NOT call this during active simulation.
   */
  public getGroundTruth(): {
    targetPosition: Point;
    obstacles: Point[];
    chargingStations: ChargingStation[];
    clues: Clue[];
    eveFound: boolean;
    terminationReason: string;
  } {
    return {
      targetPosition: { ...this.eveLocation },
      obstacles: Array.from(this.obstaclesSet).map(s => {
        const [x, y] = s.split(',').map(Number);
        return { x, y };
      }),
      chargingStations: Array.from(this.chargingStationsMap.values()),
      clues: Array.from(this.cluesMap.values()),
      eveFound: this.eveFound,
      terminationReason: this.terminationReason
    };
  }
}
