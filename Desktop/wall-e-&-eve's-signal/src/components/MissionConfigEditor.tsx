/**
 * Mission Configuration JSON Editor Drawer/Modal.
 * Enables live JSON configuration editing, schema validation, and instant re-seeding.
 */

import React, { useState, useEffect } from 'react';
import { MissionConfig } from '../agent/types.ts';
import { validateMissionConfig, PRESET_MISSIONS } from '../agent/configPresets.ts';
import { Check, AlertCircle, RotateCcw } from 'lucide-react';

interface MissionConfigEditorProps {
  config: MissionConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (newConfig: MissionConfig) => void;
}

export const MissionConfigEditor: React.FC<MissionConfigEditorProps> = ({
  config,
  isOpen,
  onClose,
  onSaveConfig
}) => {
  const [jsonText, setJsonText] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(config, null, 2));
    setValidationErrors([]);
    setSyntaxError(null);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setSyntaxError(null);
      const val = validateMissionConfig(parsed);
      setValidationErrors(val.errors);
    } catch (err: any) {
      setSyntaxError(err.message);
      setValidationErrors([]);
    }
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const val = validateMissionConfig(parsed);
      if (!val.valid) {
        setValidationErrors(val.errors);
        return;
      }
      onSaveConfig(parsed);
      onClose();
    } catch (err: any) {
      setSyntaxError(err.message);
    }
  };

  const handleResetToPreset = () => {
    const defaultPreset = PRESET_MISSIONS[0];
    setJsonText(JSON.stringify(defaultPreset, null, 2));
    setSyntaxError(null);
    setValidationErrors([]);
  };

  const isValid = !syntaxError && validationErrors.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Mission JSON Configuration Editor
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Edit environment dimensions, noise parameters, battery reserves, and obstacle layouts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-mono p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Validation Errors Bar */}
        {(syntaxError || validationErrors.length > 0) && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs space-y-1 shrink-0">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Configuration Validation Issue:</span>
            </div>
            {syntaxError && <p className="font-mono text-[11px]">{syntaxError}</p>}
            {validationErrors.map((err, i) => (
              <p key={i} className="text-[11px]">
                · {err}
              </p>
            ))}
          </div>
        )}

        {/* Text Area */}
        <div className="flex-1 min-h-[360px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-2 font-mono text-xs">
          <textarea
            value={jsonText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full h-full bg-transparent text-amber-200/90 resize-none focus:outline-none leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={handleResetToPreset}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Sector 7 Preset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
