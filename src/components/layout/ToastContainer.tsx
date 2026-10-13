import { X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

export function ToastContainer() {
  const { toasts, dismissToast } = useUIStore();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex max-w-sm items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-lg ${
            t.kind === 'error' ? 'border-red-500/60 bg-red-950 text-red-100' : t.kind === 'success' ? 'border-emerald-500/60 bg-emerald-950 text-emerald-100' : 'border-slate-600 bg-slate-800 text-slate-100'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
