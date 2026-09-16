import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100/80 dark:hover:bg-slate-700/80 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer shadow-xs"
      >
        <div className="truncate pr-2">
          {selectedOption ? (
            <span className="font-medium text-gray-900 dark:text-slate-100 truncate">
              {selectedOption.label}{' '}
              {selectedOption.subtitle && (
                <span className="text-gray-400 dark:text-slate-400 font-normal text-xs ml-1">
                  • {selectedOption.subtitle}
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 dark:text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 animate-in fade-in-50 zoom-in-95 duration-150">
          {options.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-gray-400 dark:text-slate-400 text-center">No options</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-3.5 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-colors ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed bg-gray-50/50 dark:bg-slate-900/50 text-gray-400 dark:text-slate-500'
                      : isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-semibold'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-200'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate">{opt.label}</div>
                    {opt.subtitle && (
                      <div className="text-xs text-gray-400 dark:text-slate-400 font-normal truncate mt-0.5">
                        {opt.subtitle}
                      </div>
                    )}
                  </div>
                  {isSelected && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0 ml-1" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
