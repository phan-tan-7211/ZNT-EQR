import { describe, expect, it } from 'vitest';
import { commitExtend, commitTrim } from '@/features/facility-map/sketch/modify/trimExtend';
import { arcPoint } from '@/features/facility-map/sketch/core/geometry';
import type { ArcEntity, LineEntity, SketchEntity } from '@/features/facility-map/sketch/core/types';

const style = { color: '#000000', lineWidth: 1 };
const A = (s: number, e: number, cw: boolean): ArcEntity => ({
  ...style, id: 'arc', type: 'arc', cx: 0, cy: 0, r: 10, startAngleDeg: s, endAngleDeg: e, clockwise: cw,
});
const L = (id: string, x1: number, y1: number, x2: number, y2: number): LineEntity => ({ ...style, id, type: 'line', x1, y1, x2, y2 });
const at = (deg: number, r = 10) => ({ x: Math.cos((deg * Math.PI) / 180) * r, y: Math.sin((deg * Math.PI) / 180) * r });

// Sorted, de-duplicated set of arc endpoints so CW/CCW storage compare equally.
const arcsAsPointSets = (entities: SketchEntity[]) =>
  entities
    .filter((e): e is ArcEntity => e.type === 'arc')
    .map((e) => {
      const p = [arcPoint(e, e.startAngleDeg), arcPoint(e, e.endAngleDeg)].map((q) => `${q.x.toFixed(4)},${q.y.toFixed(4)}`).sort();
      return p.join('|');
    })
    .sort();

describe('arc trim / extend across the 0°/360° wrap', () => {
  // Vertical line x=9 crosses the r=10 circle at ±25.84°.
  const cut = L('cut', 9, -20, 9, 20);
  const hit = (Math.acos(0.9) * 180) / Math.PI;

  it.each([
    ['ccw', A(300, 60, false)],
    ['cw', A(60, 300, true)],
  ])('trims the piece straddling 0° (%s)', (_label, arc) => {
    const out = commitTrim([arc, cut], arc, at(0), () => 'n')!;
    expect(out).not.toBeNull();
    const arcs = out.filter((e): e is ArcEntity => e.type === 'arc');
    expect(arcs).toHaveLength(2);
    const expected = arcsAsPointSets([A(300, 360 - hit, false), A(hit, 60, false)]);
    expect(arcsAsPointSets(arcs)).toEqual(expected);
  });

  it.each([
    ['ccw', A(300, 340, false), 345, 20],
    ['cw', A(340, 300, true), 345, 20],
  ])('extends the end nearest the click across 0° (%s)', (_label, arc, clickDeg, targetDeg) => {
    const boundary = L('b', at(targetDeg, 5).x, at(targetDeg, 5).y, at(targetDeg, 20).x, at(targetDeg, 20).y);
    const out = commitExtend([arc, boundary], arc, at(clickDeg))!;
    expect(out).not.toBeNull();
    const extended = out.find((e) => e.id === 'arc') as ArcEntity;
    const moved = arc.clockwise ? extended.startAngleDeg : extended.endAngleDeg;
    expect(moved).toBeCloseTo(targetDeg, 4);
  });

  it('extends the start backwards across 0°', () => {
    const arc = A(10, 60, false);
    const boundary = L('b', at(340, 5).x, at(340, 5).y, at(340, 20).x, at(340, 20).y);
    const out = commitExtend([arc, boundary], arc, at(15))!;
    const extended = out.find((e) => e.id === 'arc') as ArcEntity;
    expect(extended.startAngleDeg).toBeCloseTo(340, 4);
    expect(extended.endAngleDeg).toBe(60);
  });
});
