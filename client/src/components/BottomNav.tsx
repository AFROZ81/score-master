import { View } from '../App';
import { Pen, Trophy, Users, User, UserCheck } from 'lucide-react';

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const navItems = [
    { id: 'profile' as View, icon: User, label: 'Profile' },
    { id: 'live' as View, icon: Trophy, label: 'Matches' },
    { id: 'create' as View, icon: Pen, label: 'Score' },
    { id: 'players' as View, icon: UserCheck, label: 'Players' },
    { id: 'teams' as View, icon: Users, label: 'Teams' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shadow-lg z-50 transition-colors duration-300">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
