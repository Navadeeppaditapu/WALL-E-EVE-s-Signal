/**
 * Telemetry Bar Component.
 * Displays live battery status with safe-return margin indicator,
 * time remaining, strategy mode, belief entropy, and peak confidence.
 */

import React from 'react';
import { Battery, Zap, Compass, Activity } from 'lucide-react';
import { StrategyMode, Point } from '../agent/types.ts';

interface TelemetryBarProps {
  batteryRemaining: number;
  batteryCapacity: number;
  timeRemaining: number;
  timeLimit: number;
  strategyMode: StrategyMode;
  beliefEntropy: number;
  peakBelief: { x: number; y: number; probability: number };
  safeReturnBatteryThreshold: number;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  batteryRemaining,
  batteryCapacity,
  timeRemaining,
  timeLimit,
  strategyMode,
  beliefEntropy,
  peakBelief,
  safeReturnBatteryThreshold
}) => {
  const batteryPercent = Math.max(0, Math.min(100, Math.round((batteryRemaining / batteryCapacity) * 100)));
  const timePercent = Math.max(0, Math.min(100, Math.round((timeRemaining / timeLimit) * 100)));
  const safeMarginPercent = Math.min(100, Math.round((safeReturnBatteryThreshold / batteryCapacity) * 100));

  const getStrategyBadgeColor = (mode: StrategyMode) => {
    switch (mode) {
      case 'EXPLORING':
        return 'text-sky-400 bg-sky-950/60 border-sky-800';
      case 'INVESTIGATING_CLUE':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      case 'TARGETED_APPROACH':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case 'RETURNING_TO_RECHARGE':
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
      case 'MISSION_ACCOMPLISHED':
        return 'text-purple-400 bg-purple-950/60 border-purple-800';
      case 'EMERGENCY_STOP':
        return 'text-red-400 bg-red-950/60 border-red-800';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  const getBatteryColor = () => {
    if (batteryRemaining <= safeReturnBatteryThreshold) return 'bg-rose-500';
    if (batteryRemaining <= batteryCapacity * 0.4) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
        {/* Battery Telemetry */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Battery className="w-3.5 h-3.5 text-amber-400" />
              <span>Battery Reserve</span>
            </span>
            <span className="font-mono font-medium text-slate-200 tabular-nums">
              {batteryRemaining} <span className="text-slate-500">/ {batteryCapacity} mAh</span>
            </span>
          </div>
          <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            {/* Safe return reserve threshold marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10"
              style={{ left: `${safeMarginPercent}%` }}
              title={`Safe return reservation: ${safeReturnBatteryThreshold} mAh`}
            />
            <div
              className={`h-full transition-all duration-300 ${getBatteryColor()}`}
              style={{ width: `${batteryPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>{batteryPercent}%</span>
            <span>Safety buffer: {safeReturnBatteryThreshold} mAh</span>
          </div>
        </div>

        {/* Time Limit Telemetry */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mission Time</span>
            </span>
            <span className="font-mono font-medium text-slate-200 tabular-nums">
              {timeRemaining} <span className="text-slate-500">/ {timeLimit}s</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${timePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Elapsed: {timeLimit - timeRemaining}s</span>
            <span>{timePercent}% left</span>
          </div>
        </div>

        {/* Tactical Strategy Mode */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Tactical Mode</span>
          </div>
          <div
            className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-semibold uppercase tracking-wider ${getStrategyBadgeColor(
              strategyMode
            )}`}
          >
            {strategyMode.replace(/_/g, ' ')}
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {strategyMode === 'EXPLORING' && 'Maximizing spatial information gain'}
            {strategyMode === 'INVESTIGATING_CLUE' && 'Decoding local sensor clue'}
            {strategyMode === 'TARGETED_APPROACH' && 'Advancing toward peak belief'}
            {strategyMode === 'RETURNING_TO_RECHARGE' && 'Routing to safe solar charging point'}
            {strategyMode === 'MISSION_ACCOMPLISHED' && 'EVE confirmed! Holding station'}
            {strategyMode === 'EMERGENCY_STOP' && 'No safe traversal actions remaining'}
          </p>
        </div>

        {/* Belief Uncertainty & Peak */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Belief Peak & Entropy</span>
            </span>
            <span className="font-mono text-xs text-emerald-400 tabular-nums font-semibold">
              {(peakBelief.probability * 100).toFixed(1)}% at ({peakBelief.x},{peakBelief.y})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-950 rounded-lg p-1.5 border border-slate-800">
              <div className="text-[10px] text-slate-500">Uncertainty (Entropy)</div>
              <div className="font-mono text-xs font-medium text-slate-200">
                {beliefEntropy.toFixed(2)} <span className="text-[10px] text-slate-500">bits</span>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 rounded-lg p-1.5 border border-slate-800">
              <div className="text-[10px] text-slate-500">Peak Confidence</div>
              <div className="font-mono text-xs font-medium text-slate-200">
                {peakBelief.probability > 0.4 ? 'High' : peakBelief.probability > 0.15 ? 'Moderate' : 'Diffuse'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
