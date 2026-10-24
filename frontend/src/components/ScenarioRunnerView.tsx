import React, { useState } from 'react';
import { Play, CheckCircle2, RotateCcw, Zap } from 'lucide-react';
import { runScenarioStep, resetSimulation } from '../api/client';

interface ScenarioRunnerViewProps {
  onScenarioStepCompleted: (step: number, data: any) => void;
  onResetCompleted: () => void;
}

export const ScenarioRunnerView: React.FC<ScenarioRunnerViewProps> = ({
  onScenarioStepCompleted,
  onResetCompleted,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stepFeedback, setStepFeedback] = useState<{ step: number; title: string; summary: string } | null>(null);

  const scenarioSteps = [
    { step: 1, title: 'Initial Bus Crash Report', desc: 'Citizen submits initial bus collision report at South Bridge (18 est. casualties).' },
    { step: 2, title: 'AI Fact Extraction', desc: 'AI extracts structured incident data, hazards, and flags UNVERIFIED estimate.' },
    { step: 3, title: 'Conflicting Call Received', desc: '112 phone report claims 38 casualties & fire; variance conflict alert triggered.' },
    { step: 4, title: 'Hospital Readiness Review', desc: 'Inspect regional trauma bed, ICU reserve, and data freshness badges.' },
    { step: 5, title: 'Feasible Allocations', desc: 'Hungarian engine pairs casualties with capable trauma centers & available ambulances.' },
    { step: 6, title: 'Coordinator Approvals', desc: 'Coordinator reviews and approves proposed assignments, reserving beds & ICU.' },
    { step: 7, title: 'Escalations & Advisories', desc: 'Authority alerts issued (Police/Fire) and driver advisory published for South Bridge.' },
    { step: 8, title: 'Capacity Disruption Injected', desc: 'Amrita Hospital ICU reaches 0 capacity and marks status to NOT ACCEPTING.' },
    { step: 9, title: 'Continuous Replanning Check', desc: 'Monitoring engine detects invalidated plans and calculates capable alternative facilities.' },
    { step: 10, title: 'Reroute to Alternatives', desc: 'Coordinator approves rerouting to Aster Medcity & Lakeshore without disruption.' },
    { step: 11, title: 'Unified Incident Report', desc: 'Compile final operational report with casualty accounting and audit trail.' },
  ];

  const handleExecuteStep = async (stepNumber: number) => {
    setIsRunning(true);
    try {
      const res = await runScenarioStep(stepNumber);
      setCurrentStep(stepNumber);
      setStepFeedback({
        step: stepNumber,
        title: res.title || `Step ${stepNumber} Completed`,
        summary: res.summary || 'Scenario step successfully executed.'
      });
      onScenarioStepCompleted(stepNumber, res);
    } catch (err) {
      console.error(`Failed to run scenario step ${stepNumber}:`, err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleNextStep = () => {
    const next = currentStep < 11 ? currentStep + 1 : 1;
    handleExecuteStep(next);
  };

  const handleReset = async () => {
    setIsRunning(true);
    try {
      await resetSimulation();
      setCurrentStep(0);
      setStepFeedback(null);
      onResetCompleted();
    } catch (err) {
      console.error('Failed to reset scenario:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              INTERACTIVE DEMO SCENARIO: ERNAKULAM BUS COLLISION
            </h3>
            <p className="text-xs text-slate-400">
              11-step end-to-end multi-agency walkthrough (Accident ➔ Conflict ➔ Routing ➔ Disruption ➔ Replanning ➔ Report)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs transition-all active:scale-95 disabled:opacity-50"
            title="Reset Scenario to Calm Initial State"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            RESET SCENARIO
          </button>
          <button
            onClick={handleNextStep}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            {currentStep === 0 ? 'START STEP 1' : currentStep === 11 ? 'RESTART' : `EXECUTE STEP ${currentStep + 1}`}
          </button>
        </div>
      </div>

      {/* Step Progress Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-11 gap-1.5 font-mono text-xs">
        {scenarioSteps.map((s) => {
          const isDone = currentStep >= s.step;
          const isCurrent = currentStep === s.step;
          return (
            <button
              key={s.step}
              onClick={() => handleExecuteStep(s.step)}
              disabled={isRunning}
              title={s.desc}
              className={`p-1.5 rounded border text-left transition-all ${
                isCurrent
                  ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-md shadow-indigo-950'
                  : isDone
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                  : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>#{s.step}</span>
                {isDone && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
              </div>
              <div className="truncate text-[9px] mt-0.5">{s.title}</div>
            </button>
          );
        })}
      </div>

      {/* Live Step Feedback Callout */}
      {stepFeedback && (
        <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/40 text-xs flex items-start gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-white font-mono text-xs flex items-center gap-2">
              <span>STEP {stepFeedback.step}: {stepFeedback.title}</span>
              <span className="text-xs text-emerald-400 font-normal">✓ Executed</span>
            </div>
            <p className="text-slate-300 text-xs font-sans leading-relaxed">{stepFeedback.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
};
