import { ColorField, Segmented, Slider } from './fields';
import { useStyleEditor } from './useStyleEditor';
import type { BackgroundType, ShapeGeometry } from '@/types';

const SHAPES: { value: ShapeGeometry; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'squircle', label: 'Squircle' },
  { value: 'circle', label: 'Circle' },
  { value: 'hexagon', label: 'Hexagon' },
];
const FILLS: { value: BackgroundType; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'linear-gradient', label: 'Linear' },
  { value: 'radial-gradient', label: 'Radial' },
  { value: 'glass', label: 'Glass' },
  { value: 'transparent', label: 'None' },
];

export function BackgroundControls() {
  const { style, update } = useStyleEditor();
  const bg = style.background;
  const set = (patch: Partial<typeof bg>, key: string) => update({ background: patch }, `bg-${key}`);
  const gradient = bg.type === 'linear-gradient' || bg.type === 'radial-gradient';
  return (
    <div className="flex flex-col gap-4">
      <Segmented label="Shape" value={bg.shape} options={SHAPES} onChange={(shape) => set({ shape }, 'shape')} />
      {bg.shape === 'rounded' && (
        <Slider label="Corner radius" value={bg.borderRadius} min={0} max={50} suffix="%" onChange={(borderRadius) => set({ borderRadius }, 'radius')} />
      )}
      <Segmented label="Fill" value={bg.type} options={FILLS} onChange={(type) => set({ type }, 'type')} />
      {bg.type !== 'transparent' && <ColorField label="Primary color" value={bg.primaryColor} onChange={(primaryColor) => set({ primaryColor }, 'primary')} />}
      {gradient && (
        <ColorField label="Secondary color" value={bg.secondaryColor ?? bg.primaryColor} onChange={(secondaryColor) => set({ secondaryColor }, 'secondary')} />
      )}
      {bg.type === 'linear-gradient' && (
        <Slider label="Gradient angle" value={bg.gradientAngle} min={0} max={360} suffix="°" onChange={(gradientAngle) => set({ gradientAngle }, 'angle')} />
      )}
      <Slider label="Border width" value={bg.borderWidth} min={0} max={20} suffix="px" onChange={(borderWidth) => set({ borderWidth }, 'bw')} />
      {bg.borderWidth > 0 && <ColorField label="Border color" value={bg.borderColor} onChange={(borderColor) => set({ borderColor }, 'bc')} />}
      <Slider label="Glow / shadow" value={bg.shadowBlur} min={0} max={30} suffix="px" onChange={(shadowBlur) => set({ shadowBlur }, 'sb')} />
      {bg.shadowBlur > 0 && <ColorField label="Shadow color" value={bg.shadowColor} onChange={(shadowColor) => set({ shadowColor }, 'sc')} />}
    </div>
  );
}
