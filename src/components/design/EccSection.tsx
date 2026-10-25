import { ShieldCheck } from 'lucide-react';
import { useDesign } from '../../hooks/useDesign';
import type { ErrorCorrection } from '../../types/design';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';

const LEVELS: Record<ErrorCorrection, string> = {
  L: 'Recovers about 7% damage. Smallest code.',
  M: 'Recovers about 15%. A good default for plain codes.',
  Q: 'Recovers about 25%.',
  H: 'Recovers about 30%. Best with a logo or background image.',
};

export function EccSection({ version }: { version: number | null }) {
  const { design, set } = useDesign();
  return (
    <Section title="Error correction" icon={<ShieldCheck size={17} />} summary={`Level ${design.ecc}${version ? `, version ${version}` : ''}`}>
      <div className="flex flex-col gap-2">
        <Segmented
          value={design.ecc}
          options={(['L', 'M', 'Q', 'H'] as const).map((l) => ({ value: l, label: l }))}
          onChange={(ecc) => set('ecc', ecc)}
        />
        <p className="text-xs text-ink-3">{LEVELS[design.ecc]} Higher levels add more modules.</p>
      </div>
    </Section>
  );
}
