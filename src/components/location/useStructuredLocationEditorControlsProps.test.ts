import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStructuredLocationEditorState } from '@/components/location/structuredLocationEditorState';
import { useStructuredLocationEditorControlsProps } from '@/components/location/useStructuredLocationEditorControlsProps';

const mockMapsEnvironment = vi.hoisted(() => ({
  isLoaded: true,
  googleMapsKey: 'test-key',
  mapId: 'test-map-id' as string | null,
  isDark: false,
}));

vi.mock('@/hooks/useGoogleMapsLoader', () => ({
  useGoogleMapsLoader: () => ({ isLoaded: mockMapsEnvironment.isLoaded }),
}));

vi.mock('@/hooks/useGoogleMapsKey', () => ({
  useGoogleMapsKey: () => ({
    googleMapsKey: mockMapsEnvironment.googleMapsKey,
    mapId: mockMapsEnvironment.mapId,
    isLoading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

vi.mock('@/hooks/useThemeVersion', () => ({
  useThemeVersion: () => 0,
  useIsDarkTheme: () => mockMapsEnvironment.isDark,
}));

const initialPlace = {
  formatted_address: '500 Yard Rd, Dallas, TX, USA',
  street: '500 Yard Rd',
  city: 'Dallas',
  state: 'TX',
  country: 'USA',
  lat: 32.77,
  lng: -96.79,
};

function renderControlsProps() {
  return renderHook(() => {
    const editor = useStructuredLocationEditorState({
      initialPlace,
      fallbackAddress: 'Fallback address',
    });
    return { editor, controlsProps: useStructuredLocationEditorControlsProps(editor) };
  });
}

describe('useStructuredLocationEditorControlsProps', () => {
  beforeEach(() => {
    mockMapsEnvironment.isLoaded = true;
    mockMapsEnvironment.googleMapsKey = 'test-key';
    mockMapsEnvironment.mapId = 'test-map-id';
    mockMapsEnvironment.isDark = false;
  });

  it('binds the editor state and handlers to the controls props', () => {
    const { result } = renderControlsProps();
    const { editor, controlsProps } = result.current;

    expect(controlsProps).toEqual({
      locationAddress: '500 Yard Rd, Dallas, TX, USA',
      onPlaceSelect: editor.handlePlaceSelect,
      onClear: editor.handleClear,
      isPlacesLoaded: true,
      previewCenter: { lat: 32.77, lng: -96.79 },
      recenterKey: editor.recenterKey,
      onCenterChange: editor.handleMapCenterChange,
      googleMapsKey: 'test-key',
      mapId: 'test-map-id',
      isDark: false,
      isLiveCaptureOpen: false,
      onLiveCaptureOpenChange: editor.setIsLiveCaptureOpen,
      onConfirmLiveLocation: editor.handleSaveLiveLocation,
    });
  });

  it('passes the Google Maps environment through and maps a missing map ID to undefined', () => {
    mockMapsEnvironment.isLoaded = false;
    mockMapsEnvironment.googleMapsKey = '';
    mockMapsEnvironment.mapId = null;
    mockMapsEnvironment.isDark = true;

    const { result } = renderControlsProps();

    expect(result.current.controlsProps).toMatchObject({
      isPlacesLoaded: false,
      googleMapsKey: '',
      isDark: true,
    });
    expect(result.current.controlsProps.mapId).toBeUndefined();
  });
});
