import { Sparkles, LogIn, Trophy, Shield, Flame } from 'lucide-react';

interface HeroPageProps {
  onNavigateAuth: () => void;
}

export default function HeroPage({ onNavigateAuth }: HeroPageProps) {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-blue-950 to-slate-950 text-white flex flex-col justify-between relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-28 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar - Only keep Register/Login button at top-right */}
      <header className="px-5 pt-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20 text-xl border border-white/20">
            🏏
          </div>
          <div>
            <span className="font-black text-base tracking-tight bg-linear-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent block leading-tight">
              ScoreMaster
            </span>
            <span className="text-[10px] text-blue-300/80 font-semibold tracking-wider uppercase">
              Our Game. Our Name.
            </span>
          </div>
        </div>

        {/* Top-Right Register / Login CTA (Only Navigation Button on Hero Page) */}
        <button
          onClick={onNavigateAuth}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 border border-blue-400/40 text-white text-xs font-bold transition-all shadow-md shadow-blue-900/40 backdrop-blur-md"
        >
          <LogIn size={13} className="text-blue-200" />
          <span>Register / Login</span>
        </button>
      </header>

      {/* Main Hero Content - Intent & Vision Focused */}
      <div className="px-5 py-2 flex-1 flex flex-col justify-center text-center z-10 max-w-md mx-auto w-full">
        {/* Purpose Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200 text-xs font-semibold mx-auto mb-5 shadow-sm backdrop-blur-sm">
          <Sparkles size={13} className="text-amber-400 animate-pulse" />
          <span>Elevating The Cricketing Experience</span>
        </div>

        {/* Core Intention Headline */}
        <h1 className="text-3xl font-black tracking-tight leading-tight mb-3">
          Every Ball Counts. <br />
          <span className="bg-linear-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
            Every Player Matters.
          </span>
        </h1>

        {/* Mission Statement */}
        <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto mb-6 leading-relaxed">
          ScoreMaster bridges the gap between turf passion and individual recognition. From neighborhood rivalries to thrilling encounters, giving our players the stadium-grade dignity, live thrill, and permanent legacy they deserve.
        </p>

        {/* Purpose Pillars: Conveying the "Why" behind the platform */}
        <div className="space-y-3 mb-6 text-left">
          {/* Pillar 1: Match Day Integrity */}
          <div className="bg-white/4 hover:bg-white/[0.07] border border-white/10 backdrop-blur-md rounded-2xl p-3.5 transition-all flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
              <Flame size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-white mb-0.5 flex items-center gap-1.5">
                Match Day Thrill & Fair Play
              </h3>
              <p className="text-[11px] text-slate-300 leading-normal">
                Bringing real-time excitement and absolute scoring integrity to every ball. No missed runs or disputed decisions - just pure cricket drama captured ball by ball.
              </p>
            </div>
          </div>

          {/* Pillar 2: Career & Legacy */}
          <div className="bg-white/4 hover:bg-white/[0.07] border border-white/10 backdrop-blur-md rounded-2xl p-3.5 transition-all flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Trophy size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-white mb-0.5 flex items-center gap-1.5">
                Player Legacy & Milestones
              </h3>
              <p className="text-[11px] text-slate-300 leading-normal">
                Every blistering fifty, maiden over, and game-saving catch is etched into your permanent career profile. Build an athletic portfolio you can look back on with pride.
              </p>
            </div>
          </div>

          {/* Pillar 3: Community & Identity */}
          <div className="bg-white/4 hover:bg-white/[0.07] border border-white/10 backdrop-blur-md rounded-2xl p-3.5 transition-all flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
              <Shield size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-white mb-0.5 flex items-center gap-1.5">
                Game Spirit & Celebratory Moments
              </h3>
              <p className="text-[11px] text-slate-300 leading-normal">
                Celebrate the moments, enjoy the victories, and keep the spirit of game alive with every boundary, wicket and run.
              </p>
            </div>
          </div>
        </div>

        {/* Subtle Guidance Note (No Extra Navigation Buttons) */}
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl py-2 px-3 text-center">
          <p className="text-[11px] text-blue-200 font-medium">
            Join the fun — tap "Register / Login" at top-right to enter the application.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-[11px] text-slate-400 border-t border-white/10 z-10">
        Built with 🫶 by Afroz & Vivek for the Love of Cricket
      </footer>
    </div>
  );
}
