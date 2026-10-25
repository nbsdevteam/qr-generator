import { dotPath, eyePath, ringPath } from '../../lib/qr/shapes';
import type { DotShape, FinderEyeShape, FinderFrameShape } from '../../types/design';
import type { ShapeOption } from '../ui/ShapePicker';

/** 3×3 checker of dots so the shape reads at a glance. */
const dotGrid = (shape: DotShape): string => {
  const cells: Array<[number, number]> = [
    [0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [1, 0],
  ];
  return cells.map(([c, r]) => dotPath(shape, 1.5 + c * 7, 1.5 + r * 7, 7, 0.88)).join('');
};

export const DOT_SHAPES: ReadonlyArray<ShapeOption<DotShape>> = [
  { value: 'square', label: 'Square', d: dotGrid('square') },
  { value: 'rounded', label: 'Rounded', d: dotGrid('rounded') },
  { value: 'circle', label: 'Circle', d: dotGrid('circle') },
  { value: 'diamond', label: 'Diamond', d: dotGrid('diamond') },
];

export const FRAME_SHAPES: ReadonlyArray<ShapeOption<FinderFrameShape>> = (['square', 'rounded', 'circle'] as const).map((s) => ({
  value: s,
  label: s === 'square' ? 'Square' : s === 'rounded' ? 'Rounded' : 'Circle',
  d: ringPath(s, 1.5, 1.5, 21, 3),
  evenOdd: true,
}));

export const EYE_SHAPES: ReadonlyArray<ShapeOption<FinderEyeShape>> = (['square', 'rounded', 'circle', 'diamond'] as const).map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
  d: eyePath(s, 5, 5, 14),
}));
