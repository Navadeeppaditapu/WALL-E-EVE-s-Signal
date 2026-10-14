/**
 * WALL-E & EVE's Signal: Autonomous AI Agent
 * Main Application Orchestrator
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MissionConfig,
  AgentObservation,
  FinalMissionReport,
  TraceStep,
  ActionType,
  Point
} from './agent/types.ts';
import { PRESET_MISSIONS, generateRandomMission } from './agent/configPresets.ts';
import { SimulationEnvironment } from './agent/environment.ts';
import { WallEAgent } from './agent/walle.ts';
import { Header, ActiveView } from './components/Header.tsx';
import { TelemetryBar } from './components/TelemetryBar.tsx';
import { GridStage } from './components/GridStage.tsx';
import { ActionControls, ActivePolicy } from './components/ActionControls.tsx';
import { LiveTraceFeed } from './components/LiveTraceFeed.tsx';
import { MissionReportModal } from './components/MissionReportModal.tsx';
import { MissionConfigEditor } from './components/MissionConfigEditor.tsx';
import { BenchmarkView } from './components/BenchmarkView.tsx';
import { TestSuiteView } from './components/TestSuiteView.tsx';
import { DocumentationView } from './components/DocumentationView.tsx';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('mission');
  const [config, setConfig] = useState<MissionConfig>(PRESET_MISSIONS[0]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_MISSIONS[0].missionId);
  const [currentSeed, setCurrentSeed] = useState<number>(PRESET_MISSIONS[0].seed);

  // Core Simulation & Agent references
  const envRef = useRef<SimulationEnvironment>(new SimulationEnvironment(PRESET_MISSIONS[0]));
  const agentRef = useRef<WallEAgent>(new WallEAgent(PRESET_MISSIONS[0]));

  // Live simulation states
  const [currentObservation, setCurrentObservation] = useState<AgentObservation>(() =>
    envRef.current.reset()
  );
  const [beliefGrid, setBeliefGrid] = useState<number[][]>(() =>
    agentRef.current.belief.getGrid()
  );
  const [traceHistory, setTraceHistory] = useState<TraceStep[]>([]);
  const [visitedPath, setVisitedPath] = useState<Point[]>([PRESET_MISSIONS[0].basePosition]);
  const [finalReport, setFinalReport] = useState<FinalMissionReport | null>(null);

  // Playback parameters
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [activePolicy, setActivePolicy] = useState<ActivePolicy>('walle_belief');
  const [enableGemini, setEnableGemini] = useState<boolean>(false);

  // View toggles
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showGroundTruth, setShowGroundTruth] = useState<boolean>(false);
  const [showTrail, setShowTrail] = useState<boolean>(true);
  const [isConfigEditorOpen, setIsConfigEditorOpen] = useState<boolean>(false);

  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initializes or resets environment and agent instances
   */
  const initMission = useCallback((newConfig: MissionConfig) => {
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
    }
    setIsRunning(false);

    envRef.current = new SimulationEnvironment(newConfig);
    agentRef.current = new WallEAgent(newConfig);

    const initialObs = envRef.current.reset();
    setCurrentObservation(initialObs);
    setBeliefGrid(agentRef.current.belief.getGrid());
    setTraceHistory([]);
    setVisitedPath([newConfig.basePosition]);
    setFinalReport(null);
  }, []);

  // When config changes, re-init
  const handleConfigUpdate = (updatedConfig: MissionConfig) => {
    setConfig(updatedConfig);
    initMission(updatedConfig);
  };

  const handlePresetSelect = (presetId: string) => {
    const found = PRESET_MISSIONS.find((p) => p.missionId === presetId);
    if (found) {
      setSelectedPresetId(presetId);
      setCurrentSeed(found.seed);
      setConfig(found);
      initMission(found);
    }
  };

  const handleSeedChange = (seed: number) => {
    setCurrentSeed(seed);
    const newMission = generateRandomMission(seed, config.width, config.height);
    setSelectedPresetId(newMission.missionId);
    setConfig(newMission);
    initMission(newMission);
  };

  const handleNewRandomMission = () => {
    const randomSeed = Math.floor(Math.random() * 9000) + 1000;
    handleSeedChange(randomSeed);
  };

  /**
   * Executes a single Perception -> Planning -> Action cycle
   */
  const executeStep = useCallback(async (): Promise<boolean> => {
    const groundTruth = envRef.current.getGroundTruth();

    // Check if mission is already finished
    if (groundTruth.eveFound || currentObservation.batteryRemaining <= 0 || currentObservation.timeRemaining <= 0) {
      setIsRunning(false);
      const report = agentRef.current.generateFinalReport(
        groundTruth.eveFound,
        groundTruth.terminationReason || 'Mission concluded',
        groundTruth.targetPosition
      );
      setFinalReport(report);
      return false;
    }

    let chosenAction: ActionType = 'STOP';

    // 1. Policy Arbitration
    if (activePolicy === 'walle_belief') {
      const decision = await agentRef.current.decideNextAction(currentObservation, {
        enableGeminiAdvisor: enableGemini
      });
      chosenAction = decision.action;
    } else if (activePolicy === 'greedy_signal') {
      const bearing = currentObservation.signalReading.noisyBearing;
      if (bearing >= 315 || bearing < 45) chosenAction = 'MOVE_EAST';
      else if (bearing >= 45 && bearing < 135) chosenAction = 'MOVE_SOUTH';
      else if (bearing >= 135 && bearing < 225) chosenAction = 'MOVE_WEST';
      else chosenAction = 'MOVE_NORTH';
    } else {
      // Random walk
      const moves: ActionType[] = ['MOVE_NORTH', 'MOVE_SOUTH', 'MOVE_EAST', 'MOVE_WEST'];
      chosenAction = moves[Math.floor(Math.random() * moves.length)];
    }

    // 2. Step Environment
    const stepResult = envRef.current.step(chosenAction);
    const newObs = stepResult.observation;

    // Update React state
    setCurrentObservation(newObs);
    setBeliefGrid(agentRef.current.belief.getGrid());
    setTraceHistory(agentRef.current.getTraceHistory());
    setVisitedPath(agentRef.current.getVisitedPath());

    // 3. Termination Check
    if (stepResult.terminated) {
      setIsRunning(false);
      const report = agentRef.current.generateFinalReport(
        stepResult.observation.eveDetectedHere || envRef.current.getGroundTruth().eveFound,
        stepResult.reason,
        envRef.current.getGroundTruth().targetPosition
      );
      setFinalReport(report);
      return false;
    }

    return true;
  }, [currentObservation, activePolicy, enableGemini]);

  // Main autonomous loop
  useEffect(() => {
    if (isRunning) {
      const delay = Math.max(50, Math.round(600 / speed));
      loopTimerRef.current = setTimeout(async () => {
        const canContinue = await executeStep();
        if (!canContinue) {
          setIsRunning(false);
        }
      }, delay);
    } else if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
    }

    return () => {
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
      }
    };
  }, [isRunning, speed, executeStep]);

  // Manual probe trigger for deep sensor sweep
  const handleManualDeepScan = async () => {
    if (isRunning) return;
    const stepResult = envRef.current.step('SCAN_DEEP');
    setCurrentObservation(stepResult.observation);
    setBeliefGrid(agentRef.current.belief.getGrid());
    setTraceHistory(agentRef.current.getTraceHistory());
  };

  const peakBelief = agentRef.current.belief.getPeakBelief();
  const entropy = agentRef.current.belief.calculateEntropy();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Navigation Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onNewMission={handleNewRandomMission}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeView === 'mission' && (
          <div className="space-y-6">
            {/* Live Telemetry Bar */}
            <TelemetryBar
              batteryRemaining={currentObservation.batteryRemaining}
              batteryCapacity={config.batteryCapacity}
              timeRemaining={currentObservation.timeRemaining}
              timeLimit={config.timeLimit}
              strategyMode={traceHistory.length > 0 ? traceHistory[traceHistory.length - 1].strategyMode : 'EXPLORING'}
              beliefEntropy={entropy}
              peakBelief={peakBelief}
              safeReturnBatteryThreshold={config.safetyMarginBattery}
            />

            {/* Split Visual Stage and Telemetry & Trace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: 2D Interactive Stage & Controls */}
              <div className="lg:col-span-7 space-y-4">
                <GridStage
                  config={config}
                  agentPos={currentObservation.currentPosition}
                  evePos={
                    showGroundTruth || finalReport?.eveFound
                      ? envRef.current.getGroundTruth().targetPosition
                      : undefined
                  }
                  eveFound={currentObservation.eveDetectedHere}
                  visitedPath={visitedPath}
                  beliefGrid={beliefGrid}
                  clues={config.clues}
                  chargingStations={config.chargingStations}
                  noisyBearing={currentObservation.signalReading.noisyBearing}
                  noisyDistance={currentObservation.signalReading.noisyDistance}
                  showHeatmap={showHeatmap}
                  setShowHeatmap={setShowHeatmap}
                  showGroundTruth={showGroundTruth}
                  setShowGroundTruth={setShowGroundTruth}
                  showTrail={showTrail}
                  setShowTrail={setShowTrail}
                />

                <ActionControls
                  isRunning={isRunning}
                  onPlay={() => setIsRunning(true)}
                  onPause={() => setIsRunning(false)}
                  onStep={executeStep}
                  onReset={() => initMission(config)}
                  speed={speed}
                  setSpeed={setSpeed}
                  activePolicy={activePolicy}
                  setActivePolicy={setActivePolicy}
                  enableGemini={enableGemini}
                  setEnableGemini={setEnableGemini}
                  currentSeed={currentSeed}
                  onSeedChange={handleSeedChange}
                  onPresetSelect={handlePresetSelect}
                  selectedPresetId={selectedPresetId}
                  onOpenConfigEditor={() => setIsConfigEditorOpen(true)}
                  onManualDeepScan={handleManualDeepScan}
                  canManualScan={currentObservation.batteryRemaining >= config.actionCosts.scanCost}
                />
              </div>

              {/* Right Column: Live Decision Trace Feed */}
              <div className="lg:col-span-5">
                <LiveTraceFeed traceHistory={traceHistory} />
              </div>
            </div>
          </div>
        )}

        {/* View 2: Policy Benchmarking Suite */}
        {activeView === 'benchmark' && <BenchmarkView />}

        {/* View 3: Automated Test Suite */}
        {activeView === 'tests' && <TestSuiteView />}

        {/* View 4: Architecture & Documentation */}
        {activeView === 'docs' && <DocumentationView />}
      </main>

      {/* Mission JSON Configuration Modal */}
      <MissionConfigEditor
        config={config}
        isOpen={isConfigEditorOpen}
        onClose={() => setIsConfigEditorOpen(false)}
        onSaveConfig={handleConfigUpdate}
      />

      {/* Final Mission Report Modal */}
      {finalReport && (
        <MissionReportModal
          report={finalReport}
          onClose={() => setFinalReport(null)}
          showGroundTruth={showGroundTruth}
          setShowGroundTruth={setShowGroundTruth}
        />
      )}
    </div>
  );
}
