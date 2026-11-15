import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageHoverPreview } from './ImageHoverPreview';

const hover = { src: 'https://img.test/preview/one.jpg', x: 20, y: 30, size: 240 };

describe('ImageHoverPreview', () => {
  it('renders nothing without a hover', () => {
    const { container } = render(<ImageHoverPreview hover={null} visible marker="equipment" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the opened image at the hover position, hidden from assistive tech', () => {
    const { container } = render(<ImageHoverPreview hover={hover} visible marker="equipment" />);

    const preview = container.querySelector('[data-equipment-image-hover-preview]');
    expect(preview).toHaveClass('equipment-image-hover-preview', 'fixed', 'scale-100', 'opacity-100');
    expect(preview).toHaveAttribute('aria-hidden', 'true');
    expect(preview).toHaveStyle({ left: '20px', top: '30px', width: '240px', height: '240px' });
    expect(preview?.querySelector('img')).toHaveAttribute('src', hover.src);
    expect(preview?.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('fades out while not visible', () => {
    const { container } = render(<ImageHoverPreview hover={hover} visible={false} marker="equipment" />);

    expect(container.firstElementChild).toHaveClass('scale-[0.97]', 'opacity-0');
  });

  it('carries the inventory item marker and shows the image it is given', () => {
    const { container } = render(
      <ImageHoverPreview
        hover={hover}
        visible
        marker="inventory-item"
        src="https://img.test/preview/current.jpg"
      />,
    );

    const preview = container.querySelector('[data-inventory-item-image-hover-preview]');
    expect(preview).toHaveClass('inventory-item-image-hover-preview');
    expect(preview).not.toHaveClass('equipment-image-hover-preview');
    expect(preview).not.toHaveAttribute('data-equipment-image-hover-preview');
    expect(preview?.querySelector('img')).toHaveAttribute('src', 'https://img.test/preview/current.jpg');
  });

  it('renders into document.body when portalled', () => {
    const { container } = render(<ImageHoverPreview hover={hover} visible marker="equipment" portal />);

    const preview = document.body.querySelector('[data-equipment-image-hover-preview]');
    expect(preview).not.toBeNull();
    expect(container.contains(preview)).toBe(false);
  });
});
