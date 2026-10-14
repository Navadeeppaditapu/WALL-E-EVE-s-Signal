/**
 * Final Mission Report Modal.
 * Generates an evidence-based post-mission summary, comparing
 * agent beliefs with ground truth, resource consumption, and actionable recommendations.
 */

import React from 'react';
import { FinalMissionReport } from '../agent/types.ts';
import { CheckCircle, XCircle, AlertTriangle, Download, ArrowRight, Zap, Clock, Compass } from 'lucide-react';

interface MissionReportModalProps {
  report: FinalMissionReport;
  onClose: () => void;
  showGroundTruth: boolean;
  setShowGroundTruth: (v: boolean) => void;
}

export const MissionReportModal: React.FC<MissionReportModalProps> = ({
  report,
  onClose,
  showGroundTruth,
  setShowGroundTruth
}) => {
  const exportMarkdown = () => {
    const md = `# WALL-E Mission Report: ${report.missionTitle}
**Mission ID:** \`${report.missionId}\`
**Outcome:** ${report.success ? 'SUCCESS (EVE Located)' : 'FAILED / TERMINATED'}
**Termination Reason:** ${report.terminationReason}

## Performance Metrics
- **Cycles Executed:** ${report.totalSteps}
- **Simulated Time Consumed:** ${report.totalTimeElapsed}s
- **Total Battery Consumed:** ${report.totalBatteryConsumed} mAh
- **Traversable Exploration Coverage:** ${report.explorationCoveragePercent}% (${report.cellsExploredCount} / ${report.totalTraversableCells} cells)
- **Clues Discovered:** ${report.cluesDiscoveredCount} / ${report.totalCluesCount}
- **Final Confidence:** ${(report.beliefConfidence * 100).toFixed(1)}%
- **Inferred Target Location:** (${report.eveEstimatedLocation.x}, ${report.eveEstimatedLocation.y})
${report.eveActualLocation ? `- **Actual EVE Ground Truth:** (${report.eveActualLocation.x}, ${report.eveActualLocation.y})` : ''}
${report.estimationErrorCells !== undefined ? `- **Estimation Error:** ${report.estimationErrorCells} Manhattan cells` : ''}

## Strategy Mode Transitions
${report.strategyTransitions.map(t => `- Step ${t.step}: **${t.mode}** — ${t.reason}`).join('\n')}

## Next Steps & Recommendations
${report.recommendations.map(r => `- ${r}`).join('\n')}
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `walle-mission-report-${report.missionId}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header Status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {report.success ? (
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
            ) : report.safeReturnMaintained ? (
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <XCircle className="w-6 h-6" />
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {report.success ? 'Mission Accomplished: EVE Located' : 'Mission Concluded'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {report.missionTitle} · {report.terminationReason}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-mono p-1"
          >
            ✕
          </button>
        </div>

        {/* 4-KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Battery Used
            </div>
            <div className="text-base font-bold font-mono text-slate-200 mt-1">
              {report.totalBatteryConsumed} <span className="text-xs text-slate-500 font-sans">mAh</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> Time Elapsed
            </div>
            <div className="text-base font-bold font-mono text-slate-200 mt-1">
              {report.totalTimeElapsed} <span className="text-xs text-slate-500 font-sans">s</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Compass className="w-3 h-3 text-sky-400" /> Coverage
            </div>
            <div className="text-base font-bold font-mono text-slate-200 mt-1">
              {report.explorationCoveragePercent}%
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Peak Confidence
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {(report.beliefConfidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Target Estimation vs Ground Truth */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Target Coordinates Assessment
            </span>
            <button
              onClick={() => setShowGroundTruth(!showGroundTruth)}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium underline underline-offset-2"
            >
              {showGroundTruth ? 'Hide Ground Truth' : 'Reveal Ground Truth Target'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-500 text-[10px] uppercase font-sans">
                WALL-E Belief Estimate
              </div>
              <div className="text-sm font-bold text-amber-300">
                ({report.eveEstimatedLocation.x}, {report.eveEstimatedLocation.y})
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                Probability: {(report.beliefConfidence * 100).toFixed(1)}%
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-500 text-[10px] uppercase font-sans">
                Environment Ground Truth
              </div>
              {showGroundTruth && report.eveActualLocation ? (
                <>
                  <div className="text-sm font-bold text-cyan-300">
                    ({report.eveActualLocation.x}, {report.eveActualLocation.y})
                  </div>
                  <div className="text-[11px] text-emerald-400 font-sans">
                    Error: {report.estimationErrorCells ?? 0} cells
                  </div>
                </>
              ) : (
                <div className="text-slate-500 italic text-[11px] pt-1">
                  Hidden during active mission
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Strategy Transitions */}
        {report.strategyTransitions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300">
              Strategy Transitions
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {report.strategyTransitions.map((t, idx) => (
                <div
                  key={idx}
                  className="text-xs text-slate-400 flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800/80"
                >
                  <span className="font-mono text-amber-400">Step {t.step}</span>
                  <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                  <span className="font-semibold text-slate-200">{t.mode}</span>
                  <span className="text-[11px] text-slate-500 truncate">({t.reason})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={exportMarkdown}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report (MD)</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Return to Stage
          </button>
        </div>
      </div>
    </div>
  );
};
