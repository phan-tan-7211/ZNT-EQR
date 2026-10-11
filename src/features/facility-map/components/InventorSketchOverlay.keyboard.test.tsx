import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventorSketchOverlay from '@/features/facility-map/components/InventorSketchOverlay';
import { displayToModelUnits } from '@/features/facility-map/sketch';
import type { LineEntity, SketchDocument } from '@/features/facility-map/sketch/core/types';

const SIZE = 1000;
const t = (key: string) => key;

const setup = () => {
  const onDocumentChange = vi.fn<(document: SketchDocument) => void>();
  const view = render(
    <InventorSketchOverlay
      enabled
      storageKey={`sketch-keyboard-test-${Math.random()}`}
      canvasWidth={SIZE}
      canvasHeight={SIZE}
      t={t}
      onDocumentChange={onDocumentChange}
      onFinish={() => {}}
      onCancel={() => {}}
    />,
  );
  const svg = view.container.querySelector('svg')!;
  // jsdom has no layout: give the SVG a 1:1 client→sketch mapping.
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: SIZE, bottom: SIZE, width: SIZE, height: SIZE, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  const latest = () => onDocumentChange.mock.calls.at(-1)?.[0];
  const click = (x: number, y: number, init: MouseEventInit = {}) => {
    fireEvent.mouseMove(svg, { clientX: x, clientY: y });
    fireEvent.mouseDown(svg, { button: 0, clientX: x, clientY: y, ...init });
    fireEvent.mouseUp(svg, { button: 0, clientX: x, clientY: y });
  };
  const press = (key: string, init: KeyboardEventInit = {}) => {
    act(() => {
      (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
    });
  };
  const toolButton = (labelKey: string) => screen.getByTitle(new RegExp(`^${labelKey} \\(`));
  return { svg, latest, click, press, toolButton };
};

const isActive = (button: HTMLElement) => button.className.includes('bg-sky-500');
const lines = (document: SketchDocument | undefined) =>
  (document?.entities ?? []).filter((entity): entity is LineEntity => entity.type === 'line');

describe('InventorSketchOverlay keyboard + line chain', () => {
  beforeEach(() => localStorage.clear());

  it('switches tools with Inventor letters and leaves with a two-stage Esc', () => {
    const { press, toolButton, click } = setup();
    press('l');
    expect(isActive(toolButton('facilityMap.toolLine'))).toBe(true);
    press('c');
    expect(isActive(toolButton('facilityMap.toolCircle'))).toBe(true);
    press('d');
    expect(isActive(toolButton('facilityMap.sketchDimensionTool'))).toBe(true);
    press('l');
    click(100, 100);
    press('Escape'); // ends the shape, stays in Line
    expect(isActive(toolButton('facilityMap.toolLine'))).toBe(true);
    press('Escape'); // leaves the tool
    expect(isActive(toolButton('facilityMap.toolSelect'))).toBe(true);
    press(' '); // repeats the last tool
    expect(isActive(toolButton('facilityMap.toolLine'))).toBe(true);
  });

  it('chains line segments and infers horizontal / vertical / coincident constraints', () => {
    const { press, click, latest } = setup();
    press('l');
    click(100, 100);
    click(300, 100);
    click(300, 300);
    press('Escape');

    const document = latest()!;
    const [first, second] = lines(document);
    expect(lines(document)).toHaveLength(2);
    expect([second.x1, second.y1]).toEqual([first.x2, first.y2]);
    const kinds = document.constraints.map((constraint) => constraint.kind).sort();
    expect(kinds).toEqual(['coincident', 'horizontal', 'vertical']);
  });

  it('Ctrl+click commits without inferred constraints', () => {
    const { press, click, latest } = setup();
    press('l');
    click(100, 100);
    click(300, 100, { ctrlKey: true });
    press('Escape');
    expect(lines(latest())).toHaveLength(1);
    expect(latest()!.constraints).toEqual([]);
  });

  it('typing a number while drawing goes straight into the length field', () => {
    const { press, click, latest } = setup();
    press('l');
    click(100, 100);
    fireEvent.mouseMove(document.querySelector('svg')!, { clientX: 400, clientY: 100 });
    press('2');
    const input = document.activeElement as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.value).toBe('2');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const [created] = lines(latest());
    const length = Math.hypot(created.x2 - created.x1, created.y2 - created.y1);
    expect(length).toBeCloseTo(displayToModelUnits(25, latest()!), 6);
    expect(created.y2).toBeCloseTo(created.y1, 6);
  });

  it('Ctrl+Z undoes exactly one sketch step', () => {
    const { press, click, latest } = setup();
    press('l');
    click(100, 100);
    click(300, 100);
    click(300, 300);
    press('Escape');
    expect(lines(latest())).toHaveLength(2);
    press('z', { ctrlKey: true });
    expect(lines(latest())).toHaveLength(1);
  });
});
