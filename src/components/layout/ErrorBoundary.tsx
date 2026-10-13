import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="m-8 rounded-lg border border-red-500/50 bg-red-950 p-6 text-red-100">
        <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
        <p className="mb-4 text-sm">{this.state.error.message}. Your project is auto-saved; reloading is safe.</p>
        <button type="button" className="rounded-md bg-red-100 px-3 py-1.5 text-sm text-red-950" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
