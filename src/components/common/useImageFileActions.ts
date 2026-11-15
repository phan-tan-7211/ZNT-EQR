import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  copyImageToClipboard,
  downloadImageFile,
} from '@/components/common/dynamicImageViewportUtils';
import { useI18n } from '@/i18n';
import { getFinalHardcodedAuditCopy } from '@/i18n/finalHardcodedAuditCopy';

export interface ImageFileActionTarget {
  src: string;
  alt: string;
  fileName?: string;
}

/** Download and copy-to-clipboard actions for one image, with localized result toasts. */
export function useImageFileActions(image: ImageFileActionTarget | null) {
  const { language } = useI18n();
  const copy = getFinalHardcodedAuditCopy(language);
  const [isCopying, setIsCopying] = useState(false);
  const src = image?.src;
  const alt = image?.alt;
  const fileName = image?.fileName;

  const downloadImage = useCallback(async () => {
    if (src === undefined) return;
    try {
      await downloadImageFile(src, fileName || alt || 'image');
      toast.success(copy.downloadStarted);
    } catch (error) {
      console.error('Failed to download image:', error);
      toast.error(copy.downloadImageFailed);
    }
  }, [alt, copy.downloadImageFailed, copy.downloadStarted, fileName, src]);

  const copyImage = useCallback(async () => {
    if (src === undefined) return;
    setIsCopying(true);
    try {
      await copyImageToClipboard(src, fileName || alt || 'image.png');
      toast.success(copy.imageCopied);
    } catch (error) {
      console.error('Failed to copy image:', error);
      toast.error(copy.copyImageFailed);
    } finally {
      setIsCopying(false);
    }
  }, [alt, copy.copyImageFailed, copy.imageCopied, fileName, src]);

  return { isCopying, downloadImage, copyImage };
}
