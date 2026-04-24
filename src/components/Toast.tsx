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
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-rose-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    default:
      return <Info className="w-5 h-5 text-indigo-500" />;
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
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm transform transition-all duration-300 animate-in slide-in-from-right-10 fade-in ${
            toast.type === 'success'
              ? 'bg-white border-emerald-200'
              : toast.type === 'error'
                ? 'bg-white border-rose-200'
                : toast.type === 'warning'
                  ? 'bg-white border-amber-200'
                  : 'bg-white border-indigo-200'
          }`}
        >
          <div className="mt-0.5 shrink-0">{_getIcon(toast.type)}</div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium ${
                toast.type === 'success'
                  ? 'text-emerald-700'
                  : toast.type === 'error'
                    ? 'text-rose-700'
                    : toast.type === 'warning'
                      ? 'text-amber-700'
                      : 'text-indigo-700'
              }`}
            >
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
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

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <_ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};
