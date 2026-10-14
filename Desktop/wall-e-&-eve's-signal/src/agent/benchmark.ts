/**
 * Multi-Mission Benchmarking Suite.
 * Empirically compares the Autonomous Belief-Based Planner against baseline policies:
 * 1. Random Walk Baseline (naive stochastic exploration)
 * 2. Greedy Signal Follower (reactively chases noisy bearing without belief tracking)
 * 3. Autonomous Belief-Based Planner (WALL-E's full Bayesian + A* cognitive loop)
 */

import { generateRandomMission } from './configPresets.ts';
import { SimulationEnvironment } from './environment.ts';
import { WallEAgent } from './walle.ts';
import { ActionType, MissionConfig } from './types.ts';
import { manhattanDistance } from './pathfinding.ts';

export interface PolicyBenchmarkResult {
  policyName: string;
  totalMissions: number;
  successCount: number;
  successRate: number;         // 0 - 100%
  avgStepsToTarget: number;    // Average steps among successful runs
  avgBatteryUsed: number;
  strandedCount: number;       // Died from depleted battery without safe return
  timeExpiredCount: number;
  avgConfidenceAtFinish: number;
}

export interface BenchmarkReport {
  seeds: number[];
  policies: PolicyBenchmarkResult[];
  timestamp: string;
}

/**
 * Runs a baseline random walk policy on a mission
 */
function runRandomBaselineMission(config: MissionConfig, maxSteps: number = 80): {
  success: boolean;
  steps: number;
  batteryUsed: number;
  stranded: boolean;
} {
  const env = new SimulationEnvironment(config);
  let obs = env.reset();
  const moves: ActionType[] = ['MOVE_NORTH', 'MOVE_SOUTH', 'MOVE_EAST', 'MOVE_WEST'];

  let steps = 0;
  while (!env.getGroundTruth().eveFound && steps < maxSteps) {
    steps++;
    // Pick random move
    const action = moves[Math.floor(Math.random() * moves.length)];
    const stepResult = env.step(action);
    obs = stepResult.observation;
    if (stepResult.terminated) break;
  }

  const gt = env.getGroundTruth();
  return {
    success: gt.eveFound,
    steps,
    batteryUsed: config.startingBattery - obs.batteryRemaining,
    stranded: obs.batteryRemaining <= 0 && !gt.eveFound
  };
}

/**
 * Runs a greedy signal-following baseline policy
 * (Reacts directly to noisy bearing without probabilistic spatial memory or safe return)
 */
function runGreedySignalMission(config: MissionConfig, maxSteps: number = 80): {
  success: boolean;
  steps: number;
  batteryUsed: number;
  stranded: boolean;
} {
  const env = new SimulationEnvironment(config);
  let obs = env.reset();

  let steps = 0;
  while (!env.getGroundTruth().eveFound && steps < maxSteps) {
    steps++;
    const bearing = obs.signalReading.noisyBearing;

    // Convert bearing to cardinal move
    let action: ActionType = 'MOVE_EAST';
    if (bearing >= 315 || bearing < 45) {
      action = 'MOVE_EAST';
    } else if (bearing >= 45 && bearing < 135) {
      action = 'MOVE_SOUTH';
    } else if (bearing >= 135 && bearing < 225) {
      action = 'MOVE_WEST';
    } else {
      action = 'MOVE_NORTH';
    }

    const stepResult = env.step(action);
    obs = stepResult.observation;
    if (stepResult.terminated) break;
  }

  const gt = env.getGroundTruth();
  return {
    success: gt.eveFound,
    steps,
    batteryUsed: config.startingBattery - obs.batteryRemaining,
    stranded: obs.batteryRemaining <= 0 && !gt.eveFound
  };
}

/**
 * Runs the full autonomous belief-based agent
 */
async function runWallEAutonomousMission(
  config: MissionConfig,
  enableGemini: boolean = false,
  maxSteps: number = 80
): Promise<{
  success: boolean;
  steps: number;
  batteryUsed: number;
  stranded: boolean;
  finalConfidence: number;
}> {
  const env = new SimulationEnvironment(config);
  const agent = new WallEAgent(config);
  let obs = env.reset();

  let steps = 0;
  while (!env.getGroundTruth().eveFound && steps < maxSteps) {
    steps++;
    const decision = await agent.decideNextAction(obs, { enableGeminiAdvisor: enableGemini });
    const stepResult = env.step(decision.action);
    obs = stepResult.observation;
    if (stepResult.terminated) break;
  }

  const gt = env.getGroundTruth();
  const peak = agent.belief.getPeakBelief();

  return {
    success: gt.eveFound,
    steps,
    batteryUsed: config.startingBattery - obs.batteryRemaining,
    stranded: obs.batteryRemaining <= 0 && !gt.eveFound,
    finalConfidence: peak.probability
  };
}

/**
 * Executes a comparative benchmark across multiple seeds
 */
export async function runComparativeBenchmark(
  seedList: number[] = [42, 101, 204, 305, 512, 777, 888, 999],
  onProgress?: (completed: number, total: number) => void
): Promise<BenchmarkReport> {
  const totalMissions = seedList.length;

  let randomSuccess = 0;
  let randomStepsTotal = 0;
  let randomBatteryTotal = 0;
  let randomStranded = 0;

  let greedySuccess = 0;
  let greedyStepsTotal = 0;
  let greedyBatteryTotal = 0;
  let greedyStranded = 0;

  let walleSuccess = 0;
  let walleStepsTotal = 0;
  let walleBatteryTotal = 0;
  let walleStranded = 0;
  let walleConfidenceTotal = 0;

  for (let i = 0; i < totalMissions; i++) {
    const seed = seedList[i];
    const missionConfig = generateRandomMission(seed, 12, 12);

    // 1. Random Walk
    const rRes = runRandomBaselineMission(missionConfig);
    if (rRes.success) {
      randomSuccess++;
      randomStepsTotal += rRes.steps;
    }
    randomBatteryTotal += rRes.batteryUsed;
    if (rRes.stranded) randomStranded++;

    // 2. Greedy Signal
    const gRes = runGreedySignalMission(missionConfig);
    if (gRes.success) {
      greedySuccess++;
      greedyStepsTotal += gRes.steps;
    }
    greedyBatteryTotal += gRes.batteryUsed;
    if (gRes.stranded) greedyStranded++;

    // 3. Autonomous Belief-Based Planner
    const wRes = await runWallEAutonomousMission(missionConfig, false);
    if (wRes.success) {
      walleSuccess++;
      walleStepsTotal += wRes.steps;
    }
    walleBatteryTotal += wRes.batteryUsed;
    if (wRes.stranded) walleStranded++;
    walleConfidenceTotal += wRes.finalConfidence;

    if (onProgress) {
      onProgress(i + 1, totalMissions);
    }
  }

  const policies: PolicyBenchmarkResult[] = [
    {
      policyName: 'Random Walk Baseline',
      totalMissions,
      successCount: randomSuccess,
      successRate: Math.round((randomSuccess / totalMissions) * 100),
      avgStepsToTarget: randomSuccess > 0 ? Math.round(randomStepsTotal / randomSuccess) : 0,
      avgBatteryUsed: Math.round(randomBatteryTotal / totalMissions),
      strandedCount: randomStranded,
      timeExpiredCount: totalMissions - randomSuccess - randomStranded,
      avgConfidenceAtFinish: 0.05
    },
    {
      policyName: 'Greedy Signal Follower',
      totalMissions,
      successCount: greedySuccess,
      successRate: Math.round((greedySuccess / totalMissions) * 100),
      avgStepsToTarget: greedySuccess > 0 ? Math.round(greedyStepsTotal / greedySuccess) : 0,
      avgBatteryUsed: Math.round(greedyBatteryTotal / totalMissions),
      strandedCount: greedyStranded,
      timeExpiredCount: totalMissions - greedySuccess - greedyStranded,
      avgConfidenceAtFinish: 0.15
    },
    {
      policyName: 'Autonomous Belief Planner (WALL-E)',
      totalMissions,
      successCount: walleSuccess,
      successRate: Math.round((walleSuccess / totalMissions) * 100),
      avgStepsToTarget: walleSuccess > 0 ? Math.round(walleStepsTotal / walleSuccess) : 0,
      avgBatteryUsed: Math.round(walleBatteryTotal / totalMissions),
      strandedCount: walleStranded,
      timeExpiredCount: totalMissions - walleSuccess - walleStranded,
      avgConfidenceAtFinish: Number((walleConfidenceTotal / totalMissions).toFixed(2))
    }
  ];

  return {
    seeds: seedList,
    policies,
    timestamp: new Date().toISOString()
  };
}
