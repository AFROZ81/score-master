import { useState } from 'react';
import { X } from 'lucide-react';

export type DismissalType = 
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run-out'
  | 'stumped'
  | 'hit-wicket'
  | 'handled-the-ball'
  | 'obstructing-the-field';

export interface WicketDetails {
  type: DismissalType;
  fielderIdx?: number; // For caught, stumped (single fielder)
  fielderIdxs?: number[]; // For run-out (multiple fielders involved)
  otherBatsmanIdx?: number; // For run-out (the batsman who got run out)
  runOutEnd?: 'bowlers-end' | 'keepers-end'; // End at which run out occurred
  runsScored?: number; // For run-out (runs scored on the ball)
}

interface WicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: WicketDetails) => void;
  batsmen: Array<{ idx: number; name: string; isOut: boolean }>;
  fielders: Array<{ idx: number; name: string }>;
  strikerIdx: number;
  nonStrikerIdx: number;
  /** When true, locks modal to run-out only (used for no-ball run-out flow) */
  runOutOnly?: boolean;
  /** Optional initial details to restore when re-opening modal */
  initialDetails?: WicketDetails | null;
}

export default function WicketModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  batsmen,
  fielders,
  strikerIdx,
  nonStrikerIdx,
  runOutOnly = false,
  initialDetails = null,
}: WicketModalProps) {
  const [selectedType, setSelectedType] = useState<DismissalType | null>(
    initialDetails?.type || (runOutOnly ? 'run-out' : null)
  );
  const [selectedFielder, setSelectedFielder] = useState<number | null>(
    initialDetails?.fielderIdx ?? null
  );
  const [selectedFielders, setSelectedFielders] = useState<number[]>(
    initialDetails?.fielderIdxs || []
  );
  const [selectedOtherBatsman, setSelectedOtherBatsman] = useState<number | null>(
    initialDetails?.otherBatsmanIdx ?? null
  );
  const [selectedRunOutEnd, setSelectedRunOutEnd] = useState<'bowlers-end' | 'keepers-end' | null>(
    initialDetails?.runOutEnd ?? null
  );

  if (!isOpen) return null;

  const dismissalTypes = [
    { type: 'bowled' as DismissalType, label: 'Bowled', icon: '🎯', requiresFielder: false },
    { type: 'caught' as DismissalType, label: 'Caught', icon: '🤲', requiresFielder: true },
    { type: 'lbw' as DismissalType, label: 'LBW', icon: '🦵', requiresFielder: false },
    { type: 'run-out' as DismissalType, label: 'Run Out', icon: '🏃', requiresFielder: true, requiresOtherBatsman: true },
    { type: 'stumped' as DismissalType, label: 'Stumped', icon: '🧤', requiresFielder: true },
    { type: 'hit-wicket' as DismissalType, label: 'Hit Wicket', icon: '💥', requiresFielder: false },
    { type: 'handled-the-ball' as DismissalType, label: 'Handled Ball', icon: '✋', requiresFielder: false },
    { type: 'obstructing-the-field' as DismissalType, label: 'Obstructing Field', icon: '🚫', requiresFielder: false },
  ];

  const currentDismissal = dismissalTypes.find(d => d.type === selectedType);

  const handleConfirm = () => {
    if (!selectedType) return;

    const details: WicketDetails = {
      type: selectedType,
    };

    if (selectedType === 'run-out') {
      // For run-out, use multiple fielders, end, and out batsman
      if (selectedFielders.length > 0) {
        details.fielderIdxs = selectedFielders;
      }
      if (selectedOtherBatsman !== null) {
        details.otherBatsmanIdx = selectedOtherBatsman;
      }
      if (selectedRunOutEnd !== null) {
        details.runOutEnd = selectedRunOutEnd;
      }
    } else if (currentDismissal?.requiresFielder && selectedFielder !== null) {
      // For other dismissals, use single fielder
      details.fielderIdx = selectedFielder;
    }

    if (currentDismissal?.requiresOtherBatsman && selectedOtherBatsman !== null) {
      details.otherBatsmanIdx = selectedOtherBatsman;
    }

    onConfirm(details);
    resetState();
  };

  const resetState = () => {
    setSelectedType(runOutOnly ? 'run-out' : null);
    setSelectedFielder(null);
    setSelectedFielders([]);
    setSelectedOtherBatsman(null);
    setSelectedRunOutEnd(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Filter out the striker from fielders (can't catch your own ball)
  const availableFielders = fielders.filter(f => f.idx !== strikerIdx);
  
  // For run-out, show available batsmen (excluding the striker who is out)
  const availableBatsmenForRunOut = batsmen.filter(b => b.idx !== strikerIdx && !b.isOut);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        {/* Header */}
        <div className="sticky top-0 bg-linear-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">{runOutOnly ? 'No Ball — Run Out' : 'Wicket Details'}</h2>
          <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Select Dismissal Type — hidden when run-out only */}
          {!runOutOnly && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">1. Select Dismissal Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {dismissalTypes.map((dismissal) => (
                  <button
                    key={dismissal.type}
                    onClick={() => {
                      setSelectedType(dismissal.type);
                      setSelectedFielder(null);
                      setSelectedOtherBatsman(null);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedType === dismissal.type
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/40'
                        : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">{dismissal.icon}</div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">{dismissal.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {runOutOnly && (
            <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-orange-800 dark:text-orange-200">🏃 Run Out on No Ball — select the batsman and fielder(s) involved.</p>
            </div>
          )}

          {/* Step 2: Select Fielder (if required) */}
          {currentDismissal?.requiresFielder && selectedType !== 'run-out' && !runOutOnly && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                2. Select {selectedType === 'stumped' ? 'Wicket-Keeper' : 'Fielder'}
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {availableFielders.map((fielder) => (
                  <button
                    key={fielder.idx}
                    onClick={() => setSelectedFielder(fielder.idx)}
                    className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${
                      selectedFielder === fielder.idx
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                        : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-800 dark:text-slate-100">{fielder.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Fielders for Run-Out (multiple checkboxes) */}
          {selectedType === 'run-out' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                {runOutOnly ? '1.' : '2.'} Select Fielder(s) Involved
              </h3>
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Select all fielders involved in the run out (can select multiple)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {availableFielders.map((fielder) => {
                  const isSelected = selectedFielders.includes(fielder.idx);
                  return (
                    <button
                      key={fielder.idx}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedFielders(selectedFielders.filter(idx => idx !== fielder.idx));
                        } else {
                          setSelectedFielders([...selectedFielders, fielder.idx]);
                        }
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                          : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="text-sm font-medium text-gray-800 dark:text-slate-100">{fielder.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedFielders.length > 0 && (
                <div className="mt-2 text-xs text-gray-600 dark:text-slate-400">
                  Selected: {selectedFielders.length} fielder(s)
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Batsman Run Out */}
          {currentDismissal?.requiresOtherBatsman && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                {runOutOnly ? '2.' : '3.'} Select Batsman Run Out
              </h3>
              <div className="bg-yellow-50 dark:bg-amber-950/40 border border-yellow-200 dark:border-amber-900/60 rounded-lg p-3 mb-3">
                <p className="text-xs text-yellow-800 dark:text-amber-200">
                  Select which batsman was run out (the one who was short of the crease)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedOtherBatsman(strikerIdx)}
                  className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${
                    selectedOtherBatsman === strikerIdx
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-800 dark:text-slate-100">
                    {batsmen.find(b => b.idx === strikerIdx)?.name} (Striker)
                  </div>
                </button>
                <button
                  onClick={() => setSelectedOtherBatsman(nonStrikerIdx)}
                  className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${
                    selectedOtherBatsman === nonStrikerIdx
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-800 dark:text-slate-100">
                    {batsmen.find(b => b.idx === nonStrikerIdx)?.name} (Non-Striker)
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Select Run-Out End (Bowler's End / Keeper's End) */}
          {selectedType === 'run-out' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                {runOutOnly ? '3.' : '4.'} Select Run-Out End
              </h3>
              <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-lg p-3 mb-3">
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  Select which end the run-out occurred at (Bowler's End or Keeper's End)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedRunOutEnd('bowlers-end')}
                  className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${
                    selectedRunOutEnd === 'bowlers-end'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <span>⚾</span> Bowler's End
                  </div>
                </button>
                <button
                  onClick={() => setSelectedRunOutEnd('keepers-end')}
                  className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${
                    selectedRunOutEnd === 'keepers-end'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <span>🧤</span> Keeper's End
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!selectedType || 
              (selectedType !== 'run-out' && currentDismissal?.requiresFielder && selectedFielder === null) ||
              (selectedType === 'run-out' && (selectedFielders.length === 0 || selectedRunOutEnd === null)) ||
              (currentDismissal?.requiresOtherBatsman && selectedOtherBatsman === null)}
            className="w-full bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 rounded-xl font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Confirm Wicket
          </button>
        </div>
      </div>
    </div>
  );
}
