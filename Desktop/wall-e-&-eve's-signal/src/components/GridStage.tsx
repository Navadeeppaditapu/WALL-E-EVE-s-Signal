/**
 * 2D Interactive Grid Stage.
 * Renders the simulated environment: WALL-E rover, EVE, obstacles, base,
 * solar charging stations, clues, tire tracks, and real-time Bayesian belief heatmap.
 */

import React, { useState } from 'react';
import {
  MissionConfig,
  Point,
  Clue,
  ChargingStation
} from '../agent/types.ts';
import { Eye, Layers, Compass, Zap, HelpCircle } from 'lucide-react';

interface GridStageProps {
  config: MissionConfig;
  agentPos: Point;
  evePos?: Point; // Provided only when mission ends or ground truth toggled
  eveFound: boolean;
  visitedPath: Point[];
  beliefGrid: number[][];
  clues: Clue[];
  chargingStations: ChargingStation[];
  noisyBearing?: number;
  noisyDistance?: number;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  showGroundTruth: boolean;
  setShowGroundTruth: (v: boolean) => void;
  showTrail: boolean;
  setShowTrail: (v: boolean) => void;
}

export const GridStage: React.FC<GridStageProps> = ({
  config,
  agentPos,
  evePos,
  eveFound,
  visitedPath,
  beliefGrid,
  clues,
  chargingStations,
  noisyBearing,
  noisyDistance,
  showHeatmap,
  setShowHeatmap,
  showGroundTruth,
  setShowGroundTruth,
  showTrail,
  setShowTrail
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);

  const obstacleSet = new Set(config.obstacles.map(p => `${p.x},${p.y}`));
  const visitedSet = new Set(visitedPath.map(p => `${p.x},${p.y}`));
  const chargerMap = new Map(chargingStations.map(c => [`${c.x},${c.y}`, c]));
  const clueMap = new Map(clues.map(c => [`${c.x},${c.y}`, c]));

  // Find max probability in belief grid for relative heatmap scaling
  let maxP = 0.001;
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      if (beliefGrid[y] && beliefGrid[y][x] > maxP) {
        maxP = beliefGrid[y][x];
      }
    }
  }

  const getHeatmapColor = (p: number) => {
    if (p <= 0.0001) return 'transparent';
    const normalized = Math.min(1, p / maxP);
    if (normalized > 0.7) {
      return `rgba(245, 158, 11, ${0.4 + normalized * 0.4})`; // Amber / gold peak
    } else if (normalized > 0.3) {
      return `rgba(14, 165, 233, ${0.2 + normalized * 0.35})`; // Cyan mid-tier
    } else {
      return `rgba(99, 102, 241, ${0.1 + normalized * 0.25})`; // Indigo low-tier
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col items-center">
      {/* Top Toolbar: Layer toggles */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Display Layers:</span>
          
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
              showHeatmap
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Belief Heatmap</span>
          </button>

          <button
            onClick={() => setShowTrail(!showTrail)}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
              showTrail
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Rover Trail</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGroundTruth(!showGroundTruth)}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
              showGroundTruth
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Inspect ground truth for evaluation. The agent never has access to this data."
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ground Truth {showGroundTruth ? '(Visible)' : '(Hidden)'}</span>
          </button>
        </div>
      </div>

      {/* Grid Canvas Wrapper */}
      <div className="relative overflow-auto max-w-full p-2 bg-slate-950 rounded-lg border border-slate-800/80">
        <div
          className="grid gap-[2px] select-none"
          style={{
            gridTemplateColumns: `repeat(${config.width}, minmax(32px, 42px))`,
            gridTemplateRows: `repeat(${config.height}, minmax(32px, 42px))`
          }}
        >
          {Array.from({ length: config.height }).map((_, y) =>
            Array.from({ length: config.width }).map((_, x) => {
              const cellKey = `${x},${y}`;
              const isObstacle = obstacleSet.has(cellKey);
              const isBase = x === config.basePosition.x && y === config.basePosition.y;
              const charger = chargerMap.get(cellKey);
              const clue = clueMap.get(cellKey);
              const isAgent = x === agentPos.x && y === agentPos.y;
              const isEve = evePos && x === evePos.x && y === evePos.y;
              const isVisited = visitedSet.has(cellKey);
              const prob = beliefGrid[y] ? beliefGrid[y][x] : 0;
              const isTargetFoundAtEve = eveFound && isEve;

              return (
                <div
                  key={cellKey}
                  onMouseEnter={() => setHoveredCell({ x, y })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => clue && setSelectedClue(clue)}
                  style={{
                    backgroundColor: showHeatmap && !isObstacle && !isBase ? getHeatmapColor(prob) : undefined
                  }}
                  className={`relative flex items-center justify-center rounded-sm transition-all duration-150 border ${
                    isObstacle
                      ? 'bg-amber-950/40 border-amber-900/60 shadow-inner'
                      : isBase
                      ? 'bg-sky-950/60 border-sky-800'
                      : charger
                      ? 'bg-emerald-950/40 border-emerald-800'
                      : isVisited
                      ? 'bg-slate-900/90 border-slate-800/80'
                      : 'bg-slate-950 border-slate-900 hover:border-slate-700'
                  }`}
                >
                  {/* Visited Breadcrumb Dot */}
                  {showTrail && isVisited && !isAgent && !isBase && !isObstacle && (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600/60" />
                  )}

                  {/* Base Platform */}
                  {isBase && (
                    <div className="flex flex-col items-center justify-center text-[9px] font-bold text-sky-400">
                      <div className="w-5 h-5 rounded-md border border-sky-400/80 bg-sky-950 flex items-center justify-center text-[10px]">
                        ⌂
                      </div>
                      <span className="scale-75 text-sky-400">BASE</span>
                    </div>
                  )}

                  {/* Charging Station */}
                  {charger && !isAgent && (
                    <div className="flex flex-col items-center justify-center text-[9px] text-emerald-400">
                      <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span className="scale-75 text-emerald-300">SOLAR</span>
                    </div>
                  )}

                  {/* Obstacle (Compacted Metal Rubble) */}
                  {isObstacle && (
                    <div className="w-full h-full p-1 flex items-center justify-center">
                      <div className="w-full h-full bg-amber-900/30 border border-amber-800/50 rounded flex items-center justify-center text-[10px] text-amber-700 font-mono">
                        ■
                      </div>
                    </div>
                  )}

                  {/* Discovered or Known Clue Beacon */}
                  {clue && !isAgent && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClue(clue);
                      }}
                      className="relative z-10 p-0.5 rounded cursor-pointer"
                      title={clue.discovered ? clue.text : 'Unexamined clue sensor beacon'}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          clue.discovered
                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40 animate-bounce'
                            : 'bg-slate-700 text-slate-300 border border-slate-600'
                        }`}
                      >
                        ?
                      </div>
                    </button>
                  )}

                  {/* EVE Target (Revealed if found OR ground-truth toggled) */}
                  {(eveFound || showGroundTruth) && isEve && (
                    <div
                      className={`relative z-20 flex flex-col items-center justify-center transition-transform ${
                        isTargetFoundAtEve ? 'scale-110' : ''
                      }`}
                      title={eveFound ? 'EVE LOCATED!' : 'EVE (Ground Truth Hidden Position)'}
                    >
                      {/* Sleek EVE visual */}
                      <div className="w-5 h-6 rounded-t-full rounded-b-xl bg-white border border-cyan-300 shadow-lg shadow-cyan-400/60 flex flex-col items-center justify-center p-0.5">
                        <div className="w-3.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      </div>
                      <span className="text-[8px] font-bold text-cyan-300 tracking-tighter">EVE</span>
                    </div>
                  )}

                  {/* WALL-E Rover Visual */}
                  {isAgent && (
                    <div
                      className="relative z-30 flex flex-col items-center justify-center animate-fade-in"
                      title={`WALL-E at (${x}, ${y})`}
                    >
                      {/* Binoculars */}
                      <div className="flex gap-0.5 mb-[1px]">
                        <div className="w-2 h-2 rounded-t-sm bg-amber-500 border border-amber-700 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-cyan-300" />
                        </div>
                        <div className="w-2 h-2 rounded-t-sm bg-amber-500 border border-amber-700 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-cyan-300" />
                        </div>
                      </div>
                      {/* Main Box Chassis */}
                      <div className="w-5 h-3.5 bg-amber-600 border border-amber-800 rounded-sm flex items-center justify-center shadow-md">
                        <div className="w-2.5 h-1.5 bg-slate-900 border border-amber-400/50 rounded-xs flex items-center justify-center">
                          <div className="w-1.5 h-0.5 bg-emerald-400 rounded-xs" />
                        </div>
                      </div>
                      {/* Caterpillar Tracks */}
                      <div className="w-6 h-1 bg-slate-900 border border-slate-700 rounded-full mt-[1px]" />
                    </div>
                  )}

                  {/* Probability Micro-label in heatmap mode */}
                  {showHeatmap && prob > 0.05 && !isObstacle && !isAgent && !isBase && (
                    <div className="absolute bottom-0 right-0.5 text-[8px] font-mono text-slate-300/80 pointer-events-none">
                      {(prob * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Coordinate & Cell Inspector Footer */}
      <div className="w-full flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <span>
            Pointer:{' '}
            <span className="font-mono text-slate-200">
              {hoveredCell ? `(${hoveredCell.x}, ${hoveredCell.y})` : '--'}
            </span>
          </span>
          {hoveredCell && (
            <span>
              Belief P:{' '}
              <span className="font-mono text-amber-300 font-semibold">
                {((beliefGrid[hoveredCell.y]?.[hoveredCell.x] || 0) * 100).toFixed(2)}%
              </span>
            </span>
          )}
          {noisyBearing !== undefined && (
            <span>
              Signal Bearing:{' '}
              <span className="font-mono text-sky-400">
                {noisyBearing.toFixed(0)}° (est. {noisyDistance?.toFixed(1)} cells)
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-amber-600" /> WALL-E
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-white border border-cyan-400" /> EVE
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-emerald-500" /> Solar Array
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-amber-900" /> Scrap Barrier
          </span>
        </div>
      </div>

      {/* Clue Inspector Dialog */}
      {selectedClue && (
        <div className="mt-3 w-full bg-slate-950 border border-amber-500/40 rounded-lg p-3 text-xs flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-400">
                Beacon Telemetry at ({selectedClue.x}, {selectedClue.y})
              </span>
              <span className="text-[10px] text-slate-500 uppercase">
                {selectedClue.type} clue · {selectedClue.discovered ? 'Inspected' : 'Unexamined'}
              </span>
            </div>
            <p className="text-slate-300">{selectedClue.text}</p>
          </div>
          <button
            onClick={() => setSelectedClue(null)}
            className="text-slate-500 hover:text-slate-200 px-2 py-0.5 rounded text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
