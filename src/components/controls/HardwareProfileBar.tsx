import { useProjectStore } from '@/store/projectStore';
import type { HardwareProfileId } from '@/types';
import { HARDWARE_PROFILES } from '@/utils/constants';

export function HardwareProfileBar() {
  const profile = useProjectStore((s) => s.currentProject.hardwareProfile);
  const set = useProjectStore((s) => s.setHardwareProfile);
  return (
    <select
      aria-label="Hardware profile"
      value={profile}
      onChange={(e) => set(e.target.value as HardwareProfileId)}
      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
    >
      {Object.values(HARDWARE_PROFILES).map((p) => (
        <option key={p.id} value={p.id}>
          {p.label} ({p.cols}×{p.rows})
        </option>
      ))}
    </select>
  );
}
