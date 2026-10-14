/**
 * Header Component complying with the strict Top Bar Contract:
 * Zone 1: Single text wordmark
 * Zone 2: 4 clean single-line nav tabs
 * Zone 3: 1 primary action
 */

import React from 'react';

export type ActiveView = 'mission' | 'benchmark' | 'tests' | 'docs';

interface HeaderProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onNewMission: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onNewMission
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950 sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
          W
        </div>
        <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          WALL-E · EVE SIGNAL AGENT
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveView('mission')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'mission' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400 decoration-2' : ''
          }`}
        >
          Mission Control
        </button>

        <button
          onClick={() => setActiveView('benchmark')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'benchmark' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400 decoration-2' : ''
          }`}
        >
          Policy Benchmark
        </button>

        <button
          onClick={() => setActiveView('tests')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'tests' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400 decoration-2' : ''
          }`}
        >
          Verification Tests
        </button>

        <button
          onClick={() => setActiveView('docs')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'docs' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400 decoration-2' : ''
          }`}
        >
          Architecture & Guide
        </button>
      </nav>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onNewMission}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-md shadow-amber-400/20 cursor-pointer"
        >
          Generate New Mission
        </button>
      </div>
    </header>
  );
};
