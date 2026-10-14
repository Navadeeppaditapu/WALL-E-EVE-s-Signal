/**
 * Bayesian Belief System for WALL-E & EVE Autonomous Agent.
 * Maintains an explicit 2D probability distribution over possible EVE locations,
 * performs online likelihood updates from noisy range/bearing sensors, negative observations,
 * and discovered clues, and measures Shannon entropy (uncertainty).
 */

import { Point, Clue, NoisySensorReading } from './types.ts';
import { euclideanDistance } from './pathfinding.ts';

export class BeliefSystem {
  readonly width: number;
  readonly height: number;
  // 2D probability distribution P[y][x] that EVE is at (x, y)
  private grid: number[][];
  private obstacleSet: Set<string>;
  private basePoint: Point;

  constructor(
    width: number,
    height: number,
    obstacles: Point[],
    basePoint: Point
  ) {
    this.width = width;
    this.height = height;
    this.basePoint = basePoint;
    this.obstacleSet = new Set(obstacles.map(p => `${p.x},${p.y}`));

    // Initialize uniform prior over all non-obstacle, non-base cells
    this.grid = Array.from({ length: height }, () => Array(width).fill(0));
    this.initializePrior();
  }

  /**
   * Initializes a uniform prior over all candidate traversable cells
   */
  public initializePrior(): void {
    let candidateCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const key = `${x},${y}`;
        // EVE is not at the starting base and not inside solid obstacles
        if (!this.obstacleSet.has(key) && !(x === this.basePoint.x && y === this.basePoint.y)) {
          this.grid[y][x] = 1;
          candidateCount++;
        } else {
          this.grid[y][x] = 0;
        }
      }
    }

    if (candidateCount > 0) {
      const uniformP = 1.0 / candidateCount;
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[y][x] > 0) {
            this.grid[y][x] = uniformP;
          }
        }
      }
    }
  }

  /**
   * Get raw probability at (x, y)
   */
  public getProbability(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.grid[y][x];
  }

  /**
   * Returns a copy of the entire 2D probability matrix
   */
  public getGrid(): number[][] {
    return this.grid.map(row => [...row]);
  }

  /**
   * Negative Observation Update:
   * When WALL-E visits or directly scans a cell and confirms EVE is not there,
   * that cell's probability is zeroed out, and remaining probabilities re-normalized.
   */
  public updateNegativeObservation(cells: Point[]): void {
    let altered = false;
    for (const p of cells) {
      if (p.x >= 0 && p.x < this.width && p.y >= 0 && p.y < this.height) {
        if (this.grid[p.y][p.x] > 0) {
          this.grid[p.y][p.x] = 0;
          altered = true;
        }
      }
    }
    if (altered) {
      this.normalize();
    }
  }

  /**
   * Direct Sighting / Target Found Update:
   * EVE has been confirmed at target point.
   */
  public updateDirectDetection(target: Point): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = x === target.x && y === target.y ? 1.0 : 0.0;
      }
    }
  }

  /**
   * Sensor Signal Likelihood Update:
   * Incorporates noisy distance and bearing reading from position (px, py).
   */
  public updateWithSensorSignal(
    agentPos: Point,
    signal: NoisySensorReading,
    distStdDev: number = 2.0,
    angleStdDev: number = 30.0
  ): void {
    if (!signal.hasSignal) return;

    const twoDistVar = 2 * distStdDev * distStdDev;
    const twoAngleVar = 2 * angleStdDev * angleStdDev;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] <= 0) continue;

        // Euclidean distance from agent to candidate cell
        const trueDist = euclideanDistance(agentPos, { x, y });
        const distDiff = trueDist - signal.noisyDistance;
        const distLikelihood = Math.exp(-(distDiff * distDiff) / twoDistVar);

        // Bearing from agent to candidate cell in degrees [0, 360)
        const dx = x - agentPos.x;
        const dy = y - agentPos.y;
        let trueAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (trueAngle < 0) trueAngle += 360;

        // Angular difference taking wrapping into account
        let angleDiff = Math.abs(trueAngle - signal.noisyBearing);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        const angleLikelihood = Math.exp(-(angleDiff * angleDiff) / twoAngleVar);

        // Joint likelihood P(reading | EVE at x,y)
        const jointLikelihood = distLikelihood * (0.3 + 0.7 * angleLikelihood);

        this.grid[y][x] *= jointLikelihood;
      }
    }

    this.normalize();
  }

  /**
   * Discovered Clue Likelihood Update:
   * Modifies probabilities according to structured clues (e.g., directional hint, proximity bounds).
   */
  public updateWithClue(clue: Clue): void {
    if (!clue.hintData) return;

    const { bearingDegrees, maxDistance, minDistance, quadrant } = clue.hintData;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] <= 0) continue;

        let multiplier = 1.0;

        // Proximity constraint
        if (maxDistance !== undefined || minDistance !== undefined) {
          const dist = euclideanDistance({ x: clue.x, y: clue.y }, { x, y });
          if (maxDistance !== undefined && dist > maxDistance) {
            multiplier *= 0.15; // Unlikely to be beyond max distance
          } else if (minDistance !== undefined && dist < minDistance) {
            multiplier *= 0.25;
          } else {
            multiplier *= 1.8; // Strong positive indicator within band
          }
        }

        // Bearing constraint
        if (bearingDegrees !== undefined) {
          const dx = x - clue.x;
          const dy = y - clue.y;
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (angle < 0) angle += 360;

          let angleDiff = Math.abs(angle - bearingDegrees);
          if (angleDiff > 180) angleDiff = 360 - angleDiff;

          if (angleDiff < 45) {
            multiplier *= 2.2;
          } else if (angleDiff > 90) {
            multiplier *= 0.2;
          }
        }

        // Quadrant constraint
        if (quadrant) {
          const inNE = x >= clue.x && y <= clue.y;
          const inNW = x <= clue.x && y <= clue.y;
          const inSE = x >= clue.x && y >= clue.y;
          const inSW = x <= clue.x && y >= clue.y;

          const match =
            (quadrant === 'NE' && inNE) ||
            (quadrant === 'NW' && inNW) ||
            (quadrant === 'SE' && inSE) ||
            (quadrant === 'SW' && inSW);

          multiplier *= match ? 2.0 : 0.25;
        }

        this.grid[y][x] *= multiplier;
      }
    }

    this.normalize();
  }

  /**
   * Normalizes the distribution so that sum(grid[y][x]) === 1.0
   */
  private normalize(): void {
    let sum = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        sum += this.grid[y][x];
      }
    }

    if (sum > 0) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          this.grid[y][x] /= sum;
        }
      }
    } else {
      // Degenerate case fallback to uniform
      this.initializePrior();
    }
  }

  /**
   * Calculates Shannon Entropy H = - sum(p * log2(p)) in bits.
   * High entropy = high uncertainty; Low entropy = concentrated belief.
   */
  public calculateEntropy(): number {
    let entropy = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const p = this.grid[y][x];
        if (p > 1e-12) {
          entropy -= p * Math.log2(p);
        }
      }
    }
    return entropy;
  }

  /**
   * Finds the cell with the highest probability mass (peak belief).
   */
  public getPeakBelief(): { x: number; y: number; probability: number } {
    let bestX = 0;
    let bestY = 0;
    let maxP = -1;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] > maxP) {
          maxP = this.grid[y][x];
          bestX = x;
          bestY = y;
        }
      }
    }

    return { x: bestX, y: bestY, probability: Math.max(0, maxP) };
  }

  /**
   * Estimates Expected Information Gain (Entropy Reduction) of visiting/scanning point targetPoint.
   * Based on removing probability mass at target if EVE is not there.
   */
  public estimateInformationGain(targetPoint: Point, scanRadius: number = 1): number {
    const currentEntropy = this.calculateEntropy();
    let massInRadius = 0;

    for (let dy = -scanRadius; dy <= scanRadius; dy++) {
      for (let dx = -scanRadius; dx <= scanRadius; dx++) {
        const nx = targetPoint.x + dx;
        const ny = targetPoint.y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          massInRadius += this.grid[ny][nx];
        }
      }
    }

    // If EVE is not found in this radius, remaining mass is (1 - massInRadius)
    // Higher mass ruled out = greater information gained
    const expectedMassRemoved = Math.min(0.99, massInRadius);
    const estimatedNewEntropy = currentEntropy - (-expectedMassRemoved * Math.log2(expectedMassRemoved + 1e-6));

    return Math.max(0, currentEntropy - estimatedNewEntropy);
  }
}
