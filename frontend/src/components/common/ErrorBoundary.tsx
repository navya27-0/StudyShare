import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });
    // Log error to console for diagnostic tracing
    console.error('Unhandled React ErrorBoundary caught an exception:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected client runtime fault occurred.';
      const componentStack = this.state.errorInfo?.componentStack?.trim() || '';

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            maxWidth: '680px',
            margin: '40px auto',
            padding: '32px 24px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid var(--status-danger)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Tag */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--status-danger)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            <AlertOctagon size={16} aria-hidden="true" />
            <span>// SYSTEM FAULT EXCEPTION CAUGHT //</span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 10px',
            }}
          >
            {this.props.fallbackTitle || 'The Academic Ledger Encountered an Application Error'}
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: '0 0 18px',
            }}
          >
            An unhandled runtime error interrupted this view. Your session and saved data remain intact.
            You can attempt to reset this view or navigate back to the main catalog.
          </p>

          {/* Diagnostic Error Details */}
          <div
            style={{
              backgroundColor: 'var(--bg-subdued)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              marginBottom: '24px',
              overflowX: 'auto',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              DIAGNOSTIC TRACE:
            </div>
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--status-danger)',
                display: 'block',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {errorMessage}
            </code>
            {componentStack && (
              <details style={{ marginTop: '8px' }}>
                <summary
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  View component stack trace
                </summary>
                <pre
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10.5px',
                    color: 'var(--text-secondary)',
                    marginTop: '6px',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}
                >
                  {componentStack}
                </pre>
              </details>
            )}
          </div>

          {/* Action Recovery Triggers */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={this.handleReset}
              className="touch-target"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: 'var(--accent-core)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <RotateCcw size={15} aria-hidden="true" />
              <span>Retry Recovering View</span>
            </button>

            <a
              href="/"
              className="touch-target"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                backgroundColor: 'var(--bg-subdued)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
              }}
            >
              <Home size={15} aria-hidden="true" />
              <span>Return to Catalog</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
