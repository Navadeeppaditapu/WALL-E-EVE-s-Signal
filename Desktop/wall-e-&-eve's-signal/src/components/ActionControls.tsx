/**
 * Action & Simulation Playback Controls Component.
 * Supports autonomous execution, stepping, speed adjustment,
 * policy selection, and seed randomization.
 */

import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sparkles,
  Dices,
  Radar,
  SlidersHorizontal
} from 'lucide-react';
import { PRESET_MISSIONS } from '../agent/configPresets.ts';

export type ActivePolicy = 'walle_belief' | 'greedy_signal' | 'random_walk';

interface ActionControlsProps {
  isRunning: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  speed: number;
  setSpeed: (s: number) => void;
  activePolicy: ActivePolicy;
  setActivePolicy: (p: ActivePolicy) => void;
  enableGemini: boolean;
  setEnableGemini: (v: boolean) => void;
  currentSeed: number;
  onSeedChange: (seed: number) => void;
  onPresetSelect: (presetId: string) => void;
  selectedPresetId: string;
  onOpenConfigEditor: () => void;
  onManualDeepScan: () => void;
  canManualScan: boolean;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  isRunning,
  onPlay,
  onPause,
  onStep,
  onReset,
  speed,
  setSpeed,
  activePolicy,
  setActivePolicy,
  enableGemini,
  setEnableGemini,
  currentSeed,
  onSeedChange,
  onPresetSelect,
  selectedPresetId,
  onOpenConfigEditor,
  onManualDeepScan,
  canManualScan
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Row 1: Primary Simulation Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={onPause}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg flex items-center gap-2 text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg flex items-center gap-2 text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Run Autonomous Agent</span>
            </button>
          )}

          <button
            onClick={onStep}
            disabled={isRunning}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-medium rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
            title="Step forward 1 decision cycle"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Step Cycle</span>
          </button>

          <button
            onClick={onReset}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
            title="Reset simulation to initial state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-500 px-2 font-medium">Speed:</span>
          {[0.5, 1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded transition-colors font-mono cursor-pointer ${
                speed === s
                  ? 'bg-slate-800 text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Policy Selection and Gemini Coprocessor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Agent Decision Policy
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActivePolicy('walle_belief')}
              className={`py-1.5 px-2 rounded font-medium text-center truncate transition-colors cursor-pointer ${
                activePolicy === 'walle_belief'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full Bayesian belief system + A* safety reservation"
            >
              Belief Planner
            </button>

            <button
              onClick={() => setActivePolicy('greedy_signal')}
              className={`py-1.5 px-2 rounded font-medium text-center truncate transition-colors cursor-pointer ${
                activePolicy === 'greedy_signal'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Chases sensor signal without spatial probability memory"
            >
              Greedy Signal
            </button>

            <button
              onClick={() => setActivePolicy('random_walk')}
              className={`py-1.5 px-2 rounded font-medium text-center truncate transition-colors cursor-pointer ${
                activePolicy === 'random_walk'
                  ? 'bg-slate-800 text-slate-200 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pure random traversable walk baseline"
            >
              Random Walk
            </button>
          </div>
        </div>

        {/* Gemini Strategic Coprocessor Toggle */}
        <div className="flex flex-col justify-end">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Cognitive Layer
          </label>
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  Gemini Strategic Advisor
                </span>
                <span className="text-[10px] text-slate-500">
                  Calls Gemini to advise on high-level hypothesis
                </span>
              </div>
            </div>
            <button
              onClick={() => setEnableGemini(!enableGemini)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                enableGemini ? 'bg-purple-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  enableGemini ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Presets, Seed, and Mission Config */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800 text-xs">
        {/* Preset Selector */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Mission Preset</label>
          <select
            value={selectedPresetId}
            onChange={(e) => onPresetSelect(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {PRESET_MISSIONS.map((p) => (
              <option key={p.missionId} value={p.missionId}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Seed Input & Randomize */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Random Seed</label>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={currentSeed}
              onChange={(e) => onSeedChange(Number(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 font-mono text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
            />
            <button
              onClick={() => onSeedChange(Math.floor(Math.random() * 9000) + 1000)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
              title="Roll random seed"
            >
              <Dices className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Config & Manual Probes */}
        <div className="flex items-end gap-1.5">
          <button
            onClick={onManualDeepScan}
            disabled={!canManualScan || isRunning}
            className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Trigger an omni-directional deep sensor sweep (-5 mAh)"
          >
            <Radar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Deep Scan</span>
          </button>

          <button
            onClick={onOpenConfigEditor}
            className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            title="Edit raw mission JSON"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
