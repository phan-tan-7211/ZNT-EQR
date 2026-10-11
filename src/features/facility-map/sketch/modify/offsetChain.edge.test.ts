import { describe, expect, it } from 'vitest';
import { offsetChain } from '@/features/facility-map/sketch/modify/breakOffset';
import { arcPoint } from '@/features/facility-map/sketch/core/geometry';
import type { ArcEntity, LineEntity, SketchEntity, SketchPoint } from '@/features/facility-map/sketch/core/types';

const style = { color: '#000000', lineWidth: 1 };
const L = (id: string, x1: number, y1: number, x2: number, y2: number): LineEntity => ({ ...style, id, type: 'line', x1, y1, x2, y2 });
const A = (id: string, cx: number, cy: number, r: number, s: number, e: number, cw: boolean): ArcEntity => ({
  ...style, id, type: 'arc', cx, cy, r, startAngleDeg: s, endAngleDeg: e, clockwise: cw,
});

const ends = (e: SketchEntity): [SketchPoint, SketchPoint] =>
  e.type === 'line'
    ? [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }]
    : e.type === 'arc'
      ? [arcPoint(e, e.startAngleDeg), arcPoint(e, e.endAngleDeg)]
      : (() => { throw new Error('unexpected'); })();

const near = (a: SketchPoint, b: SketchPoint) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;

const run = (entities: SketchEntity[], clickedId: string, d: number, click: SketchPoint) => {
  let n = 0;
  const clicked = entities.find((e) => e.id === clickedId) as LineEntity | ArcEntity;
  const result = offsetChain(entities, clicked, d, click, () => `o${(n += 1)}`);
  expect(result).not.toBeNull();
  const byId = new Map(result!.chain.segments.map((s, i) => [s.entityId, result!.offsetEntities[i]]));
  // Every offset curve sits exactly d away from its source.
  for (const [id, out] of byId) {
    const src = entities.find((e) => e.id === id)!;
    if (src.type === 'line' && out.type === 'line') {
      const len = Math.hypot(src.x2 - src.x1, src.y2 - src.y1);
      for (const p of ends(out)) {
        const dist = Math.abs((src.x2 - src.x1) * (src.y1 - p.y) - (src.x1 - p.x) * (src.y2 - src.y1)) / len;
        expect(dist).toBeCloseTo(d, 6);
      }
    } else if (src.type === 'arc' && out.type === 'arc') {
      expect(Math.abs(out.r - src.r)).toBeCloseTo(d, 6);
    }
  }
  // Consecutive offset curves meet (one shared endpoint) at every joint.
  const outs = result!.offsetEntities;
  const joints = result!.chain.closed ? outs.length : outs.length - 1;
  for (let i = 0; i < joints; i += 1) {
    const [a0, a1] = ends(outs[i]);
    const [b0, b1] = ends(outs[(i + 1) % outs.length]);
    expect([a0, a1].some((p) => near(p, b0) || near(p, b1))).toBe(true);
  }
  return byId;
};

describe('offsetChain edge cases', () => {
  const bottom = L('bottom', 0, 0, 10, 0);
  const right = L('right', 10, 0, 10, 5);
  const left = L('left', 0, 5, 0, 0);
  const bulgeCcw = A('bulge', 5, 5, 5, 0, 180, false);
  const bulgeCwReversed = A('bulge', 5, 5, 5, 180, 0, true);

  it('arc stored reversed (walked backwards) still grows outward', () => {
    const out = run([bottom, right, bulgeCwReversed, left], 'bottom', 1, { x: 5, y: -5 });
    expect((out.get('bulge') as ArcEntity).r).toBeCloseTo(6, 6);
    expect((out.get('bottom') as LineEntity).y1).toBeCloseTo(-1, 6);
  });

  it('clicking the arc itself (outside) grows the whole profile', () => {
    const out = run([bottom, right, bulgeCcw, left], 'bulge', 1, { x: 5, y: 10.5 });
    expect((out.get('bulge') as ArcEntity).r).toBeCloseTo(6, 6);
    expect((out.get('bottom') as LineEntity).y1).toBeCloseTo(-1, 6);
  });

  it('clicking inside the arc shrinks the whole profile', () => {
    const out = run([bottom, right, bulgeCwReversed, left], 'bulge', 1, { x: 5, y: 8 });
    expect((out.get('bulge') as ArcEntity).r).toBeCloseTo(4, 6);
    expect((out.get('bottom') as LineEntity).y1).toBeCloseTo(1, 6);
  });

  it('open chain line + quarter arc', () => {
    const line = L('line', 0, 0, 10, 0);
    const arc = A('arc', 10, 5, 5, 270, 0, false);
    const out = run([line, arc], 'line', 1, { x: 5, y: -3 });
    expect((out.get('line') as LineEntity).y1).toBeCloseTo(-1, 6);
    expect((out.get('arc') as ArcEntity).r).toBeCloseTo(6, 6);
    const outArc = out.get('arc') as ArcEntity;
    expect(arcPoint(outArc, outArc.endAngleDeg).x).toBeCloseTo(16, 6);
  });

  it('concave arc dent shrinks when the profile grows outward', () => {
    const entities = [
      L('b', 0, 0, 10, 0),
      L('r', 10, 0, 10, 10),
      L('t1', 10, 10, 7, 10),
      A('dent', 5, 10, 2, 0, 180, true),
      L('t2', 3, 10, 0, 10),
      L('l', 0, 10, 0, 0),
    ];
    const out = run(entities, 'b', 1, { x: 5, y: -5 });
    expect((out.get('dent') as ArcEntity).r).toBeCloseTo(1, 6);
    expect((out.get('b') as LineEntity).y1).toBeCloseTo(-1, 6);
  });
});
