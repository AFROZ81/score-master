import { useState } from 'react';
import { Team } from '../types';
import CustomSelect from './CustomSelect';

interface TossPageProps {
  team1: Team;
  team2: Team;
  onTossComplete: (winner: string, decision: string) => void;
  onBack?: () => void;
}

export default function TossPage({ team1, team2, onTossComplete, onBack }: TossPageProps) {
  const [phase, setPhase] = useState<'flip' | 'select'>('flip');
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [tossWinner, setTossWinner] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<string>('');

  const handleFlipCoin = () => {
    if (isFlipping) return;

    setIsFlipping(true);

    // Simulate coin flip with animation
    setTimeout(() => {
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinResult(result);
      setIsFlipping(false);
      setPhase('select');
    }, 2000);
  };

  const handleProceed = () => {
    if (tossWinner && tossDecision) {
      onTossComplete(tossWinner, tossDecision);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      {/* Standard uniform top header bar */}
      <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 text-white px-4 h-14 flex items-center justify-center sticky top-0 z-40 shadow-md">
        <h2 className="text-lg font-bold tracking-tight truncate text-center">Coin Toss</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Subheader */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">{team1.name} vs {team2.name}</h1>
            <p className="text-gray-600 dark:text-slate-400">
              {phase === 'flip' && 'Click the coin to flip'}
              {phase === 'select' && 'Select toss winner and decision'}
            </p>
          </div>

        {/* Coin */}
        <div className="flex justify-center mb-8">
          <div
            onClick={handleFlipCoin}
            className={`relative w-48 h-48 cursor-pointer ${isFlipping ? 'animate-coin-flip' : ''}`}
            style={{ perspective: '1000px' }}
          >
            <div
              className={`relative w-full h-full transition-transform duration-1000 ${
                coinResult === 'tails' ? 'rotate-y-180' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipping ? 'rotateY(1800deg)' : coinResult === 'tails' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: isFlipping ? 'transform 2s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'transform 1s'
              }}
            >
              {/* Heads */}
              <div
                className="absolute inset-0 rounded-full bg-linear-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-2xl flex items-center justify-center border-8 border-yellow-300"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-center">
                  <div className="text-6xl mb-2">👑</div>
                  <div className="text-yellow-900 font-bold text-lg">HEADS</div>
                </div>
              </div>

              {/* Tails */}
              <div
                className="absolute inset-0 rounded-full bg-linear-to-br from-gray-400 via-gray-500 to-gray-600 shadow-2xl flex items-center justify-center border-8 border-gray-300"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="text-center">
                  <div className="text-6xl mb-2">🏏</div>
                  <div className="text-gray-900 font-bold text-lg">TAILS</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coin Result */}
        {coinResult && phase === 'select' && (
          <div className="text-center mb-6">
            <div className="inline-block px-6 py-3 bg-white dark:bg-slate-900 rounded-full shadow-lg border border-gray-100 dark:border-slate-800">
              <span className="text-xl font-bold text-gray-800 dark:text-slate-100">
                It's {coinResult === 'heads' ? 'HEADS' : 'TAILS'}!
              </span>
            </div>
          </div>
        )}

        {/* Selection Form */}
        {phase === 'select' && (
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-6">
            {/* Who Won Toss */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Who won the toss?
              </label>
              <CustomSelect
                placeholder="Select team"
                value={tossWinner}
                onChange={(val) => setTossWinner(val)}
                options={[
                  { value: team1.id, label: team1.name },
                  { value: team2.id, label: team2.name },
                ]}
              />
            </div>

            {/* What Did They Choose */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                What did they choose?
              </label>
              <CustomSelect
                placeholder="Select decision"
                value={tossDecision}
                onChange={(val) => setTossDecision(val)}
                options={[
                  { value: 'bat', label: 'Bat' },
                  { value: 'bowl', label: 'Bowl' },
                ]}
              />
            </div>

            {/* Proceed Button */}
            <button
              onClick={handleProceed}
              disabled={!tossWinner || !tossDecision}
              className="w-full py-4 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Proceed to Scoring
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
