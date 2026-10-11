import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import InventorSketchOverlay from '@/features/facility-map/components/InventorSketchOverlay';
import SketchGuideDialog from '@/features/facility-map/components/SketchGuideDialog';
import { facilityMapResources } from '@/i18n/facilityMapResources';

const lookup = (language: 'en' | 'vi' | 'ko') => (key: string) => {
  const value = key.split('.').reduce<unknown>(
    (current, segment) => (current && typeof current === 'object' ? (current as Record<string, unknown>)[segment] : undefined),
    facilityMapResources[language],
  );
  return typeof value === 'string' ? value : key;
};

const press = (key: string, target: Element = document.activeElement ?? document.body) => {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
};

describe('SketchGuideDialog', () => {
  it.each(['en', 'vi', 'ko'] as const)('renders every section with real %s copy (no raw keys)', (language) => {
    render(<SketchGuideDialog open onOpenChange={() => {}} t={lookup(language)} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(lookup(language)('facilityMap.guide.title'))).toBeInTheDocument();
    const tabs = within(dialog).getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    for (const tab of tabs) {
      fireEvent.mouseDown(tab);
      fireEvent.click(tab);
      expect(dialog.textContent).not.toMatch(/facilityMap\.guide\./);
    }
  });

  it('closes from the footer button', () => {
    const onOpenChange = vi.fn();
    render(<SketchGuideDialog open onOpenChange={onOpenChange} t={lookup('en')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('has the same guide keys in every language', () => {
    const keys = (language: 'en' | 'vi' | 'ko') => Object.keys(facilityMapResources[language].facilityMap.guide).sort();
    expect(keys('vi')).toEqual(keys('en'));
    expect(keys('ko')).toEqual(keys('en'));
  });
});

describe('InventorSketchOverlay guide entry points', () => {
  const renderOverlay = (onOpenGuide = vi.fn(), guideUnseen = false) => {
    render(
      <InventorSketchOverlay
        enabled
        storageKey={`sketch-guide-test-${Math.random()}`}
        canvasWidth={1000}
        canvasHeight={1000}
        t={(key) => key}
        onFinish={() => {}}
        onCancel={() => {}}
        onOpenGuide={onOpenGuide}
        guideUnseen={guideUnseen}
      />,
    );
    return onOpenGuide;
  };

  it('opens the guide from the toolbar button, ? and F1', () => {
    const onOpenGuide = renderOverlay();
    fireEvent.click(screen.getByRole('button', { name: 'facilityMap.guide.title' }));
    press('?');
    press('F1');
    expect(onOpenGuide).toHaveBeenCalledTimes(3);
  });

  it('ignores sketch shortcuts typed inside an open dialog', () => {
    renderOverlay();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.appendChild(button);
    document.body.appendChild(dialog);
    press('l', button);
    expect(screen.getByTitle(/^facilityMap\.toolLine \(/).className).not.toContain('bg-sky-500');
    dialog.remove();
  });
});
