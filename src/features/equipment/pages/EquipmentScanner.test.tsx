import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EquipmentScanner from './EquipmentScanner';
import { getCameraAccessErrorCode } from '@/features/equipment/utils/cameraAccessErrors';
import { I18nProvider } from '@/i18n/I18nProvider';

const hoisted = vi.hoisted(() => {
  const scannerState = {
    lastOnDecode: null as ((result: { data: string }) => void) | null,
  };
  return {
    scannerState,
    mockNavigate: vi.fn(),
    mockDestroy: vi.fn(),
    mockStop: vi.fn(),
    mockStart: vi.fn(),
    mockSetCamera: vi.fn(),
    mockToggleFlash: vi.fn(),
    MockQrScanner: class MockQrScanner {
      static hasCamera = vi.fn();
      static listCameras = vi.fn();
      static scanImage = vi.fn();

      constructor(_video: HTMLVideoElement, onDecode: (result: { data: string }) => void) {
        scannerState.lastOnDecode = onDecode;
      }

      start = vi.fn(async () => {
        await hoisted.mockStart();
      });

      stop = hoisted.mockStop;
      destroy = hoisted.mockDestroy;
      setCamera = hoisted.mockSetCamera;
      hasFlash = vi.fn(async () => true);
      toggleFlash = hoisted.mockToggleFlash;
      isFlashOn = () => false;
    },
  };
});

vi.mock('qr-scanner', () => ({
  default: hoisted.MockQrScanner,
}));

const scanFeedbackHookMock = vi.hoisted(() => ({
  prepareFeedback: vi.fn(),
  markPendingFeedback: vi.fn(),
  triggerFeedback: vi.fn(),
  triggerPendingFeedback: vi.fn(),
}));

vi.mock('@/hooks/useScanFeedback', () => ({
  useScanFeedback: () => scanFeedbackHookMock,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => hoisted.mockNavigate,
  };
});

function renderScanner() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/dashboard/scan']}>
        <Routes>
          <Route path="/dashboard/scan" element={<EquipmentScanner />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

async function startCameraScan(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('scanner-start-camera'));
}

describe('getCameraAccessErrorCode', () => {
  it('detects permissions policy violation text', () => {
    expect(
      getCameraAccessErrorCode(new Error('Permissions policy violation: camera is not allowed')),
    ).toBe('policy_blocked');
  });

  it('maps NotAllowedError', () => {
    expect(
      getCameraAccessErrorCode(new DOMException('Permission denied', 'NotAllowedError')),
    ).toBe('permission_denied');
  });

  it('maps NotFoundError', () => {
    expect(getCameraAccessErrorCode(new DOMException('No camera', 'NotFoundError'))).toBe(
      'not_found',
    );
  });

  it('maps NotReadableError', () => {
    expect(getCameraAccessErrorCode(new DOMException('Busy', 'NotReadableError'))).toBe(
      'not_readable',
    );
  });
});

describe('EquipmentScanner', () => {
  beforeEach(() => {
    window.localStorage.setItem('znteqr-language', 'en');
    scanFeedbackHookMock.prepareFeedback.mockClear();
    scanFeedbackHookMock.markPendingFeedback.mockClear();
    scanFeedbackHookMock.triggerFeedback.mockClear();
    scanFeedbackHookMock.triggerPendingFeedback.mockClear();

    Object.defineProperty(Element.prototype, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(Element.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    vi.clearAllMocks();
    hoisted.scannerState.lastOnDecode = null;
    hoisted.mockStart.mockImplementation(async () => Promise.resolve());
    hoisted.mockSetCamera.mockResolvedValue(undefined);
    hoisted.mockToggleFlash.mockResolvedValue(undefined);
    hoisted.MockQrScanner.hasCamera.mockResolvedValue(true);
    hoisted.MockQrScanner.listCameras.mockResolvedValue([
      { id: 'cam-back', label: 'Back' },
      { id: 'cam-front', label: 'Front' },
    ]);
    hoisted.MockQrScanner.scanImage.mockResolvedValue({
      data: 'https://eqr.zinitek.com/qr/equipment/eq-upload',
    });
  });

  afterEach(() => {
    delete (Element.prototype as unknown as { hasPointerCapture?: unknown }).hasPointerCapture;
    delete (Element.prototype as unknown as { setPointerCapture?: unknown }).setPointerCapture;
    delete (Element.prototype as unknown as { releasePointerCapture?: unknown }).releasePointerCapture;
  });

  it('navigates when camera decodes an equipment QR URL', async () => {
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    expect(scanFeedbackHookMock.prepareFeedback).toHaveBeenCalled();
    await waitFor(() => expect(hoisted.scannerState.lastOnDecode).not.toBeNull());
    act(() => {
      hoisted.scannerState.lastOnDecode?.({ data: '/qr/equipment/eq-123' });
    });
    expect(scanFeedbackHookMock.markPendingFeedback).toHaveBeenCalled();
    expect(hoisted.mockNavigate).toHaveBeenCalledWith('/qr/equipment/eq-123');
    expect(await screen.findByTestId('scanner-decoded-state')).toBeInTheDocument();
  });

  it('shows parser message for external URLs', async () => {
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    await waitFor(() => expect(hoisted.scannerState.lastOnDecode).not.toBeNull());
    act(() => {
      hoisted.scannerState.lastOnDecode?.({ data: 'https://evil.example/not-znteqr' });
    });
    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toHaveTextContent(/not a znteqr link/i);
    expect(hoisted.mockStop).toHaveBeenCalled();
  });

  it('shows guidance when no camera is available', async () => {
    hoisted.MockQrScanner.hasCamera.mockResolvedValue(false);
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    expect(await screen.findByText(/no camera was detected/i)).toBeInTheDocument();
  });

  it('decodes upload via scanImage and navigates', async () => {
    const user = userEvent.setup();
    renderScanner();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /upload qr image/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /upload qr image/i }));
    const input = screen.getByLabelText(/upload an image containing a qr code/i);
    await user.upload(input, new File(['x'], 'qr.png', { type: 'image/png' }));
    await waitFor(() => {
      expect(hoisted.MockQrScanner.scanImage).toHaveBeenCalled();
      expect(hoisted.mockNavigate).toHaveBeenCalledWith('/qr/equipment/eq-upload');
    });
    expect(scanFeedbackHookMock.markPendingFeedback).not.toHaveBeenCalled();
  });

  it('decodes upload when camera start fails', async () => {
    hoisted.mockStart.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'));
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    expect(await screen.findByText(/permission was denied/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /upload qr image/i }));
    const input = screen.getByLabelText(/upload an image containing a qr code/i);
    await user.upload(input, new File(['x'], 'qr.png', { type: 'image/png' }));
    await waitFor(() => {
      expect(hoisted.MockQrScanner.scanImage).toHaveBeenCalled();
      expect(hoisted.mockNavigate).toHaveBeenCalledWith('/qr/equipment/eq-upload');
    });
  });

  it('shows denied-permission guidance when start rejects NotAllowedError', async () => {
    hoisted.mockStart.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'));
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    expect(await screen.findByText(/permission was denied/i)).toBeInTheDocument();
  });

  it('shows policy-blocked guidance when start rejects with permissions policy message', async () => {
    hoisted.mockStart.mockRejectedValueOnce(new Error('Permissions policy violation: camera is not allowed'));
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    expect(await screen.findByText(/security policy/i)).toBeInTheDocument();
  });

  it('calls setCamera when selecting another camera', async () => {
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    await waitFor(() => expect(screen.getByLabelText(/^camera$/i)).toBeInTheDocument());
    await user.click(screen.getByLabelText(/^camera$/i));
    await user.click(await screen.findByRole('option', { name: 'Front' }));
    await waitFor(() => expect(hoisted.mockSetCamera).toHaveBeenCalledWith('cam-front'));
  });

  it('does not switch cameras when the camera list loads after environment start', async () => {
    hoisted.MockQrScanner.listCameras.mockResolvedValue([
      { id: 'cam-front', label: 'Front Camera' },
      { id: 'cam-back', label: 'Back Camera' },
    ]);
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    await waitFor(() => expect(screen.getByLabelText(/^camera$/i)).toBeInTheDocument());
    expect(hoisted.mockSetCamera).not.toHaveBeenCalled();
  });

  it('toggles torch when flash is available', async () => {
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    const flashBtn = await screen.findByRole('button', { name: /turn flash on/i });
    await user.click(flashBtn);
    expect(hoisted.mockToggleFlash).toHaveBeenCalled();
  });

  it('retry scan resets error and recreates the scanner', async () => {
    const user = userEvent.setup();
    renderScanner();
    await startCameraScan(user);
    await waitFor(() => expect(hoisted.scannerState.lastOnDecode).not.toBeNull());
    act(() => {
      hoisted.scannerState.lastOnDecode?.({ data: 'https://evil.example/x' });
    });
    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toHaveTextContent(/not a znteqr link/i);
    const destroysBefore = hoisted.mockDestroy.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /retry scan/i }));
    await waitFor(() =>
      expect(hoisted.mockDestroy.mock.calls.length).toBeGreaterThan(destroysBefore),
    );
  });

  it('destroys scanner on unmount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderScanner();
    await startCameraScan(user);
    await waitFor(() => expect(hoisted.mockStart).toHaveBeenCalled());
    unmount();
    expect(hoisted.mockDestroy).toHaveBeenCalled();
  });
});
