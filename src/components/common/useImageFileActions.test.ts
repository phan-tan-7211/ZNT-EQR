import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import {
  copyImageToClipboard,
  downloadImageFile,
} from '@/components/common/dynamicImageViewportUtils';
import { useImageFileActions } from '@/components/common/useImageFileActions';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/common/dynamicImageViewportUtils', () => ({
  copyImageToClipboard: vi.fn(),
  downloadImageFile: vi.fn(),
}));

const image = { src: 'https://signed.example/eq.jpg', alt: 'Excavator', fileName: 'eq.jpg' };

describe('useImageFileActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(copyImageToClipboard).mockResolvedValue(undefined);
    vi.mocked(downloadImageFile).mockResolvedValue(undefined);
  });

  it('downloads the image under its file name and confirms with a toast', async () => {
    const { result } = renderHook(() => useImageFileActions(image));

    await act(() => result.current.downloadImage());

    expect(downloadImageFile).toHaveBeenCalledWith('https://signed.example/eq.jpg', 'eq.jpg');
    expect(toast.success).toHaveBeenCalledWith('Download started');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('falls back to the alt text, then a generic name, for downloads and copies', async () => {
    const { result, rerender } = renderHook(
      (target: { src: string; alt: string; fileName?: string }) => useImageFileActions(target),
      { initialProps: { src: 'https://signed.example/a.jpg', alt: 'Loader' } },
    );

    await act(() => result.current.downloadImage());
    await act(() => result.current.copyImage());
    expect(downloadImageFile).toHaveBeenLastCalledWith('https://signed.example/a.jpg', 'Loader');
    expect(copyImageToClipboard).toHaveBeenLastCalledWith('https://signed.example/a.jpg', 'Loader');

    rerender({ src: 'https://signed.example/b.jpg', alt: '' });
    await act(() => result.current.downloadImage());
    await act(() => result.current.copyImage());
    expect(downloadImageFile).toHaveBeenLastCalledWith('https://signed.example/b.jpg', 'image');
    expect(copyImageToClipboard).toHaveBeenLastCalledWith('https://signed.example/b.jpg', 'image.png');
  });

  it('reports a failed download with an error toast', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('network');
    vi.mocked(downloadImageFile).mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useImageFileActions(image));

    await act(() => result.current.downloadImage());

    expect(consoleError).toHaveBeenCalledWith('Failed to download image:', failure);
    expect(toast.error).toHaveBeenCalledWith('Could not download image');
    expect(toast.success).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('flags isCopying while the clipboard copy runs and clears it afterwards', async () => {
    let finishCopy: () => void = () => {};
    vi.mocked(copyImageToClipboard).mockImplementationOnce(
      () => new Promise<void>((resolve) => { finishCopy = resolve; }),
    );
    const { result } = renderHook(() => useImageFileActions(image));
    expect(result.current.isCopying).toBe(false);

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.copyImage();
    });
    expect(result.current.isCopying).toBe(true);
    expect(copyImageToClipboard).toHaveBeenCalledWith('https://signed.example/eq.jpg', 'eq.jpg');

    await act(async () => {
      finishCopy();
      await pending;
    });
    expect(result.current.isCopying).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('Image copied to clipboard');
  });

  it('reports a failed copy with an error toast and clears isCopying', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('denied');
    vi.mocked(copyImageToClipboard).mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useImageFileActions(image));

    await act(() => result.current.copyImage());

    expect(consoleError).toHaveBeenCalledWith('Failed to copy image:', failure);
    expect(toast.error).toHaveBeenCalledWith('Could not copy image to clipboard');
    expect(result.current.isCopying).toBe(false);
    consoleError.mockRestore();
  });

  it('does nothing when there is no image', async () => {
    const { result } = renderHook(() => useImageFileActions(null));

    await act(() => result.current.downloadImage());
    await act(() => result.current.copyImage());

    expect(downloadImageFile).not.toHaveBeenCalled();
    expect(copyImageToClipboard).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(result.current.isCopying).toBe(false);
  });
});
