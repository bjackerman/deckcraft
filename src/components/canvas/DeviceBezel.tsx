import type { ReactNode } from 'react';
import type { HardwareProfileId } from '@/types';

const PALE = 'linear-gradient(145deg,#eceef1 0%,#c9ced6 45%,#aeb4be 100%)';
const GRAPHITE = 'linear-gradient(145deg,#2a2d33 0%,#17191d 100%)';

/** CSS-only hardware frame mockups around the key grid. */
export function DeviceBezel({ profile, enabled, children }: { profile: HardwareProfileId; enabled: boolean; children: ReactNode }) {
  if (!enabled) return <div className="p-2">{children}</div>;
  const logi = profile === 'logitech-mx-keypad';
  return (
    <div
      data-testid="device-bezel"
      className="relative rounded-[28px] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]"
      style={{ background: logi ? PALE : GRAPHITE }}
    >
      <div
        className="rounded-2xl p-3 shadow-[inset_0_3px_10px_rgba(0,0,0,0.7)]"
        style={{ background: logi ? '#23262b' : '#0b0c0f' }}
      >
        {children}
      </div>
      {profile === 'stream-deck-plus' && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-8 flex-1 rounded-md bg-slate-900 shadow-inner" aria-label="Touch strip" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="size-7 rounded-full border border-slate-600 bg-slate-800" />
          ))}
        </div>
      )}
      {profile === 'loupedeck-live' && (
        <div className="mt-3 flex justify-center gap-3" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="size-6 rounded-full border border-slate-600 bg-slate-800" />
          ))}
        </div>
      )}
      {logi && <div className="mt-2 text-center text-[10px] font-medium tracking-[0.3em] text-slate-500">MX CREATIVE KEYPAD</div>}
    </div>
  );
}
