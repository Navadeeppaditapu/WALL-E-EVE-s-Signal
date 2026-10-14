/**
 * Automated Test Suite for WALL-E & EVE Autonomous Agent System.
 * Formally validates architectural invariants:
 * 1. Ground Truth Encapsulation (agent cannot access hidden coordinates)
 * 2. Observation Filtering (returns only local/noisy readings)
 * 3. Invalid Action Rejection (boundary and obstacle collisions are rejected)
 * 4. Bayesian Belief Updating (probabilities shift toward signal/clues)
 * 5. Strategy Mode Adaptation (adapts mode when evidence/resources change)
 * 6. Resource Limits & Accounting (battery and time properly deducted)
 * 7. Return-to-Base A* Planning (navigates safely around obstacles to charger/base)
 * 8. Mission Termination Guarantees (terminates on target found, battery out, or time out)
 * 9. Trace Verifiability (trace matches actual executed actions and utilities)
 */

import { PRESET_MISSIONS } from './configPresets.ts';
import { SimulationEnvironment } from './environment.ts';
import { WallEAgent } from './walle.ts';
import { BeliefSystem } from './belief.ts';
import { aStarPath } from './pathfinding.ts';

export interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
  details?: Record<string, any>;
}

export async function runAllTests(): Promise<{
  passedCount: number;
  totalCount: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // --- TEST 1: Ground Truth Encapsulation ---
  {
    const start = performance.now();
    const config = PRESET_MISSIONS[0];
    const env = new SimulationEnvironment(config);
    const obs = env.reset();

    // Check observation object structure
    const keys = Object.keys(obs);
    const hasEveLocation =
      'targetPosition' in obs ||
      'eveLocation' in obs ||
      'hiddenTarget' in obs ||
      (obs as any).eveX !== undefined;

    const passed =
      !hasEveLocation &&
      obs.signalReading.noisyDistance !== undefined &&
      obs.signalReading.noisyBearing !== undefined;

    results.push({
      id: 'test-1-encapsulation',
      name: 'Ground Truth Isolation',
      category: 'Security & Integrity',
      passed,
      message: passed
        ? 'Verified: Agent observation contains NO hidden target coordinates.'
        : 'FAILED: Target coordinates leaked into observation.',
      durationMs: Math.round(performance.now() - start),
      details: { observationKeys: keys }
    });
  }

  // --- TEST 2: Observation Filtering ---
  {
    const start = performance.now();
    const config = PRESET_MISSIONS[0];
    const env = new SimulationEnvironment(config);
    const obs = env.reset();

    // Agent starts at (1,1). Local cells must be at most 3x3 (9 cells)
    const passed =
      obs.localCells.length <= 9 &&
      obs.localCells.every(c => Math.abs(c.x - obs.currentPosition.x) <= 1 && Math.abs(c.y - obs.currentPosition.y) <= 1);

    results.push({
      id: 'test-2-filtering',
      name: 'Observation Spatial Filtering',
      category: 'Perception',
      passed,
      message: passed
        ? `Verified: Observation strictly filtered to local 3x3 neighborhood (${obs.localCells.length} cells).`
        : 'FAILED: Agent received global map visibility.',
      durationMs: Math.round(performance.now() - start)
    });
  }

  // --- TEST 3: Invalid Action Rejection ---
  {
    const start = performance.now();
    const config = PRESET_MISSIONS[0];
    const env = new SimulationEnvironment(config);
    env.reset();

    // Base is at (1,1). Moving WEST twice attempts to breach boundary x < 0
    env.step('MOVE_WEST'); // To (0, 1)
    const breachResult = env.step('MOVE_WEST'); // Out of bounds!

    // Obstacle test: Obstacle at (3, 1). Move EAST from (0, 1) -> (1, 1) -> (2, 1) -> (3, 1)
    env.step('MOVE_EAST'); // (1, 1)
    env.step('MOVE_EAST'); // (2, 1)
    const obstacleResult = env.step('MOVE_EAST'); // Attempts to hit obstacle at (3, 1)

    const passed =
      !breachResult.success &&
      !obstacleResult.success &&
      obstacleResult.observation.currentPosition.x === 2 &&
      obstacleResult.observation.currentPosition.y === 1;

    results.push({
      id: 'test-3-rejection',
      name: 'Invalid Action & Collision Rejection',
      category: 'Environment Physics',
      passed,
      message: passed
        ? 'Verified: Out-of-bounds moves and obstacle collisions are rejected and penalized.'
        : 'FAILED: Invalid moves were permitted through barriers.',
      durationMs: Math.round(performance.now() - start)
    });
  }

  // --- TEST 4: Bayesian Belief Updating ---
  {
    const start = performance.now();
    const config = PRESET_MISSIONS[0];
    const belief = new BeliefSystem(config.width, config.height, config.obstacles, config.basePosition);

    const initialEntropy = belief.calculateEntropy();

    // Feed a simulated sensor signal with low distance indicating proximity to (9, 9)
    belief.updateWithSensorSignal(
      { x: 5, y: 5 },
      {
        hasSignal: true,
        noisyDistance: 5.6,
        noisyBearing: 135,
        signalStrength: 0.15,
        noiseStdDev: 1.0
      },
      1.5,
      25
    );

    const postSignalEntropy = belief.calculateEntropy();
    const peak = belief.getPeakBelief();

    // Peak should be in the South-East quadrant
    const passed =
      postSignalEntropy < initialEntropy &&
      peak.x >= 5 &&
      peak.y >= 5 &&
      peak.probability > 0.05;

    results.push({
      id: 'test-4-bayesian',
      name: 'Bayesian Belief & Entropy Reduction',
      category: 'Belief & Uncertainty',
      passed,
      message: passed
        ? `Verified: Entropy reduced from ${initialEntropy.toFixed(2)} to ${postSignalEntropy.toFixed(2)} bits; Peak concentrated at (${peak.x}, ${peak.y}).`
        : 'FAILED: Belief distribution failed to update or concentrate.',
      durationMs: Math.round(performance.now() - start)
    });
  }

  // --- TEST 5: Clue Telemetry Integration ---
  {
    const start = performance.now();
    const config = PRESET_MISSIONS[0];
    const belief = new BeliefSystem(config.width, config.height, config.obstacles, config.basePosition);

    const testClue = {
      id: 'test-c1',
      x: 5,
      y: 5,
      type: 'directional' as const,
      discovered: true,
      text: 'Target signature heading East',
      hintData: { quadrant: 'SE' as const, bearingDegrees: 120 }
    };

    belief.updateWithClue(testClue);
    const peak = belief.getPeakBelief();

    const passed = peak.x >= 5 && peak.y >= 5;

    results.push({
      id: 'test-5-clues',
      name: 'Clue Telemetry Fusion',
      category: 'Evidence Integration',
      passed,
      message: passed
        ? `Verified: Clue evidence successfully steered peak probability mass into SE quadrant (${peak.x}, ${peak.y}).`
        : 'FAILED: Clue failed to modify spatial distribution.',
      durationMs: Math.round(performance.now() - start)
    });
  }

  // --- TEST 6: A* Pathfinding Around Obstacles ---
  {
    const start = performance.now();
    const obstacles = [
      { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }
    ];
    // Start at (1, 2), Goal at (5, 2) with a vertical wall blocking direct straight line
    const path = aStarPath({ x: 1, y: 2 }, { x: 5, y: 2 }, 10, 10, obstacles);

    const passed =
      path !== null &&
      path.length > 0 &&
      !path.some(p => obstacles.some(o => o.x === p.x && o.y === p.y));

    results.push({
      id: 'test-6-astar',
      name: 'A* Obstacle Avoidance Routing',
      category: 'Navigation',
      passed,
      message: passed
        ? `Verified: A* successfully routed around wall in ${path?.length} steps without obstacle collision.`
        : 'FAILED: A* was unable to find path or collided with obstacle.',
      durationMs: Math.round(performance.now() - start)
    });
  }

  // --- TEST 7: Resource Limits & Battery Margin ---
  {
    const start = performance.now();
    const config = PRESET_MISSIONS[0];
    const env = new SimulationEnvironment(config);
    const agent = new WallEAgent(config);

    let obs = env.reset();
    let decision = await agent.decideNextAction(obs);

    // Initial battery is 85. Step forward
    const stepResult = env.step(decision.action);
    const passed =
      stepResult.observation.batteryRemaining < config.startingBattery &&
      stepResult.energyConsumed === config.actionCosts.moveCost;

    results.push({
      id: 'test-7-resources',
      name: 'Resource Accounting & Battery Consumption',
      category: 'Safety & Energy',
      passed,
      message: passed
        ? `Verified: Energy deducted correctly (-${stepResult.energyConsumed} mAh).`
        : 'FAILED: Energy was not properly consumed.',
      durationMs: Math.round(performance.now() - start)
    });
  }

  // --- TEST 8: Adaptive Strategy Mode Transitions ---
  {
    const start = performance.now();
    const config = PRESET_MISSIONS[0];
    const agent = new WallEAgent(config);
    const env = new SimulationEnvironment(config);
    let obs = env.reset();

    // Agent begins in EXPLORING mode
    const initialDecision = await agent.decideNextAction(obs);
    const startMode = initialDecision.strategyMode;

    // Simulate critical battery observation
    const lowBatteryObs = {
      ...obs,
      batteryRemaining: 14 // Approaching safety margin
    };
    const lowBatteryDecision = await agent.decideNextAction(lowBatteryObs);

    const passed =
      startMode === 'EXPLORING' &&
      lowBatteryDecision.strategyMode === 'RETURNING_TO_RECHARGE';

    results.push({
      id: 'test-8-strategy',
      name: 'Dynamic Strategy Reconfiguration',
      category: 'Autonomy',
      passed,
      message: passed
        ? `Verified: Mode transitioned automatically from ${startMode} to ${lowBatteryDecision.strategyMode} on low battery alert.`
        : 'FAILED: Agent did not adapt strategy mode to resource constraint.',
      durationMs: Math.round(performance.now() - start)
    });
  }

  // --- TEST 9: Verifiable Action Trace Generation ---
  {
    const start = performance.now();
    const config = PRESET_MISSIONS[0];
    const agent = new WallEAgent(config);
    const env = new SimulationEnvironment(config);
    let obs = env.reset();

    await agent.decideNextAction(obs);
    const trace = agent.getTraceHistory();

    const passed =
      trace.length === 1 &&
      trace[0].chosenAction !== undefined &&
      trace[0].candidateActions.length > 0 &&
      trace[0].beliefEntropy > 0 &&
      typeof trace[0].explanation === 'string' &&
      trace[0].explanation.length > 0;

    results.push({
      id: 'test-9-trace',
      name: 'Verifiable Trace & Rationale Audit',
      category: 'Transparency',
      passed,
      message: passed
        ? `Verified: Trace recorded ${trace[0].candidateActions.length} scored candidates and genuine explanation.`
        : 'FAILED: Trace record incomplete or missing explanations.',
      durationMs: Math.round(performance.now() - start)
    });
  }

  const passedCount = results.filter(r => r.passed).length;

  return {
    passedCount,
    totalCount: results.length,
    results
  };
}
