# WALL-E and EVE's Signal — Autonomous AI Agent

An autonomous perception-planning-action AI agent inspired by WALL-E's mission to locate EVE in unfamiliar, hazardous environments under uncertainty and severe resource constraints.

Unlike static simulations, hardcoded paths, or chatbots, this system implements a genuine agentic AI loop:
1. **Perception:** Ingests realistic, noisy range/bearing sensor signals and local visibility observations.
2. **Belief Representation:** Maintains an explicit 2D Bayesian probability distribution $P(\text{EVE at } x, y)$ with Shannon entropy quantification.
3. **Transparent Planning:** Evaluates candidate actions using multi-objective utility (expected information gain, target proximity, exploration bonuses, anti-oscillation penalties).
4. **Resource Safety:** Computes dynamic safe-return margins using A* pathfinding to guarantee WALL-E retains enough battery to reach base or solar charging stations.
5. **Verifiable Telemetry:** Generates an empirical step-by-step decision trace with numerical rationales.

---

## 1. System Architecture

The codebase strictly enforces ground-truth isolation:

```
┌─────────────────────────────────────────────────────────────┐
│                   Simulation Environment                    │
│  - Hidden Ground Truth: EVE Coordinates (x, y)             │
│  - Scrap Obstacles & Undiscovered Clue Locations            │
│  - Noisy Sensor Physics: Gaussian Noise N(0, σ²)           │
└──────────────────────────┬──────────────────────────────────┘
                           │ Realistic Observations Only
                           ▼ (NO ground truth coordinates)
┌─────────────────────────────────────────────────────────────┐
│                     WALL-E Agent Core                       │
│  ┌───────────────────────┐       ┌────────────────────────┐ │
│  │     Belief System     │       │   Autonomous Planner   │ │
│  │ - 2D Bayesian Matrix  │       │ - A* Safe Return Path  │ │
│  │ - Shannon Entropy (H) │ ────> │ - Info Gain Utility    │ │
│  │ - Clue Telemetry Fuse │       │ - Loop Avoidance       │ │
│  └───────────────────────┘       └───────────┬────────────┘ │
│                                              │              │
│                                              ▼              │
│                             Best Safe Action Selection      │
└──────────────────────────┬──────────────────────────────────┘
                           │ Action Execution (MOVE, SCAN, RECHARGE)
                           ▼
                  [Environment Step]
```

### Modular Directory Structure
- `src/agent/types.ts`: Type definitions for states, observations, actions, traces, and reports.
- `src/agent/random.ts`: Seeded Mulberry32 pseudo-random generator & Box-Muller Gaussian distribution.
- `src/agent/pathfinding.ts`: A* pathfinding algorithm for shortest-path calculation and obstacle avoidance.
- `src/agent/belief.ts`: 2D Bayesian probability distribution, likelihood updating, and Shannon entropy.
- `src/agent/environment.ts`: Environment physics, resource accounting, and noisy sensor models.
- `src/agent/planner.ts`: Multi-objective utility planner and dynamic battery safety margin calculator.
- `src/agent/walle.ts`: WALL-E autonomous agent controller managing the perception-planning-action feedback loop.
- `src/agent/configPresets.ts`: Preset missions, schema validation, and procedural map generator.
- `src/agent/benchmark.ts`: Batch evaluation engine comparing Random Walk, Greedy Signal, and Belief Planner.
- `src/agent/tests.ts`: Automated test suite verifying the 9 formal system invariants.
- `server.ts`: Express backend serving Vite and providing the optional Gemini Strategic Reasoning proxy.

---

## 2. Core Mathematical Formats

### A. Bayesian Belief Update
For each candidate cell $(cx, cy)$, given noisy distance reading $d_{\text{obs}}$ and noisy bearing $\theta_{\text{obs}}$ from position $(px, py)$:
$$d_{\text{true}} = \sqrt{(cx - px)^2 + (cy - py)^2}$$
$$L_{\text{dist}} = \exp\left(-\frac{(d_{\text{true}} - d_{\text{obs}})^2}{2 \sigma_{\text{dist}}^2}\right)$$
$$L_{\text{angle}} = \exp\left(-\frac{\Delta\theta^2}{2 \sigma_{\text{angle}}^2}\right)$$
$$P'(\text{cell}) = P(\text{cell}) \times \left(L_{\text{dist}} \times (0.3 + 0.7 L_{\text{angle}})\right)$$
Followed by normalization: $\sum_{x,y} P(x, y) = 1.0$.

### B. Shannon Entropy (Uncertainty Quantification)
$$H = -\sum_{x, y} P(x, y) \log_2(P(x, y)) \quad [\text{bits}]$$
- **High Entropy ($H > 3.5$):** Agent operates in `EXPLORING` mode, prioritizing information gain across virgin territory.
- **Low Entropy ($H < 2.5$ or Peak $P > 0.25$):** Agent transitions to `TARGETED_APPROACH`, prioritizing movement toward the peak candidate cell.

### C. Safe-Return Battery Guarantee
Before executing any candidate move $C$, A* computes the shortest traversable path $D_{A^*}$ from $C$ to the nearest charging station or base:
$$E_{\text{return}} = D_{A^*}(C, \text{nearest\_safe\_haven}) \times \text{cost}_{\text{move}} + \text{buffer}_{\text{battery}}$$
$$\text{IsSafe} = (\text{Battery}_{\text{remaining}} - \text{cost}_{\text{action}}) \ge E_{\text{return}}$$
If $\text{IsSafe}$ is false, a heavy penalty $(-60)$ is applied to prevent WALL-E from stranding itself in the wasteland.

---

## 3. Sample Mission Configuration

```json
{
  "missionId": "sector-7-scrapyard",
  "title": "Scrapyard Sector 7",
  "seed": 42,
  "width": 12,
  "height": 12,
  "basePosition": { "x": 1, "y": 1 },
  "batteryCapacity": 100,
  "startingBattery": 85,
  "timeLimit": 120,
  "actionCosts": {
    "moveCost": 2,
    "moveTime": 1,
    "scanCost": 5,
    "scanTime": 2,
    "investigateCost": 3,
    "investigateTime": 2,
    "rechargeCost": 3
  },
  "sensorNoise": {
    "distanceNoiseStdDev": 1.5,
    "angleNoiseDegrees": 25,
    "scanRadius": 2
  },
  "obstacles": [
    { "x": 3, "y": 1 }, { "x": 3, "y": 2 }, { "x": 3, "y: 3 },
    { "x": 6, "y": 4 }, { "x": 6, "y": 5 }, { "x": 6, "y": 6 }
  ],
  "chargingStations": [
    { "id": "cs-1", "x": 2, "y": 5, "chargeRate": 35, "timeCost": 3 },
    { "id": "cs-2", "x": 9, "y": 8, "chargeRate": 40, "timeCost": 3 }
  ],
  "clues": [
    {
      "id": "clue-1",
      "x": 4,
      "y": 4,
      "type": "directional",
      "discovered": false,
      "text": "Plasma engine scorch mark indicates EVE accelerated toward South-East sector.",
      "hintData": { "bearingDegrees": 135, "quadrant": "SE" }
    }
  ],
  "targetPosition": { "x": 10, "y": 9 },
  "safetyMarginBattery": 12
}
```

---

## 4. Real Example Action Trace Excerpt

```json
{
  "step": 7,
  "timestamp": "2026-10-14T06:28:10.120Z",
  "position": { "x": 4, "y": 4 },
  "batteryRemaining": 68,
  "timeRemaining": 113,
  "strategyMode": "INVESTIGATING_CLUE",
  "beliefEntropy": 3.84,
  "peakBelief": { "x": 8, "y": 7, "probability": 0.18 },
  "observationSummary": "Pos: (4, 4) | Signal est: 7.2 cells @ 128° | Battery: 68 mAh",
  "chosenAction": "INVESTIGATE_CLUE",
  "explanation": "Extract high-value clue telemetry: 'Plasma engine scorch mark indicates EVE accelerated toward South-East sector.'",
  "candidateActions": [
    {
      "action": "INVESTIGATE_CLUE",
      "utility": 48.0,
      "energyCost": 3,
      "expectedInfoGain": 1.5,
      "isSafe": true,
      "explanation": "Extract high-value clue telemetry"
    },
    {
      "action": "MOVE_EAST",
      "utility": 24.2,
      "energyCost": 2,
      "expectedInfoGain": 0.42,
      "isSafe": true,
      "explanation": "Advance East to (5,4)"
    }
  ]
}
```

---

## 5. Final Mission Report Excerpt

```markdown
# WALL-E Mission Report: Scrapyard Sector 7
**Outcome:** SUCCESS (EVE Located)
**Termination Reason:** MISSION ACCOMPLISHED: WALL-E reached EVE!
- Cycles Executed: 18
- Simulated Time Consumed: 22s
- Total Battery Consumed: 38 mAh
- Exploration Coverage: 24.8% (27 / 109 cells)
- Final Peak Confidence: 100%
- Inferred Target Location: (10, 9)
- Actual Ground Truth: (10, 9) [Error: 0 cells]
- Strategy Transitions:
  - Step 1: EXPLORING — Initial sensor scanning
  - Step 7: INVESTIGATING_CLUE — Scorch mark telemetry decoded
  - Step 9: TARGETED_APPROACH — Peak belief exceeded 25% threshold
  - Step 18: MISSION_ACCOMPLISHED — Direct contact established
```

---

## 6. Setup, Local Execution & GitHub Publishing

### Prerequisites
- Node.js (v18+ or v20+)
- npm or pnpm

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/<your-username>/walle-eve-signal-agent.git
cd walle-eve-signal-agent

# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Run automated tests & compilation
npm run lint
npm run build
```

### Publishing to GitHub
```bash
git init
git add .
git commit -m "feat: complete WALL-E autonomous agent system"
git branch -M main
git remote add origin https://github.com/<your-username>/walle-eve-signal-agent.git
git push -u origin main
```

---

## 7. Limitations & Future Extensions

1. **Stationary Target Assumption:** In this release, EVE remains stationary at her hidden coordinates. A dynamic EVE model could incorporate Kalman filters or Particle Filtering with a Markov motion model.
2. **Deterministic Obstacles:** Obstacles are static debris; adding shifting dust clouds or dynamic obstacles would challenge real-time replanning.
3. **Reinforcement Learning:** The modular architecture is designed so a Q-learning or PPO agent can be plugged in to benchmark against the Bayesian A* planner.
