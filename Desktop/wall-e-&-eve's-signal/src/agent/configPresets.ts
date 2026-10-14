/**
 * Mission Configuration Presets, Random Map Generator, and JSON Schema Validator.
 */

import { MissionConfig, Point, Clue, ChargingStation } from './types.ts';
import { SeededRandom } from './random.ts';

export const PRESET_MISSIONS: MissionConfig[] = [
  {
    missionId: 'sector-7-scrapyard',
    title: 'Scrapyard Sector 7',
    description: 'Balanced wasteland zone littered with compacted metal cubes. Two solar arrays and faint EVE signal pulses.',
    seed: 42,
    width: 12,
    height: 12,
    basePosition: { x: 1, y: 1 },
    batteryCapacity: 100,
    startingBattery: 85,
    timeLimit: 120,
    actionCosts: {
      moveCost: 2,
      moveTime: 1,
      scanCost: 5,
      scanTime: 2,
      investigateCost: 3,
      investigateTime: 2,
      rechargeCost: 3
    },
    sensorNoise: {
      distanceNoiseStdDev: 1.5,
      angleNoiseDegrees: 25,
      scanRadius: 2
    },
    obstacles: [
      { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 },
      { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 7, y: 6 },
      { x: 2, y: 8 }, { x: 2, y: 9 }, { x: 3, y: 9 },
      { x: 8, y: 2 }, { x: 9, y: 2 }, { x: 9, y: 3 }
    ],
    chargingStations: [
      { id: 'cs-1', x: 2, y: 5, chargeRate: 35, timeCost: 3 },
      { id: 'cs-2', x: 9, y: 8, chargeRate: 40, timeCost: 3 }
    ],
    clues: [
      {
        id: 'clue-1',
        x: 4,
        y: 4,
        type: 'directional',
        discovered: false,
        text: 'Plasma engine scorch mark indicates EVE accelerated toward South-East sector.',
        hintData: { bearingDegrees: 135, quadrant: 'SE' }
      },
      {
        id: 'clue-2',
        x: 8,
        y: 5,
        type: 'proximity',
        discovered: false,
        text: 'Residual probe ionization field detected. Target is within 5 cells.',
        hintData: { maxDistance: 5 }
      }
    ],
    targetPosition: { x: 10, y: 9 },
    safetyMarginBattery: 12
  },

  {
    missionId: 'dust-storm-basin',
    title: 'Dust Storm Basin',
    description: 'High atmospheric particulate interference causes heavy sensor noise. WALL-E must rely more on clues and Bayesian filtering.',
    seed: 101,
    width: 14,
    height: 14,
    basePosition: { x: 1, y: 12 },
    batteryCapacity: 110,
    startingBattery: 90,
    timeLimit: 140,
    actionCosts: {
      moveCost: 2,
      moveTime: 1,
      scanCost: 6,
      scanTime: 3,
      investigateCost: 3,
      investigateTime: 2,
      rechargeCost: 3
    },
    sensorNoise: {
      distanceNoiseStdDev: 3.2,
      angleNoiseDegrees: 40,
      scanRadius: 3
    },
    obstacles: [
      { x: 4, y: 10 }, { x: 4, y: 11 }, { x: 4, y: 12 },
      { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 },
      { x: 10, y: 7 }, { x: 10, y: 8 }, { x: 10, y: 9 }, { x: 11, y: 9 }
    ],
    chargingStations: [
      { id: 'cs-basin-1', x: 5, y: 8, chargeRate: 35, timeCost: 3 },
      { id: 'cs-basin-2', x: 11, y: 4, chargeRate: 45, timeCost: 3 }
    ],
    clues: [
      {
        id: 'clue-dust-1',
        x: 3,
        y: 8,
        type: 'directional',
        discovered: false,
        text: 'High-frequency probe ping reflected from North-East mountain pass.',
        hintData: { quadrant: 'NE', bearingDegrees: 45 }
      },
      {
        id: 'clue-dust-2',
        x: 8,
        y: 8,
        type: 'proximity',
        discovered: false,
        text: 'Axiom recon telemetry fragment: EVE hover signature within 4 cells radius.',
        hintData: { maxDistance: 4 }
      }
    ],
    targetPosition: { x: 12, y: 2 },
    safetyMarginBattery: 15
  },

  {
    missionId: 'axiom-cargo-hangar',
    title: 'Axiom Cargo Bay',
    description: 'Complex maze of cargo containers and conveyor barricades. Tests pathfinding detours and safe return awareness.',
    seed: 777,
    width: 12,
    height: 12,
    basePosition: { x: 0, y: 0 },
    batteryCapacity: 95,
    startingBattery: 80,
    timeLimit: 130,
    actionCosts: {
      moveCost: 2,
      moveTime: 1,
      scanCost: 5,
      scanTime: 2,
      investigateCost: 3,
      investigateTime: 2,
      rechargeCost: 3
    },
    sensorNoise: {
      distanceNoiseStdDev: 1.2,
      angleNoiseDegrees: 20,
      scanRadius: 2
    },
    obstacles: [
      // Central maze walls
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
      { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 },
      { x: 8, y: 6 }, { x: 8, y: 7 }, { x: 8, y: 8 }, { x: 8, y: 9 },
      { x: 4, y: 9 }, { x: 4, y: 10 }, { x: 4, y: 11 }
    ],
    chargingStations: [
      { id: 'cs-axiom-1', x: 1, y: 5, chargeRate: 40, timeCost: 3 },
      { id: 'cs-axiom-2', x: 7, y: 3, chargeRate: 40, timeCost: 3 },
      { id: 'cs-axiom-3', x: 10, y: 10, chargeRate: 45, timeCost: 3 }
    ],
    clues: [
      {
        id: 'clue-ax-1',
        x: 3,
        y: 4,
        type: 'directional',
        discovered: false,
        text: 'Security log: Target probe entered southern ventilation duct corridor.',
        hintData: { bearingDegrees: 110, quadrant: 'SE' }
      },
      {
        id: 'clue-ax-2',
        x: 7,
        y: 8,
        type: 'proximity',
        discovered: false,
        text: 'EVE bio-detector calibration station: Target located between 2 and 4 cells distance.',
        hintData: { minDistance: 1.5, maxDistance: 4 }
      }
    ],
    targetPosition: { x: 9, y: 11 },
    safetyMarginBattery: 12
  }
];

/**
 * Validates a MissionConfig object and returns a clear diagnostic message if invalid.
 */
export function validateMissionConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config) {
    return { valid: false, errors: ['Configuration object is null or undefined'] };
  }

  if (typeof config.width !== 'number' || config.width < 5 || config.width > 30) {
    errors.push('Map width must be an integer between 5 and 30');
  }
  if (typeof config.height !== 'number' || config.height < 5 || config.height > 30) {
    errors.push('Map height must be an integer between 5 and 30');
  }

  if (!config.basePosition || typeof config.basePosition.x !== 'number' || typeof config.basePosition.y !== 'number') {
    errors.push('basePosition must contain integer x and y coordinates');
  } else if (
    config.basePosition.x < 0 ||
    config.basePosition.x >= config.width ||
    config.basePosition.y < 0 ||
    config.basePosition.y >= config.height
  ) {
    errors.push('basePosition is out of map bounds');
  }

  if (!config.targetPosition || typeof config.targetPosition.x !== 'number' || typeof config.targetPosition.y !== 'number') {
    errors.push('targetPosition must contain integer x and y coordinates');
  }

  if (typeof config.batteryCapacity !== 'number' || config.batteryCapacity <= 0) {
    errors.push('batteryCapacity must be a positive number');
  }
  if (typeof config.startingBattery !== 'number' || config.startingBattery <= 0) {
    errors.push('startingBattery must be a positive number');
  }

  if (!config.actionCosts || typeof config.actionCosts.moveCost !== 'number') {
    errors.push('actionCosts must specify valid numeric moveCost');
  }

  if (!Array.isArray(config.obstacles)) {
    errors.push('obstacles must be an array of {x, y} points');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Procedurally generates a reproducible mission configuration from a given seed.
 */
export function generateRandomMission(seed: number, width: number = 12, height: number = 12): MissionConfig {
  const rng = new SeededRandom(seed);

  const basePosition: Point = {
    x: rng.nextInt(0, 2),
    y: rng.nextInt(0, 2)
  };

  const targetPosition: Point = {
    x: rng.nextInt(width - 3, width - 1),
    y: rng.nextInt(height - 3, height - 1)
  };

  // Generate obstacles (approx 15% density) avoiding base and target
  const obstacles: Point[] = [];
  const obstacleSet = new Set<string>();
  const obstacleCount = Math.floor(width * height * 0.14);

  for (let i = 0; i < obstacleCount; i++) {
    const ox = rng.nextInt(0, width - 1);
    const oy = rng.nextInt(0, height - 1);
    const key = `${ox},${oy}`;

    if (
      (ox === basePosition.x && oy === basePosition.y) ||
      (ox === targetPosition.x && oy === targetPosition.y) ||
      obstacleSet.has(key)
    ) {
      continue;
    }

    obstacleSet.add(key);
    obstacles.push({ x: ox, y: oy });
  }

  // Generate 2 charging stations
  const chargingStations: ChargingStation[] = [
    {
      id: `cs-rand-1`,
      x: rng.nextInt(2, Math.floor(width / 2)),
      y: rng.nextInt(2, Math.floor(height / 2)),
      chargeRate: 35,
      timeCost: 3
    },
    {
      id: `cs-rand-2`,
      x: rng.nextInt(Math.floor(width / 2), width - 2),
      y: rng.nextInt(Math.floor(height / 2), height - 2),
      chargeRate: 40,
      timeCost: 3
    }
  ];

  // Generate 2 clues
  const clues: Clue[] = [
    {
      id: `clue-gen-1`,
      x: rng.nextInt(2, width - 3),
      y: rng.nextInt(2, height - 3),
      type: 'directional',
      discovered: false,
      text: 'Encrypted telemetry ping hints at EVE in the eastern quadrant.',
      hintData: { bearingDegrees: 90, quadrant: 'SE' }
    },
    {
      id: `clue-gen-2`,
      x: rng.nextInt(2, width - 3),
      y: rng.nextInt(2, height - 3),
      type: 'proximity',
      discovered: false,
      text: 'Ionic dust dispersion suggests target is within 4 cells radius.',
      hintData: { maxDistance: 4 }
    }
  ];

  return {
    missionId: `random-mission-${seed}`,
    title: `Procedural Sector (Seed ${seed})`,
    description: `Procedurally generated wasteland sector with seed ${seed}.`,
    seed,
    width,
    height,
    basePosition,
    batteryCapacity: 100,
    startingBattery: 85,
    timeLimit: 120,
    actionCosts: {
      moveCost: 2,
      moveTime: 1,
      scanCost: 5,
      scanTime: 2,
      investigateCost: 3,
      investigateTime: 2,
      rechargeCost: 3
    },
    sensorNoise: {
      distanceNoiseStdDev: 1.8,
      angleNoiseDegrees: 30,
      scanRadius: 2
    },
    obstacles,
    chargingStations,
    clues,
    targetPosition,
    safetyMarginBattery: 12
  };
}
