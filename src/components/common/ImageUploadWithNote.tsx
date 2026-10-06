import React, { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { finishDragDrop, handleDragActiveState } from '@/components/common/drag-active-handlers';
import { useLocalFilePreviewUrls } from '@/hooks/useLocalFilePreviewUrls';
import { useI18n } from '@/i18n';

const sanitizeForDisplay = (text: string): string =>
  text.replace(/[^\w\s.\-()[\]]/g, '_') || 'unnamed';

const fileSelectionKey = (file: File): string =>
  [file.name, file.size, file.type, file.lastModified].join('::');

function mergeUniqueFiles(existing: File[], incoming: File[]): File[] {
  const seen = new Set(existing.map(fileSelectionKey));
  const merged = [...existing];

  for (const file of incoming) {
    const key = fileSelectionKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(file);
  }

  return merged;
}

interface ImageUploadWithNoteProps {
  onUpload?: (files: File[]) => Promise<void>;
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  /**
   * When true, this component only stages files/previews. The caller owns the
   * final upload step (for example, after a new inventory item receives its ID).
   */
  deferUpload?: boolean;
  selectedFiles?: File[];
  onSelectedFilesChange?: (files: File[]) => void;
}

const ImageUploadWithNote: React.FC<ImageUploadWithNoteProps> = ({
  onUpload,
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false,
  deferUpload = false,
  selectedFiles: controlledSelectedFiles,
  onSelectedFilesChange,
}) => {
  const { t } = useI18n();
  const inputId = useId();
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { getPreviewUrl, revokePreviewUrl, clearPreviewUrls } = useLocalFilePreviewUrls();
  const selectedFiles = controlledSelectedFiles ?? internalSelectedFiles;

  const updateSelectedFiles = (next: File[]) => {
    if (controlledSelectedFiles === undefined) {
      setInternalSelectedFiles(next);
    }
    onSelectedFilesChange?.(next);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addFiles(files);
    event.target.value = '';
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (!acceptedTypes.includes(file.type)) {
        toast.error(t('sharedUi.unsupportedImage', { name: sanitizeForDisplay(file.name) }));
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('sharedUi.imageTooLarge', { name: sanitizeForDisplay(file.name) }));
        return false;
      }
      return true;
    });

    const combined = mergeUniqueFiles(selectedFiles, validFiles);
    if (combined.length > maxFiles) {
      toast.error(t('sharedUi.maxFiles', { count: maxFiles }));
      return;
    }

    updateSelectedFiles(combined);
  };

  const removeFile = (index: number) => {
    const removed = selectedFiles[index];
    if (removed) revokePreviewUrl(removed);
    updateSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    handleDragActiveState(e, setDragActive);
  };

  const handleDrop = (e: React.DragEvent) => {
    finishDragDrop(e, setDragActive);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    const files = Array.from(e.clipboardData.items)
      .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length === 0) return;

    e.preventDefault();
    addFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error(t('sharedUi.selectImage'));
      return;
    }

    if (!onUpload) {
      toast.error(t('sharedUi.uploadUnavailable'));
      return;
    }

    setIsUploading(true);

    try {
      await onUpload(selectedFiles);
      clearPreviewUrls();
      updateSelectedFiles([]);
      toast.success(t('sharedUi.imagesUploaded'));
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(t('sharedUi.imagesUploadFailed', {
        error: error instanceof Error ? error.message : t('sharedUi.unknownError'),
      }));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="min-w-0">
      <CardContent standalone className="min-w-0 space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onPaste={handlePaste}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('sharedUi.imageDropMultiple')}</p>
            <p className="text-xs text-muted-foreground">
              {t('sharedUi.imageFormats')} · Ctrl+V
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => document.getElementById(inputId)?.click()}
              className="mt-2"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('sharedUi.chooseFiles')}
            </Button>
          </div>
          <Input
            id={inputId}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('sharedUi.selectedImages', { count: selectedFiles.length })}
            </Label>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
              {selectedFiles.map((file, index) => {
                const safePreviewUrl = getPreviewUrl(file);
                const displayName = sanitizeForDisplay(file.name);
                return (
                  <div key={`${displayName}-${index}`} className="group relative min-w-0">
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {safePreviewUrl ? (
                        <img
                          src={safePreviewUrl}
                          alt={displayName}
                          className="block h-full w-full min-w-0 object-cover"
                          onError={() => console.error('Image preview failed')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                      aria-label={t('sharedUi.removeSelectedImage', { name: displayName })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{displayName}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!deferUpload && selectedFiles.length > 0 && (
          <Button
            type="button"
            onClick={handleUpload}
            disabled={disabled || isUploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? t('sharedUi.uploading') : t('sharedUi.uploadImages', { count: selectedFiles.length })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ImageUploadWithNote;
