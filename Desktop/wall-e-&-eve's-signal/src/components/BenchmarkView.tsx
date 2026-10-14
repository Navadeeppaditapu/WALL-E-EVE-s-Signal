/**
 * Comparative Benchmark View Component.
 * Executes live multi-mission evaluations comparing:
 * 1. Random Walk Baseline
 * 2. Greedy Signal Follower
 * 3. Autonomous Belief Planner (WALL-E)
 */

import React, { useState } from 'react';
import { runComparativeBenchmark, BenchmarkReport } from '../agent/benchmark.ts';
import { Play, CheckCircle, AlertTriangle, Zap, BarChart2 } from 'lucide-react';

export const BenchmarkView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [seedCount, setSeedCount] = useState<number>(8);

  const startBenchmark = async () => {
    setIsRunning(true);
    setProgress({ current: 0, total: seedCount });

    // Generate N deterministic seeds for reproducible comparison
    const baseSeeds = [42, 101, 204, 305, 512, 777, 888, 999, 1234, 2345, 3456, 4567, 5678, 6789, 7890, 8901];
    const selectedSeeds = baseSeeds.slice(0, seedCount);

    try {
      const res = await runComparativeBenchmark(selectedSeeds, (current, total) => {
        setProgress({ current, total });
      });
      setReport(res);
    } catch (err) {
      console.error('Benchmark execution error:', err);
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-amber-400" />
            <span>Multi-Seed Policy Benchmarking Suite</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Empirically tests agent architectures across generated missions with varying obstacle densities and noisy signal fields. Compares autonomous Bayesian belief planning against stochastic and reactive baselines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">Batch Size:</span>
            {[6, 8, 12].map((cnt) => (
              <button
                key={cnt}
                onClick={() => setSeedCount(cnt)}
                disabled={isRunning}
                className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                  seedCount === cnt
                    ? 'bg-slate-800 text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>

          <button
            onClick={startBenchmark}
            disabled={isRunning}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isRunning ? 'Benchmarking...' : 'Execute Live Benchmark'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && progress && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-400 font-semibold">
              Simulating Batch Execution...
            </span>
            <span className="font-mono text-slate-400">
              {progress.current} / {progress.total} missions complete
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Benchmark Results */}
      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.policies.map((p, idx) => {
              const isWalle = p.policyName.includes('WALL-E');
              const isGreedy = p.policyName.includes('Greedy');

              return (
                <div
                  key={idx}
                  className={`rounded-xl p-5 border flex flex-col justify-between space-y-4 ${
                    isWalle
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : isGreedy
                      ? 'bg-slate-900 border-cyan-800/60'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {p.policyName}
                      </span>
                      {isWalle && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-semibold">
                          Autonomous
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono text-slate-100">
                        {p.successRate}%
                      </span>
                      <span className="text-xs text-slate-500">
                        ({p.successCount} / {p.totalMissions} found EVE)
                      </span>
                    </div>

                    {/* Visual Bar */}
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full ${
                          isWalle ? 'bg-amber-400' : isGreedy ? 'bg-cyan-400' : 'bg-slate-600'
                        }`}
                        style={{ width: `${p.successRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics Table */}
                  <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-sans">Avg Cycles to EVE:</span>
                      <span className="text-slate-200">
                        {p.avgStepsToTarget > 0 ? `${p.avgStepsToTarget} steps` : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-sans">Avg Battery Used:</span>
                      <span className="text-slate-200">{p.avgBatteryUsed} mAh</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-sans">Stranded Failures:</span>
                      <span className={p.strandedCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {p.strandedCount} ({Math.round((p.strandedCount / p.totalMissions) * 100)}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-sans">Time Expired:</span>
                      <span className="text-slate-200">{p.timeExpiredCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Analytical Findings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-xs space-y-2 leading-relaxed text-slate-300">
            <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Scientific Evaluation Insights</span>
            </h4>
            <p>
              <strong>1. Safe-Return Superiority:</strong> The Autonomous Belief Planner (WALL-E) maintains an active A* return route to the base or nearest solar charging station. In contrast, the Greedy Signal Follower often depletes its battery chasing noisy bearings without reserving energy to navigate around obstacles back to safety.
            </p>
            <p>
              <strong>2. Information Gain vs. Reactive Chase:</strong> WALL-E evaluates expected entropy reduction, balancing exploration of virgin territory with focused pursuit once peak probability passes the confidence threshold. This cuts redundant oscillation and avoids local minima behind barriers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
