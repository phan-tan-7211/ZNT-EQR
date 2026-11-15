import type { ComponentProps } from 'react';
import type { StructuredLocationEditorControls } from '@/components/location/StructuredLocationEditorControls';
import type { useStructuredLocationEditorState } from '@/components/location/structuredLocationEditorState';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useIsDarkTheme, useThemeVersion } from '@/hooks/useThemeVersion';

type StructuredLocationEditorState = ReturnType<typeof useStructuredLocationEditorState>;

/** Editor-state and map props of `StructuredLocationEditorControls`; callers add labels and saving state. */
export type StructuredLocationEditorControlsBindings = Pick<
  ComponentProps<typeof StructuredLocationEditorControls>,
  | 'locationAddress'
  | 'onPlaceSelect'
  | 'onClear'
  | 'isPlacesLoaded'
  | 'previewCenter'
  | 'recenterKey'
  | 'onCenterChange'
  | 'googleMapsKey'
  | 'mapId'
  | 'isDark'
  | 'isLiveCaptureOpen'
  | 'onLiveCaptureOpenChange'
  | 'onConfirmLiveLocation'
>;

/**
 * Binds a `useStructuredLocationEditorState` editor and the shared Google Maps
 * environment (Places loader, browser key, map ID, dark theme) to the props of
 * `StructuredLocationEditorControls`.
 */
export function useStructuredLocationEditorControlsProps(
  editor: StructuredLocationEditorState,
): StructuredLocationEditorControlsBindings {
  const { isLoaded: isPlacesLoaded } = useGoogleMapsLoader();
  const themeVersion = useThemeVersion();
  const isDark = useIsDarkTheme(themeVersion);
  const { googleMapsKey, mapId } = useGoogleMapsKey();

  return {
    locationAddress: editor.addressValue,
    onPlaceSelect: editor.handlePlaceSelect,
    onClear: editor.handleClear,
    isPlacesLoaded,
    previewCenter: editor.previewCenter,
    recenterKey: editor.recenterKey,
    onCenterChange: editor.handleMapCenterChange,
    googleMapsKey,
    mapId: mapId ?? undefined,
    isDark,
    isLiveCaptureOpen: editor.isLiveCaptureOpen,
    onLiveCaptureOpenChange: editor.setIsLiveCaptureOpen,
    onConfirmLiveLocation: editor.handleSaveLiveLocation,
  };
}
