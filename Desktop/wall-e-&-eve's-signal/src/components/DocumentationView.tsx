/**
 * Documentation & System Architecture View Component.
 * Beginner-friendly educational guide explaining agentic loops, Bayesian updates,
 * A* pathfinding, Python equivalence, and GitHub publishing instructions.
 */

import React, { useState } from 'react';
import { BookOpen, Code2, GitBranch, Cpu, Brain, BatteryCharging } from 'lucide-react';

export const DocumentationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'algorithms' | 'python' | 'github'>('architecture');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'architecture'
              ? 'bg-amber-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200 bg-slate-950'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>System Architecture</span>
        </button>

        <button
          onClick={() => setActiveTab('algorithms')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'algorithms'
              ? 'bg-amber-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200 bg-slate-950'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Algorithms & Mathematics</span>
        </button>

        <button
          onClick={() => setActiveTab('python')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'python'
              ? 'bg-amber-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200 bg-slate-950'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Python Implementation Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('github')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'github'
              ? 'bg-amber-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200 bg-slate-950'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Export & GitHub Setup</span>
        </button>
      </div>

      {/* TAB 1: System Architecture */}
      {activeTab === 'architecture' && (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>Perception–Planning–Action Autonomous Loop</span>
          </h3>
          <p>
            Unlike scripted routines or prompt chatbots, WALL-E operates on an asynchronous cognitive feedback loop with strict separation of concerns:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-amber-400 font-bold font-mono text-[11px] uppercase">
                1. Environment (Ground Truth)
              </div>
              <p className="text-[11px] text-slate-400">
                Encapsulates actual target coordinates, scrap obstacles, and undiscovered clues. Corrupts sensor telemetry with realistic Gaussian distance and directional noise before generating observations.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-sky-400 font-bold font-mono text-[11px] uppercase">
                2. Belief System (Perception)
              </div>
              <p className="text-[11px] text-slate-400">
                Maintains a 2D probability matrix P(EVE at x, y). Performs Bayesian likelihood updates with every sensor ping and clue, while zeroing out visited or scanned cells where EVE was not found.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-emerald-400 font-bold font-mono text-[11px] uppercase">
                3. Autonomous Planner (Action)
              </div>
              <p className="text-[11px] text-slate-400">
                Evaluates candidate actions using multi-objective utility: information gain, distance to peak belief, battery conservation, and strict A* return-path safety to base or charging station.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-semibold text-slate-200">Strict Ground Truth Encapsulation</h4>
            <p>
              At no point in the code does the agent receive EVE's true coordinates (x, y). All navigation decisions are derived solely from noisy observations, clue hints, and Bayesian uncertainty estimation.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Algorithms */}
      {activeTab === 'algorithms' && (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
          <h3 className="text-sm font-bold text-slate-100">Core Mathematical Algorithms</h3>

          <div className="space-y-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
              <div className="text-amber-400 font-bold text-xs">
                A. Bayesian Sensor Likelihood Update
              </div>
              <p className="text-slate-400 font-sans text-[11px]">
                Given a noisy distance reading d_obs and noisy bearing θ_obs:
              </p>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-200 text-[11px] leading-relaxed">
                P(cell | obs) ∝ P(cell) · exp(- (dist(pos, cell) - d_obs)² / (2 · σ_dist²)) · exp(- Δθ² / (2 · σ_angle²))
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
              <div className="text-sky-400 font-bold text-xs">
                B. Shannon Entropy (Uncertainty Metric)
              </div>
              <p className="text-slate-400 font-sans text-[11px]">
                Measures how diffuse WALL-E's belief is across the map:
              </p>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-200 text-[11px] leading-relaxed">
                H = - ∑ P(x, y) · log₂(P(x, y))  [bits]
              </div>
              <p className="text-slate-400 font-sans text-[11px]">
                High entropy (&gt; 4.0 bits) triggers broad exploration; low entropy (&lt; 2.5 bits) triggers a focused, targeted approach.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
              <div className="text-emerald-400 font-bold text-xs">
                C. Safe-Return Guarantee Formula
              </div>
              <p className="text-slate-400 font-sans text-[11px]">
                For every candidate move $C$, A* computes shortest distance $D$ to the nearest charging station or base:
              </p>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-200 text-[11px] leading-relaxed">
                E_required = D_A*(C, nearest_charger) · cost_move + buffer_margin
                IsSafe = (Battery_current - cost_move) ≥ E_required
              </div>
              <p className="text-slate-400 font-sans text-[11px]">
                If IsSafe is false, a heavy penalty (-60) prevents the agent from stranding itself.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Python Guide */}
      {activeTab === 'python' && (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>Beginner Python Translation</span>
          </h3>
          <p>
            If you are learning Python, you can translate this TypeScript agent directly using Python's standard library and NumPy:
          </p>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto leading-relaxed">
{`# walle_agent.py - Python equivalent for beginners
import numpy as np
import heapq

class BeliefSystem:
    def __init__(self, width, height, obstacles, base_pos):
        self.width = width
        self.height = height
        self.grid = np.ones((height, width), dtype=np.float64)
        
        # Zero out obstacles and starting base
        for ox, oy in obstacles:
            self.grid[oy, ox] = 0.0
        self.grid[base_pos[1], base_pos[0]] = 0.0
        self.grid /= np.sum(self.grid)

    def update_sensor(self, agent_pos, distance_reading, bearing_reading, sigma_d=1.5, sigma_a=30.0):
        for y in range(self.height):
            for x in range(self.width):
                if self.grid[y, x] <= 0:
                    continue
                d = np.hypot(x - agent_pos[0], y - agent_pos[1])
                dist_likelihood = np.exp(-((d - distance_reading) ** 2) / (2 * sigma_d ** 2))
                
                angle = np.degrees(np.arctan2(y - agent_pos[1], x - agent_pos[0])) % 360
                angle_diff = abs(angle - bearing_reading)
                if angle_diff > 180:
                    angle_diff = 360 - angle_diff
                angle_likelihood = np.exp(-(angle_diff ** 2) / (2 * sigma_a ** 2))
                
                self.grid[y, x] *= (dist_likelihood * (0.3 + 0.7 * angle_likelihood))
        
        total = np.sum(self.grid)
        if total > 0:
            self.grid /= total

    def entropy(self):
        p = self.grid[self.grid > 1e-12]
        return -np.sum(p * np.log2(p))
`}
          </pre>
        </div>
      )}

      {/* TAB 4: GitHub Setup */}
      {activeTab === 'github' && (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>Publishing to GitHub</span>
          </h3>
          <p>
            To clone and run this project or push it to your personal GitHub repository:
          </p>

          <div className="space-y-3 font-mono text-[11px]">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="text-slate-500 font-sans">1. Initialize git and add remote</div>
              <p className="text-amber-300">git init</p>
              <p className="text-amber-300">git add .</p>
              <p className="text-amber-300">git commit -m "feat: complete WALL-E autonomous agent system"</p>
              <p className="text-amber-300">git branch -M main</p>
              <p className="text-amber-300">git remote add origin https://github.com/&lt;your-username&gt;/walle-eve-signal-agent.git</p>
              <p className="text-amber-300">git push -u origin main</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="text-slate-500 font-sans">2. Local Run Instructions</div>
              <p className="text-slate-400"># Install dependencies</p>
              <p className="text-emerald-400">npm install</p>
              <p className="text-slate-400 mt-1"># Run development server (Vite + Express on port 3000)</p>
              <p className="text-emerald-400">npm run dev</p>
              <p className="text-slate-400 mt-1"># Run automated tests & compilation</p>
              <p className="text-emerald-400">npm run lint</p>
              <p className="text-emerald-400">npm run build</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
