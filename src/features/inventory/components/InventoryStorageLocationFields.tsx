import { useI18n } from '@/i18n';
import React, { useCallback, useMemo } from 'react';
import { StructuredLocationEditorControls } from '@/components/location/StructuredLocationEditorControls';
import {
  mergeMapCenterIntoPlaceData,
  useStructuredLocationEditorState,
} from '@/components/location/structuredLocationEditorState';
import { useStructuredLocationEditorControlsProps } from '@/components/location/useStructuredLocationEditorControlsProps';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import {
  buildInventoryAddress,
  inventoryLocationToPlaceData,
  placeDataToInventoryStructuredLocation,
} from '@/features/inventory/utils/inventoryLocationUtils';
import type { InventoryStructuredLocationFields } from '@/features/inventory/utils/inventoryLocationUtils';

type InventoryStorageLocationFieldsProps = {
  structuredLocation: InventoryStructuredLocationFields;
  onStructuredLocationChange: (location: InventoryStructuredLocationFields) => void;
  locationLabel?: string;
  description?: string;
};

export function InventoryStorageLocationFields({
  structuredLocation,
  onStructuredLocationChange,
  locationLabel,
  description,
}: InventoryStorageLocationFieldsProps) {
  const { t } = useI18n();

  const initialPlace = useMemo(
    () => inventoryLocationToPlaceData(structuredLocation),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only when a location field changes, not for every new object the parent form passes
    [
      structuredLocation.location_address,
      structuredLocation.location_city,
      structuredLocation.location_state,
      structuredLocation.location_country,
      structuredLocation.location_lat,
      structuredLocation.location_lng,
    ],
  );

  const editor = useStructuredLocationEditorState({
    initialPlace,
    fallbackAddress: buildInventoryAddress(structuredLocation),
  });

  const locationControlsProps = useStructuredLocationEditorControlsProps(editor);

  const applyPlace = useCallback(
    (data: PlaceLocationData | null) => {
      onStructuredLocationChange(placeDataToInventoryStructuredLocation(data));
    },
    [onStructuredLocationChange],
  );

  const handlePlaceSelect = useCallback(
    (data: PlaceLocationData) => {
      editor.handlePlaceSelect(data);
      applyPlace(data);
    },
    [applyPlace, editor],
  );

  const handleClear = useCallback(() => {
    editor.handleClear();
    applyPlace(null);
  }, [applyPlace, editor]);

  const handleMapCenterChange = useCallback(
    (center: { lat: number; lng: number }) => {
      const next = mergeMapCenterIntoPlaceData(editor.pendingPlace, center);
      editor.handleMapCenterChange(center);
      applyPlace(next);
    },
    [applyPlace, editor],
  );

  const handleSaveLiveLocation = useCallback(
    async (data: PlaceLocationData) => {
      await editor.handleSaveLiveLocation(data);
      applyPlace(data);
    },
    [applyPlace, editor],
  );

  return (
    <StructuredLocationEditorControls
      {...locationControlsProps}
      className="space-y-3"
      locationLabel={locationLabel ?? t('itemForm.storageAddress')}
      onPlaceSelect={handlePlaceSelect}
      onClear={handleClear}
      onCenterChange={handleMapCenterChange}
      onConfirmLiveLocation={handleSaveLiveLocation}
      liveCaptureTitle={t('itemForm.liveCaptureTitle')}
      liveCaptureConfirmLabel={t('itemForm.useLocation')}
      description={description ?? t('itemForm.storageDescription')}
      showMapPreviewLabel
    />
  );
}
