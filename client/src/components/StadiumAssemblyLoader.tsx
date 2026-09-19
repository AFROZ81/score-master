import { useEffect, useState } from 'react';

interface StadiumAssemblyLoaderProps {
  mode: 'login' | 'register';
  playerName?: string;
  onComplete: () => void;
}

export default function StadiumAssemblyLoader({ mode, playerName, onComplete }: StadiumAssemblyLoaderProps) {
  // Step 1: 'ground'  -> Green Outfield turf tilted in 3D perspective (0ms - 800ms)
  // Step 2: 'pitch'   -> Brown pitch strip & crease lines slide on top (800ms - 1600ms)
  // Step 3: 'lights'  -> 3D Floodlight towers turn on with glowing light beams (1600ms - 2400ms)
  // Step 4: 'audience'-> Overlapping 3D audience waving placards (2400ms - 3600ms)
  // Step 5: 'fade'    -> Smooth fade out transition to Profile page (3600ms - 4200ms)
  const [step, setStep] = useState<'ground' | 'pitch' | 'lights' | 'audience' | 'fade'>('ground');

  useEffect(() => {
    const t1 = setTimeout(() => setStep('pitch'), 800);
    const t2 = setTimeout(() => setStep('lights'), 1600);
    const t3 = setTimeout(() => setStep('audience'), 2400);

    const t4 = setTimeout(() => {
      setStep('fade');
      onComplete();
    }, 3600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  const showPitch = step === 'pitch' || step === 'lights' || step === 'audience' || step === 'fade';
  const showLights = step === 'lights' || step === 'audience' || step === 'fade';
  const showAudience = step === 'audience' || step === 'fade';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden transition-opacity duration-600 ease-in-out select-none ${
        step === 'fade' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Stadium Glow */}
      <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Main Integrated 3D Stadium Stage (Tighter cohesive layout) */}
      <div className="relative w-[340px] sm:w-[380px] h-[320px] flex items-center justify-center perspective-1000">

        {/* ════════════ 3D STADIUM GROUND & PITCH CONTAINER ════════════ */}
        <div className="relative w-full h-full flex items-center justify-center transform-gpu rotate-x-55 rotate-z-[-10deg]">

          {/* STEP 1: 3D GREEN OUTFIELD GROUND */}
          <div
            className={`w-[280px] sm:w-[310px] h-[200px] bg-linear-to-br from-emerald-500 via-emerald-700 to-emerald-950 rounded-[50%] border-4 border-emerald-400/60 shadow-[0_25px_45px_rgba(0,0,0,0.8),0_0_35px_rgba(16,185,129,0.3)] transition-all duration-700 ease-out transform-gpu overflow-hidden relative ${
              step !== 'ground' || showPitch ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            {/* 3D Lawn Stripe Shader Patterns */}
            <div className="absolute inset-0 flex rotate-45">
              <div className="flex-1 bg-emerald-400/15" />
              <div className="flex-1 bg-transparent" />
              <div className="flex-1 bg-emerald-400/15" />
              <div className="flex-1 bg-transparent" />
              <div className="flex-1 bg-emerald-400/15" />
            </div>
            {/* Boundary Line */}
            <div className="absolute inset-3 border-2 border-dashed border-white/50 rounded-[50%]" />
          </div>

          {/* STEP 2: 3D CRICKET PITCH */}
          <div
            className={`absolute w-[48px] sm:w-[54px] h-[150px] bg-linear-to-b from-amber-200 via-amber-300 to-amber-600 border-x-2 border-amber-800/50 shadow-2xl rounded-xs transition-all duration-700 ease-out transform-gpu ${
              showPitch ? 'opacity-100 translate-z-4 scale-100' : 'opacity-0 translate-z-[-30px] scale-90'
            }`}
          >
            {/* Crease White Lines */}
            <div className="absolute top-5 left-1 right-1 h-0.5 bg-white shadow-xs" />
            <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/70 shadow-xs" />

            <div className="absolute bottom-5 left-1 right-1 h-0.5 bg-white shadow-xs" />
            <div className="absolute bottom-2 left-2 right-2 h-0.5 bg-white/70 shadow-xs" />

            {/* Wickets */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
              <div className="w-1 h-3.5 bg-amber-900 rounded-t-xs shadow-md" />
              <div className="w-1 h-3.5 bg-amber-900 rounded-t-xs shadow-md" />
              <div className="w-1 h-3.5 bg-amber-900 rounded-t-xs shadow-md" />
              <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-amber-200 rounded-full" />
            </div>

            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
              <div className="w-1 h-3.5 bg-amber-900 rounded-t-xs shadow-md" />
              <div className="w-1 h-3.5 bg-amber-900 rounded-t-xs shadow-md" />
              <div className="w-1 h-3.5 bg-amber-900 rounded-t-xs shadow-md" />
              <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-amber-200 rounded-full" />
            </div>
          </div>

          {/* STEP 3: 3D FLOODLIGHTS (Attached directly to pitch/ground corners) */}
          <div
            className={`absolute inset-0 pointer-events-none transition-all duration-700 ease-out transform-gpu ${
              showLights ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            {/* Top Left Integrated Floodlight Tower */}
            <div className="absolute top-4 left-6 flex flex-col items-center rotate-y-20 transform-gpu z-20">
              <div className="w-12 h-6 bg-slate-800 border-2 border-amber-300/80 rounded-md grid grid-cols-4 p-0.5 gap-0.5 shadow-[0_0_20px_rgba(252,211,77,0.9)]">
                <div className="bg-amber-100 rounded-full animate-pulse" />
                <div className="bg-amber-100 rounded-full animate-pulse" />
                <div className="bg-amber-100 rounded-full animate-pulse" />
                <div className="bg-amber-100 rounded-full animate-pulse" />
              </div>
              <div className="w-1.5 h-16 bg-linear-to-b from-slate-700 to-slate-900 border-x border-slate-600" />
              <div className="absolute top-4 left-4 w-32 h-60 bg-linear-to-b from-amber-300/30 via-blue-500/15 to-transparent blur-lg rotate-30 transform origin-top-left" />
            </div>

            {/* Top Right Integrated Floodlight Tower */}
            <div className="absolute top-4 right-6 flex flex-col items-center -rotate-y-20 transform-gpu z-20">
              <div className="w-12 h-6 bg-slate-800 border-2 border-amber-300/80 rounded-md grid grid-cols-4 p-0.5 gap-0.5 shadow-[0_0_20px_rgba(252,211,77,0.9)]">
                <div className="bg-amber-100 rounded-full animate-pulse" />
                <div className="bg-amber-100 rounded-full animate-pulse" />
                <div className="bg-amber-100 rounded-full animate-pulse" />
                <div className="bg-amber-100 rounded-full animate-pulse" />
              </div>
              <div className="w-1.5 h-16 bg-linear-to-b from-slate-700 to-slate-900 border-x border-slate-600" />
              <div className="absolute top-4 right-4 w-32 h-60 bg-linear-to-b from-amber-300/30 via-cyan-500/15 to-transparent blur-lg -rotate-30 transform origin-top-right" />
            </div>
          </div>

        </div>

        {/* ════════════ STEP 4: OVERLAPPING AUDIENCE (Shifted upwards to overlap green turf) ════════════ */}
        <div
          className={`absolute bottom-16 inset-x-0 h-28 flex items-end justify-center pointer-events-none transition-all duration-700 ease-out transform-gpu z-30 ${
            showAudience ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {/* Back Audience Row */}
          <div className="absolute bottom-5 flex items-end -space-x-1 opacity-75">
            <div className="flex flex-col items-center animate-bounce [animation-delay:0ms]">
              <div className="w-3.5 h-3.5 bg-indigo-300 rounded-full mb-0.5 shadow-sm" />
              <div className="w-6.5 h-9 bg-indigo-600 rounded-t-lg" />
            </div>
            <div className="flex flex-col items-center animate-bounce [animation-delay:150ms]">
              <div className="w-3.5 h-3.5 bg-rose-300 rounded-full mb-0.5 shadow-sm" />
              <div className="w-6.5 h-10 bg-rose-600 rounded-t-lg" />
            </div>
            <div className="flex flex-col items-center animate-bounce [animation-delay:300ms]">
              <div className="w-3.5 h-3.5 bg-amber-200 rounded-full mb-0.5 shadow-sm" />
              <div className="w-6.5 h-11 bg-amber-500 rounded-t-lg" />
            </div>
            <div className="flex flex-col items-center animate-bounce [animation-delay:100ms]">
              <div className="w-3.5 h-3.5 bg-cyan-300 rounded-full mb-0.5 shadow-sm" />
              <div className="w-6.5 h-9 bg-cyan-600 rounded-t-lg" />
            </div>
            <div className="flex flex-col items-center animate-bounce [animation-delay:250ms]">
              <div className="w-3.5 h-3.5 bg-emerald-300 rounded-full mb-0.5 shadow-sm" />
              <div className="w-6.5 h-11 bg-emerald-600 rounded-t-lg" />
            </div>
          </div>

          {/* Front Audience Row: 1(4) -> 2(empty) -> 3(OUT!) -> 4(empty) -> 5(6) */}
          <div className="relative z-10 flex items-end -space-x-1.5">

            {/* Person 1: Holding "4" Placard */}
            <div className="relative flex flex-col items-center animate-bounce [animation-delay:0ms]">
              <div className="absolute -left-3.5 top-0 flex flex-col items-center rotate-[-12deg] z-20">
                <div className="px-1.5 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded-xs shadow-lg border border-white/90">
                  4
                </div>
                <div className="w-1 h-3.5 bg-amber-700" />
                <div className="w-2 h-2 bg-amber-200 rounded-full -mt-1" />
              </div>
              <div className="w-4.5 h-4.5 bg-amber-200 rounded-full z-10 shadow-sm" />
              <div className="w-7.5 h-11 bg-blue-500 rounded-t-xl shadow-lg border-t border-white/20" />
            </div>

            {/* Person 2: Empty Hands (Cheering Raised Arms) */}
            <div className="relative flex flex-col items-center animate-bounce [animation-delay:200ms]">
              <div className="absolute -left-2 top-2 w-2 h-3.5 border-t-2 border-l-2 border-amber-200 rounded-tl-sm rotate-[-25deg]" />
              <div className="absolute -right-2 top-2 w-2 h-3.5 border-t-2 border-r-2 border-amber-200 rounded-tr-sm rotate-[25deg]" />
              <div className="w-4.5 h-4.5 bg-amber-300 rounded-full z-10 shadow-sm" />
              <div className="w-7.5 h-12 bg-amber-400 rounded-t-xl shadow-lg border-t border-white/20" />
            </div>

            {/* Person 3: Holding "OUT!" Placard */}
            <div className="relative flex flex-col items-center animate-bounce [animation-delay:100ms]">
              <div className="absolute -left-3 top-0 flex flex-col items-center rotate-[-6deg] z-20">
                <div className="px-1.5 py-0.5 bg-rose-600 text-white font-black text-[9px] rounded-xs shadow-lg border border-white/90 uppercase tracking-tight">
                  W
                </div>
                <div className="w-1 h-3.5 bg-amber-800" />
                <div className="w-2 h-2 bg-amber-200 rounded-full -mt-1" />
              </div>
              <div className="w-4.5 h-4.5 bg-emerald-200 rounded-full z-10 shadow-sm" />
              <div className="w-7.5 h-10.5 bg-emerald-500 rounded-t-xl shadow-lg border-t border-white/20" />
            </div>

            {/* Person 4: Empty Hands (Cheering Raised Arms) */}
            <div className="relative flex flex-col items-center animate-bounce [animation-delay:300ms]">
              <div className="absolute -left-2 top-2 w-2 h-3.5 border-t-2 border-l-2 border-red-200 rounded-tl-sm rotate-[-20deg]" />
              <div className="absolute -right-2 top-2 w-2 h-3.5 border-t-2 border-r-2 border-red-200 rounded-tr-sm rotate-[20deg]" />
              <div className="w-4.5 h-4.5 bg-amber-200 rounded-full z-10 shadow-sm" />
              <div className="w-7.5 h-12 bg-red-500 rounded-t-xl shadow-lg border-t border-white/20" />
            </div>

            {/* Person 5: Holding "6" Placard */}
            <div className="relative flex flex-col items-center animate-bounce [animation-delay:150ms]">
              <div className="absolute -right-3.5 top-0 flex flex-col items-center rotate-[12deg] z-20">
                <div className="px-1.5 py-0.5 bg-purple-600 text-white font-black text-[10px] rounded-xs shadow-lg border border-white/90">
                  6
                </div>
                <div className="w-1 h-3.5 bg-amber-800" />
                <div className="w-2 h-2 bg-amber-300 rounded-full -mt-1" />
              </div>
              <div className="w-4.5 h-4.5 bg-amber-300 rounded-full z-10 shadow-sm" />
              <div className="w-7.5 h-11 bg-purple-500 rounded-t-xl shadow-lg border-t border-white/20" />
            </div>

          </div>
        </div>

      </div>

      {/* ONLY Welcome Message Below Stadium */}
      <div className="z-10 text-center px-4 transition-all duration-500">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-amber-300 to-emerald-400">
            Welcome to ScoreMaster! 🏏
          </span>
        </h2>
      </div>
    </div>
  );
}
