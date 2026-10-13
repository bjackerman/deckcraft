import { Suspense, lazy, useEffect, useState } from 'react';
import { KeyGrid } from '@/components/canvas/KeyGrid';
import { ExportDialog } from '@/components/dialogs/ExportDialog';
import { ProjectManagerModal } from '@/components/dialogs/ProjectManagerModal';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastContainer } from '@/components/layout/ToastContainer';
import { loadCurrentProject } from '@/db';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useProjectAutoSave } from '@/hooks/useProjectAutoSave';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { importFiles } from '@/utils/importFlow';

const IconBrowserModal = lazy(() => import('@/components/dialogs/IconBrowserModal').then((m) => ({ default: m.IconBrowserModal })));

function Workspace() {
  const dialog = useUIStore((s) => s.dialog);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  useKeyboardShortcuts();
  useProjectAutoSave();

  useEffect(() => {
    loadCurrentProject()
      .then((p) => p && useProjectStore.getState().setProject(p))
      .catch(() => useUIStore.getState().toast('error', 'Could not load saved project'))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="p-8 text-slate-400">Loading…</div>;
  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        setDragging(false);
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          void importFiles(e.dataTransfer.files);
        }
      }}
    >
      <Header />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col" aria-label="Key grid">
          <KeyGrid />
          <p className="px-4 pb-2 text-center text-xs text-slate-500">Drop SVG / PNG / WebP / JPG files anywhere, or paste with Ctrl+V. Shift/Ctrl+click or drag a marquee to select.</p>
        </main>
        <Sidebar />
      </div>
      {dragging && <div className="pointer-events-none fixed inset-0 z-30 border-4 border-dashed border-sky-400 bg-sky-400/10" />}
      {dialog === 'export' && <ExportDialog />}
      {dialog === 'projects' && <ProjectManagerModal />}
      {dialog === 'browser' && (
        <Suspense fallback={null}>
          <IconBrowserModal />
        </Suspense>
      )}
      <ToastContainer />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Workspace />
    </ErrorBoundary>
  );
}
