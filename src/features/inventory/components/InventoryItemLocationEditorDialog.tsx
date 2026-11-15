import { useI18n } from '@/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { StructuredLocationEditorControls } from '@/components/location/StructuredLocationEditorControls';
import { StructuredLocationEditorDialogFooter } from '@/components/location/StructuredLocationEditorDialogFooter';
import { useStructuredLocationEditorState } from '@/components/location/structuredLocationEditorState';
import { useStructuredLocationEditorControlsProps } from '@/components/location/useStructuredLocationEditorControlsProps';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  buildInventoryAddress,
  inventoryLocationToPlaceData,
  placeDataToInventoryStructuredLocation,
} from '@/features/inventory/utils/inventoryLocationUtils';
import type { InventoryStructuredLocationFields } from '@/features/inventory/utils/inventoryLocationUtils';

type InventoryItemLocationEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structuredLocation: InventoryStructuredLocationFields;
  onSave: (location: InventoryStructuredLocationFields) => Promise<void>;
};

export function InventoryItemLocationEditorDialog({
  open,
  onOpenChange,
  structuredLocation,
  onSave,
}: InventoryItemLocationEditorDialogProps) {
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);

  const initialPlace = useMemo(
    () => inventoryLocationToPlaceData(structuredLocation),
    [structuredLocation],
  );

  const editor = useStructuredLocationEditorState({
    active: open,
    initialPlace,
    fallbackAddress: buildInventoryAddress(structuredLocation),
  });

  const locationControlsProps = useStructuredLocationEditorControlsProps(editor);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const nextLocation = editor.isCleared
        ? placeDataToInventoryStructuredLocation(null)
        : placeDataToInventoryStructuredLocation(editor.pendingPlace);
      await onSave(nextLocation);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [editor.isCleared, editor.pendingPlace, onOpenChange, onSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('inventoryListAux.locationTitle')}</DialogTitle>
          <DialogDescription>
            {t('inventoryListAux.locationDescription')}
          </DialogDescription>
        </DialogHeader>

        <StructuredLocationEditorControls
          {...locationControlsProps}
          locationLabel={t('inventoryListAux.storageAddress')}
          liveCaptureTitle={t('inventoryListAux.liveCapture')}
          liveCaptureConfirmLabel={t('inventoryListAux.useLocation')}
          isSaving={isSaving}
        />

        <StructuredLocationEditorDialogFooter
          onCancel={() => onOpenChange(false)}
          onSave={handleSave}
          canSave={editor.canSave}
          isSaving={isSaving}
          saveLabel={t('inventoryListAux.saveLocation')}
        />
      </DialogContent>
    </Dialog>
  );
}
