import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QrShareModal } from './QrShareModal';
import { ToastProvider } from './Toast';
import * as utils from '../utils';

const onClose = vi.fn();
const url = 'https://vastuplan.app/?mode=view&plan=example';

describe('QrShareModal', () => {
  beforeEach(() => {
    onClose.mockClear();
    vi.spyOn(utils, 'copyToClipboardWithFallback').mockResolvedValue({
      ok: true,
      method: 'clipboard',
    });
  });

  it('renders the QR code and share URL', () => {
    render(
      <ToastProvider>
        <QrShareModal url={url} onClose={onClose} />
      </ToastProvider>
    );

    expect(screen.getByTestId('qr-share-modal')).toBeInTheDocument();
    expect(screen.getByTestId('qr-code-svg')).toBeInTheDocument();
    expect(screen.getByTestId('qr-share-url')).toHaveValue(url);
  });

  it('calls onClose when the close button is clicked', () => {
    render(
      <ToastProvider>
        <QrShareModal url={url} onClose={onClose} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('qr-share-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('copies the link when the copy button is clicked', async () => {
    render(
      <ToastProvider>
        <QrShareModal url={url} onClose={onClose} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('qr-copy-link'));
    expect(utils.copyToClipboardWithFallback).toHaveBeenCalledWith(url);
  });

  it('downloads the QR SVG when the download button is clicked', () => {
    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement('a');
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {});

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return anchor;
      return originalCreateElement(tag);
    });

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(
      <ToastProvider>
        <QrShareModal url={url} onClose={onClose} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('qr-download-svg'));
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchor.download).toBe('vastuplan-share-qr.svg');
    expect(anchor.href).toBe('blob:mock');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
