import { useState } from 'react';
import { Download, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
import { useExportStore } from '@/store/exportStore';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import type { AuditEntry, ExportTarget } from '@/types';
import { downloadBlob } from '@/utils/bundle';
import { runExport } from '@/utils/renderClient';
import { sanitizeFileName } from '@/utils/style';

const TARGETS: { value: ExportTarget; label: string; hint: string }[] = [
  { value: 'logitech', label: 'Logitech MX Creative Keypad', hint: '288×288 PNG + SVG, every file audited ≤ 150 KB' },
  { value: 'elgato', label: 'Elgato Stream Deck', hint: '144×144 and 288×288 (@2x) PNGs' },
  { value: 'loupedeck', label: 'Loupedeck', hint: '90×90 and 120×120 PNGs + SVG' },
  { value: 'universal', label: 'Universal / custom', hint: 'Custom square PNG size (64–1024)' },
];

export function ExportDialog() {
  const { target, customSize, pattern, setTarget, setCustomSize, setPattern } = useExportStore();
  const project = useProjectStore((s) => s.currentProject);
  const { openDialog, toast } = useUIStore();
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const out = await runExport(project, target, customSize, pattern);
      setAudit(out.audit);
      downloadBlob(new Blob([out.zip as BlobPart], { type: 'application/zip' }), `${sanitizeFileName(project.title)}-${target}.zip`);
      const bad = out.audit.filter((a) => !a.ok).length;
      toast(bad ? 'error' : 'success', bad ? `${bad} file(s) exceed the size limit` : `Exported ${out.audit.length} files`);
    } catch (e) {
      toast('error', `Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Export package" onClose={() => openDialog(null)}>
      <div className="flex flex-col gap-4 text-sm text-slate-200">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs text-slate-400">Hardware target</legend>
          {TARGETS.map((t) => (
            <label key={t.value} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 ${target === t.value ? 'border-sky-400 bg-sky-400/10' : 'border-slate-700'}`}>
              <input type="radio" name="target" checked={target === t.value} onChange={() => setTarget(t.value)} className="mt-1" />
              <span>
                <span className="block font-medium">{t.label}</span>
                <span className="text-xs text-slate-400">{t.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {target === 'universal' && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Size (px)
            <input type="number" min={64} max={1024} value={customSize} onChange={(e) => setCustomSize(Number(e.target.value))} className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100" />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          File naming pattern
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-slate-100" />
          <span>Tokens: {'{index} {keyName} {state}'}</span>
        </label>
        <button type="button" disabled={busy || !project.icons.length} onClick={run} className="flex items-center justify-center gap-2 rounded-md bg-sky-500 px-3 py-2 font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50">
          <Download size={16} /> {busy ? 'Exporting…' : 'Export ZIP'}
        </button>
        {!project.icons.length && <p className="text-xs text-amber-300">Add at least one icon to export.</p>}
        {audit && (
          <div aria-label="Export audit" data-testid="export-audit" className="max-h-48 overflow-auto rounded-md border border-slate-700 text-xs">
            {audit.map((a) => (
              <div key={a.file} className="flex items-center justify-between gap-2 border-b border-slate-800 px-2 py-1">
                <span className="truncate font-mono">{a.file}</span>
                <span className="flex items-center gap-1 whitespace-nowrap" data-bytes={a.bytes}>
                  {(a.bytes / 1024).toFixed(1)} KB {a.quantized && '(8-bit)'}
                  {a.ok ? <ShieldCheck size={12} className="text-emerald-400" /> : <ShieldAlert size={12} className="text-red-400" />}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
