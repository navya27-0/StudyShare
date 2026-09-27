import { createContext, useContext, useState, useCallback, type ReactNode, type FC } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (text: string, type?: ToastType, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((text: string, type: ToastType = 'info', durationMs = 4500) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, type }]); // Keep at most 4 toasts visible

    if (durationMs > 0) {
      setTimeout(() => {
        removeToast(id);
      }, durationMs);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        role="region"
        aria-label="Notification alerts"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '420px',
          width: 'calc(100vw - 32px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          let borderColor = 'var(--accent-core)';
          let icon = <Info size={16} color="var(--accent-core)" aria-hidden="true" />;
          let label = 'NOTICE';

          if (toast.type === 'success') {
            borderColor = 'var(--status-verified)';
            icon = <CheckCircle2 size={16} color="var(--status-verified)" aria-hidden="true" />;
            label = 'SUCCESS';
          } else if (toast.type === 'warning') {
            borderColor = 'var(--status-exam)';
            icon = <AlertTriangle size={16} color="var(--status-exam)" aria-hidden="true" />;
            label = 'WARNING';
          } else if (toast.type === 'error') {
            borderColor = 'var(--status-danger)';
            icon = <AlertCircle size={16} color="var(--status-danger)" aria-hidden="true" />;
            label = 'ERROR';
          }

          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              style={{
                pointerEvents: 'auto',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderLeft: `4px solid ${borderColor}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '10px',
                transition: 'all 120ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ marginTop: '2px', flexShrink: 0 }}>{icon}</div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: borderColor,
                      letterSpacing: '0.04em',
                      marginBottom: '2px',
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}
                  >
                    {toast.text}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                style={{
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  flexShrink: 0,
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
