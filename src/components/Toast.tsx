import React from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

function _getIcon(type: ToastType) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-5 h-5 text-success" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-danger" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-warn" />;
    default:
      return <Info className="w-5 h-5 text-accent" />;
  }
}

const _ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({
  toasts,
  removeToast,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-elev-raised max-w-sm transform transition-all duration-300 animate-in slide-in-from-right-10 fade-in ${
            toast.type === 'success'
              ? 'bg-bg border-success/30'
              : toast.type === 'error'
                ? 'bg-bg border-danger/30'
                : toast.type === 'warning'
                  ? 'bg-bg border-warn/30'
                  : 'bg-bg border-accent/20'
          }`}
        >
          <div className="mt-0.5 shrink-0">{_getIcon(toast.type)}</div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium ${
                toast.type === 'success'
                  ? 'text-success'
                  : toast.type === 'error'
                    ? 'text-danger'
                    : toast.type === 'warning'
                      ? 'text-warn'
                      : 'text-accent'
              }`}
            >
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-meta hover:text-muted transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

let _showToast: ((message: string, type?: ToastType) => void) | null = null;

/**
 * Event-based toast API for callers outside the React tree (legacy
 * `(window as any).showToast` replacement). Emits a CustomEvent that
 * `ToastProvider` listens to, so non-React modules can still surface toasts.
 */
export const showToastEvent = (message: string, type: ToastType = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vastuplan:show-toast', { detail: { message, type } }));
  }
  // Fallback if provider isn't mounted yet
  _showToast?.(message, type);
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const toastIdRef = React.useRef(0);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (message: string, type: ToastType = 'info') => {
      toastIdRef.current += 1;
      const id = `toast-${toastIdRef.current}-${Date.now()}`;
      const toast: Toast = { id, message, type, duration: 3000 };

      setToasts((prev) => [...prev, toast]);

      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    },
    [removeToast]
  );

  React.useEffect(() => {
    _showToast = showToast;
    const onShowToast = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; type?: ToastType } | undefined;
      if (detail?.message) showToast(detail.message, detail.type ?? 'info');
    };
    window.addEventListener('vastuplan:show-toast', onShowToast);
    return () => {
      _showToast = null;
      window.removeEventListener('vastuplan:show-toast', onShowToast);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <_ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};
