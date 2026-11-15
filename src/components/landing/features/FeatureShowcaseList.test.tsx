import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShowcaseItem } from '@/pages/features/data/featurePageTypes';
import { FeatureShowcaseList } from './FeatureShowcaseList';

vi.mock('@/components/landing/features/DemoVideo', () => ({
  DemoVideo: ({ alt }: { alt: string }) => <div data-testid="demo-video" aria-label={alt} />,
}));

const caption = (title: string): ShowcaseItem => ({
  kind: 'image',
  imageAlt: `${title} screenshot`,
  title,
  description: `${title} description`,
});

const video: ShowcaseItem = {
  kind: 'demo-video',
  baseName: 'demo',
  alt: 'Demo video',
  title: 'Video',
  description: 'Video description',
};

function cardFor(title: string): HTMLElement {
  const card = screen.getByRole('heading', { level: 3, name: title }).parentElement;
  if (!card) throw new Error(`No card for ${title}`);
  return card;
}

describe('FeatureShowcaseList', () => {
  it('shows a caption without an image frame when the screenshot is not available', () => {
    const { container } = render(<FeatureShowcaseList items={[caption('Teams')]} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Teams' })).toBeInTheDocument();
    expect(screen.getByText('Teams description')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    // Only the card itself carries a border: no empty picture frame inside it.
    expect(cardFor('Teams').querySelectorAll('.border')).toHaveLength(0);
  });

  it('still renders a screenshot when one is provided', () => {
    render(
      <FeatureShowcaseList
        items={[{ kind: 'image', imageUrl: '/images/landing/shot.webp', imageAlt: 'Shot', title: 'With image', description: 'd' }]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Shot' })).toHaveAttribute('src', '/images/landing/shot.webp');
  });

  it('renders only the grid images that exist and no grid when none do', () => {
    const { container, rerender } = render(
      <FeatureShowcaseList
        items={[{
          kind: 'image-grid',
          images: [{ imageAlt: 'Missing one' }, { imageAlt: 'Missing two' }],
          title: 'Mobile',
          description: 'Mobile description',
        }]}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(cardFor('Mobile').querySelector('.grid')).toBeNull();

    rerender(
      <FeatureShowcaseList
        items={[{
          kind: 'image-grid',
          images: [{ imageAlt: 'Missing one' }, { imageUrl: '/images/landing/phone.webp', imageAlt: 'Phone' }],
          title: 'Mobile',
          description: 'Mobile description',
        }]}
      />,
    );

    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Phone' })).toBeInTheDocument();
  });

  it('pairs caption-only cards and lets an unpaired one take the full row', () => {
    render(<FeatureShowcaseList items={[caption('One'), caption('Two'), caption('Three')]} />);

    expect(cardFor('One')).not.toHaveClass('md:col-span-2');
    expect(cardFor('Two')).not.toHaveClass('md:col-span-2');
    expect(cardFor('Three')).toHaveClass('md:col-span-2');
  });

  it('keeps media cards full width and pairs the captions that follow them', () => {
    render(<FeatureShowcaseList items={[video, caption('First'), caption('Second')]} />);

    expect(cardFor('Video')).toHaveClass('md:col-span-2');
    expect(screen.getByTestId('demo-video')).toBeInTheDocument();
    expect(cardFor('First')).not.toHaveClass('md:col-span-2');
    expect(cardFor('Second')).not.toHaveClass('md:col-span-2');
  });

  it('lets a single caption-only card take the full row', () => {
    render(<FeatureShowcaseList items={[caption('Alone')]} />);

    expect(cardFor('Alone')).toHaveClass('md:col-span-2');
  });
});
