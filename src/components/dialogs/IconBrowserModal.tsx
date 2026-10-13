import { useMemo, useState } from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { icons as lucideIcons } from 'lucide-react';
import {
  siAnsible, siApple, siBlender, siDavinciresolve, siDiscord, siDocker, siFigma, siGit, siGithub,
  siGooglechrome, siKubernetes, siLinux, siNotion, siObsstudio, siReact, siReddit, siSlack, siSpotify,
  siSteam, siTelegram, siTerraform, siTwitch, siX, siYoutube, siZoom,
} from 'simple-icons';
import { Modal } from './Modal';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { svgTextToIcon } from '@/utils/ingestion';

const BRANDS = [
  siAnsible, siApple, siBlender, siDavinciresolve, siDiscord, siDocker, siFigma, siGit, siGithub,
  siGooglechrome, siKubernetes, siLinux, siNotion, siObsstudio, siReact, siReddit, siSlack, siSpotify,
  siSteam, siTelegram, siTerraform, siTwitch, siX, siYoutube, siZoom,
];

const LUCIDE_NAMES = Object.keys(lucideIcons);
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export function IconBrowserModal() {
  const [tab, setTab] = useState<'lucide' | 'brands'>('lucide');
  const [q, setQ] = useState('');
  const { openDialog, toast } = useUIStore();
  const addIcons = useProjectStore((s) => s.addIcons);

  const term = q.trim().toLowerCase();
  const lucide = useMemo(
    () => LUCIDE_NAMES.filter((n) => !term || kebab(n).includes(term)).slice(0, 120),
    [term],
  );
  const brands = useMemo(() => BRANDS.filter((b) => !term || b.title.toLowerCase().includes(term)), [term]);

  const add = (name: string, svg: string) => {
    try {
      addIcons([svgTextToIcon(svg, name)]);
      toast('success', `Added ${name}`);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not add icon');
    }
  };

  const addLucide = (n: string) => {
    const Cmp = lucideIcons[n as keyof typeof lucideIcons];
    add(kebab(n), renderToStaticMarkup(createElement(Cmp, { size: 24 })));
  };

  return (
    <Modal title="Icon browser" onClose={() => openDialog(null)}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(['lucide', 'brands'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} className={`rounded-md border px-3 py-1 text-xs ${tab === t ? 'border-sky-400 text-sky-200' : 'border-slate-700 text-slate-300'}`}>
              {t === 'lucide' ? 'Lucide (utilities)' : 'Brands (Simple Icons)'}
            </button>
          ))}
          <input autoFocus type="search" placeholder="Search icons…" aria-label="Search icons" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" />
        </div>
        <div className="grid max-h-[55vh] grid-cols-4 gap-2 overflow-auto sm:grid-cols-6">
          {tab === 'lucide'
            ? lucide.map((n) => {
                const Cmp = lucideIcons[n as keyof typeof lucideIcons];
                return (
                  <button key={n} type="button" title={kebab(n)} aria-label={`Add ${kebab(n)}`} onClick={() => addLucide(n)} className="flex flex-col items-center gap-1 rounded-md border border-slate-800 p-2 text-slate-200 hover:border-sky-400">
                    <Cmp size={24} />
                    <span className="w-full truncate text-center text-[10px] text-slate-400">{kebab(n)}</span>
                  </button>
                );
              })
            : brands.map((b) => (
                <button key={b.slug} type="button" aria-label={`Add ${b.title}`} onClick={() => add(b.slug, b.svg)} className="flex flex-col items-center gap-1 rounded-md border border-slate-800 p-2 text-slate-200 hover:border-sky-400">
                  <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor" aria-hidden><path d={b.path} /></svg>
                  <span className="w-full truncate text-center text-[10px] text-slate-400">{b.title}</span>
                </button>
              ))}
        </div>
      </div>
    </Modal>
  );
}
