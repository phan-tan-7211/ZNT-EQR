import { describe, expect, it } from 'vitest';

import {
  isDynamicInputKey,
  pickPrimaryDimension,
  resolveToolShortcut,
  shortcutForTool,
} from '@/features/facility-map/sketch/commands/shortcuts';

const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
  key: k, ctrlKey: false, metaKey: false, altKey: false, ...mods,
});

describe('sketch shortcuts', () => {
  it.each([
    ['l', 'line'], ['L', 'line'], ['c', 'circle'], ['r', 'rect'], ['a', 'arc'],
    ['d', 'dimension'], ['x', 'trim'], ['o', 'offset'], ['e', 'extend'], ['b', 'break'], ['p', 'polyline'],
  ])('maps %s to %s', (k, tool) => {
    expect(resolveToolShortcut(key(k))).toBe(tool);
  });

  it('ignores modified keys so Ctrl+C / Ctrl+D keep their meaning', () => {
    expect(resolveToolShortcut(key('c', { ctrlKey: true }))).toBeNull();
    expect(resolveToolShortcut(key('d', { metaKey: true }))).toBeNull();
    expect(resolveToolShortcut(key('l', { altKey: true }))).toBeNull();
  });

  it('ignores unmapped keys', () => {
    expect(resolveToolShortcut(key('q'))).toBeNull();
    expect(resolveToolShortcut(key('Enter'))).toBeNull();
  });

  it('labels tools with their shortcut', () => {
    expect(shortcutForTool('line')).toBe('L');
    expect(shortcutForTool('dimension')).toBe('D');
    expect(shortcutForTool('select')).toBeNull();
  });

  it('treats digits, sign and decimal separators as value input', () => {
    ['0', '7', '.', ',', '-'].forEach((k) => expect(isDynamicInputKey(key(k))).toBe(true));
    ['a', 'Tab', 'Enter', ' '].forEach((k) => expect(isDynamicInputKey(key(k))).toBe(false));
    expect(isDynamicInputKey(key('1', { ctrlKey: true }))).toBe(false);
  });

  it('picks the size dimension before the angle', () => {
    const dims = [
      { id: 'ang', entityId: 'l1', kind: 'angle' as const },
      { id: 'len', entityId: 'l1', kind: 'length' as const },
      { id: 'other', entityId: 'l2', kind: 'length' as const },
    ];
    expect(pickPrimaryDimension(dims, 'l1')?.id).toBe('len');
    expect(pickPrimaryDimension([{ id: 'r', entityId: 'c1', kind: 'radius' as const }], 'c1')?.id).toBe('r');
    expect(pickPrimaryDimension(dims, 'missing')).toBeNull();
  });
});
