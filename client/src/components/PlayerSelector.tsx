import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

export interface PlayerSelectorItem {
  idx: number;
  name: string;
  subtitle?: string;
  isRetiredHurt?: boolean;
}

export interface PlayerSelectorProps {
  title: string;
  subtitle: string;
  players: PlayerSelectorItem[];
  selectionCount: number;
  badgeLabels?: string[];
  disabledIndices?: number[];
  onSelect: (selectedIndices: number[]) => void;
  onBack: () => void;
  accentColor?: 'blue' | 'red' | 'green' | 'yellow' | 'amber';
}

export default function PlayerSelector({
  title,
  subtitle,
  players,
  selectionCount,
  badgeLabels,
  disabledIndices = [],
  onSelect,
  onBack,
  accentColor = 'blue',
}: PlayerSelectorProps) {
  const [selected, setSelected] = useState<number[]>([]);

  const colors = {
    blue: { bg: 'bg-blue-600', bgLight: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' },
    red: { bg: 'bg-red-600', bgLight: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
    green: { bg: 'bg-green-600', bgLight: 'bg-green-50', border: 'border-green-500', text: 'text-green-700' },
    yellow: { bg: 'bg-amber-500', bgLight: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700' },
    amber: { bg: 'bg-amber-500', bgLight: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700' },
  };
  const c = colors[accentColor] || colors.blue;

  const toggleSelect = (idx: number) => {
    if (disabledIndices.includes(idx)) return;
    if (selected.includes(idx)) {
      setSelected(selected.filter(s => s !== idx));
    } else if (selected.length < selectionCount) {
      setSelected([...selected, idx]);
    } else {
      setSelected([idx]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with transitioning gradient */}
      <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 text-white px-4 h-14 flex items-center sticky top-0 z-40 shadow-md">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 active:bg-white/20 rounded-full transition-colors z-10 shrink-0"
          title="Back to Matches"
          aria-label="Back to Matches"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center px-14 pointer-events-none">
          <h2 className="text-lg font-bold tracking-tight truncate text-center">{title}</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>

        <div className="flex items-center gap-2">
          {Array.from({ length: selectionCount }).map((_, i) => (
            <div
              key={i}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                selected[i] !== undefined ? `${c.bg} text-white` : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-400'
              }`}
            >
              {selected[i] !== undefined ? badgeLabels?.[i] || '✓' : badgeLabels?.[i] || i + 1}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-slate-800">
          {players.map((player) => {
            const isSelected = selected.includes(player.idx);
            const isDisabled = disabledIndices.includes(player.idx);
            const selectionOrder = selected.indexOf(player.idx);
            const isRetiredHurt = player.isRetiredHurt;
            return (
              <button
                key={player.idx}
                onClick={() => toggleSelect(player.idx)}
                disabled={isDisabled}
                className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-slate-950/40'
                    : isSelected
                    ? `${c.bgLight} dark:bg-slate-800 ${c.border} border-l-4`
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      isDisabled
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                        : isSelected
                        ? `${c.bg} text-white`
                        : isRetiredHurt
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                    }`}
                  >
                    {isSelected ? selectionOrder + 1 : player.idx + 1}
                  </div>
                  <div className="text-left">
                    <div
                      className={`text-sm font-semibold ${
                        isDisabled
                          ? 'text-gray-400 dark:text-slate-500'
                          : isSelected
                          ? c.text
                          : isRetiredHurt
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-800 dark:text-slate-100'
                      }`}
                    >
                      {player.name}
                    </div>
                    {player.subtitle && <div className="text-xs text-gray-400 dark:text-slate-400">{player.subtitle}</div>}
                    {isDisabled && isRetiredHurt && <div className="text-xs text-amber-500 dark:text-amber-400 font-medium">Retired out (Unavailable immediately)</div>}
                    {isDisabled && !isRetiredHurt && <div className="text-xs text-red-400 dark:text-red-400 font-medium">Just bowled</div>}
                    {!isDisabled && isRetiredHurt && <div className="text-xs text-amber-500 dark:text-amber-400 font-medium">Retired out - can return</div>}
                  </div>
                </div>
                {isSelected && (
                  <div className={`px-2.5 py-1 rounded-full ${c.bg}`}>
                    <span className="text-white text-xs font-bold">{badgeLabels?.[selectionOrder] || '✓'}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => selected.length === selectionCount && onSelect(selected)}
          disabled={selected.length !== selectionCount}
          className={`w-full py-3.5 rounded-xl font-bold text-base shadow-lg text-white disabled:opacity-50 ${c.bg}`}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
