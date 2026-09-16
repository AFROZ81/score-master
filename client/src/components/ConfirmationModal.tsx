import React from 'react';
import { AlertTriangle, HelpCircle, Trash2, Undo2, X } from 'lucide-react';

export type ConfirmationType = 'danger' | 'warning' | 'info';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title = 'Confirmation',
  message,
  confirmText = 'Yes',
  cancelText = 'No',
  type = 'warning',
  icon,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      headerBg: 'bg-red-100',
      iconColor: 'text-red-600',
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
      defaultIcon: <Trash2 className="w-8 h-8 text-red-600" />,
    },
    warning: {
      headerBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
      defaultIcon: <AlertTriangle className="w-8 h-8 text-amber-600" />,
    },
    info: {
      headerBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
      defaultIcon: <HelpCircle className="w-8 h-8 text-blue-600" />,
    },
  }[type];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative transform transition-all animate-scale-in border border-gray-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-5">
          <div
            className={`w-14 h-14 ${typeConfig.headerBg} dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner`}
          >
            {icon || typeConfig.defaultIcon}
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm ${typeConfig.confirmBtn} shadow-md active:scale-95 transition-all cursor-pointer`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
