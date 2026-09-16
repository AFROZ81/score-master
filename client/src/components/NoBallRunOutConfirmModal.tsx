interface NoBallRunOutConfirmModalProps {
  isOpen: boolean;
  pendingRuns: number | null;
  onConfirm: () => void;
  onDecline: () => void;
}

export default function NoBallRunOutConfirmModal({
  isOpen,
  pendingRuns,
  onConfirm,
  onDecline,
}: NoBallRunOutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-slate-800">
        <div className="text-center mb-5">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/60 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🏃</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-1">Run Out on No Ball?</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Was there a run-out on this no ball?
            {pendingRuns !== null && pendingRuns > 0 && (
              <span className="block mt-1 font-semibold text-orange-600 dark:text-orange-400">
                {pendingRuns} bat run{pendingRuns > 1 ? 's' : ''} will be credited.
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-transform"
          >
            No Run Out
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-orange-500 text-white active:scale-95 transition-transform"
          >
            Yes, Run Out!
          </button>
        </div>
      </div>
    </div>
  );
}
