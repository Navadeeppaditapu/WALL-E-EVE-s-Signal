/**
 * Automated Test Suite View Component.
 * Interactive interface to run, monitor, and inspect the 9 formal system invariant tests.
 */

import React, { useState } from 'react';
import { runAllTests, TestResult } from '../agent/tests.ts';
import { Play, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export const TestSuiteView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [passedCount, setPassedCount] = useState<number | null>(null);

  const executeTests = async () => {
    setIsRunning(true);
    try {
      const summary = await runAllTests();
      setTestResults(summary.results);
      setPassedCount(summary.passedCount);
    } catch (err) {
      console.error('Test execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Suite Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Automated Verification Test Suite</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Formally verifies all core requirements: hidden ground-truth isolation, realistic sensor noise, physical obstacle collisions, Bayesian belief updating, A* return safety, and deterministic termination.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {passedCount !== null && (
            <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-emerald-400 font-bold">{passedCount}</span>
              <span className="text-slate-500"> / {testResults.length} Passed</span>
            </div>
          )}

          <button
            onClick={executeTests}
            disabled={isRunning}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isRunning ? 'Running Tests...' : 'Execute Test Suite'}</span>
          </button>
        </div>
      </div>

      {/* Test List */}
      <div className="space-y-2.5">
        {testResults.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
            <p>No tests executed yet. Click "Execute Test Suite" to verify all 9 core requirements.</p>
          </div>
        ) : (
          testResults.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-colors ${
                t.passed
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-rose-950/20 border-rose-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {t.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {t.name}
                    </span>
                    <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400 font-mono">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {t.message}
                  </p>
                </div>
              </div>

              <div className="font-mono text-[11px] text-slate-500 shrink-0">
                {t.durationMs}ms
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
