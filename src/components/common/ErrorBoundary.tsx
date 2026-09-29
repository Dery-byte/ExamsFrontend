import React from 'react';
import { reportError } from '../../utils/errorReporter';

type State = { failed: boolean };

/** Shows a friendly message instead of a blank page when a page crashes, and reports the crash. */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(`${error.name}: ${error.message}`, `${error.stack ?? ''}\n\nComponent stack:${info.componentStack ?? ''}`);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    // Navigating to another page clears the error
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, textAlign: 'center', background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 8px 30px rgba(15,23,42,0.08)' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 19, color: '#1e293b' }}>This page ran into a problem</h2>
          <p style={{ margin: '0 0 18px', fontSize: 14, color: '#64748b' }}>
            It has been reported to the developers automatically. Reload the page, or go back and try again.
          </p>
          <button onClick={() => window.location.reload()}
            style={{ height: 40, padding: '0 18px', border: 'none', borderRadius: 9, background: '#5156be', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
