/**
 * Autonomous Action Trace Feed Component.
 * Displays real-time decision logs, candidate action evaluations,
 * mathematical utility scores, and verified explanations.
 */

import React, { useState } from 'react';
import { TraceStep } from '../agent/types.ts';
import { Download, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface LiveTraceFeedProps {
  traceHistory: TraceStep[];
}

export const LiveTraceFeed: React.FC<LiveTraceFeedProps> = ({ traceHistory }) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const exportTraceJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(traceHistory, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `walle-action-trace-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActionBadge = (action: string) => {
    if (action.startsWith('MOVE')) {
      return 'bg-sky-500/10 text-sky-400 border border-sky-500/30';
    }
    if (action === 'SCAN_DEEP') {
      return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
    }
    if (action === 'INVESTIGATE_CLUE') {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    }
    if (action === 'RECHARGE') {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    }
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
  };

  // Reverse so newest step is at top
  const reversed = [...traceHistory].reverse();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">
            Autonomous Decision Trace
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            ({traceHistory.length} cycles)
          </span>
        </div>

        <button
          onClick={exportTraceJson}
          disabled={traceHistory.length === 0}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Export complete execution trace as JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export JSON</span>
        </button>
      </div>

      {/* Trace Log Stream */}
      <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1">
        {reversed.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <p>Agent idle. Press "Run Autonomous Agent" or "Step Cycle" to begin.</p>
          </div>
        ) : (
          reversed.map((step) => {
            const isExpanded = expandedStep === step.step;

            return (
              <div
                key={step.step}
                className="bg-slate-950 border border-slate-800/90 rounded-lg p-3 text-xs space-y-2 hover:border-slate-700 transition-colors"
              >
                {/* Step Top Line */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">
                      #{step.step}
                    </span>
                    <span className="font-mono text-slate-400">
                      ({step.position.x}, {step.position.y})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${getActionBadge(
                        step.chosenAction
                      )}`}
                    >
                      {step.chosenAction}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>{step.batteryRemaining} mAh</span>
                    <span>·</span>
                    <span>H: {step.beliefEntropy.toFixed(2)}b</span>
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                      className="text-slate-500 hover:text-slate-200 p-0.5 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-slate-300 leading-relaxed font-sans">
                  {step.explanation}
                </p>

                {/* Gemini Advisory Tag if applicable */}
                {step.geminiAdvised && (
                  <div className="flex items-center gap-1.5 p-1.5 rounded bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-300">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>
                      Gemini Coprocessor:{' '}
                      <span className="italic">{step.geminiRecommendation}</span>
                      {step.geminiAccepted ? ' [Validated & Applied]' : ' [Rejected by Safety Guard]'}
                    </span>
                  </div>
                )}

                {/* Collapsible Candidate Action Breakdown */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Candidate Actions Evaluated:
                    </div>
                    <div className="space-y-1.5">
                      {step.candidateActions.map((c, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded border text-[11px] font-mono flex items-center justify-between ${
                            c.action === step.chosenAction
                              ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span>{c.action}</span>
                              {c.isSafe ? (
                                <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Safe
                                </span>
                              ) : (
                                <span className="text-rose-400 text-[10px] flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Unsafe
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              {c.explanation}
                            </div>
                          </div>

                          <div className="text-right text-[10px] space-y-0.5 shrink-0 ml-2">
                            <div className="font-bold text-slate-200">
                              Utility: {c.utility.toFixed(1)}
                            </div>
                            <div className="text-slate-500">
                              Cost: -{c.energyCost} mAh
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
