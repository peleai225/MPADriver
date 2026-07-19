import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-danger-500/20 grid place-items-center mb-4">
            <span className="text-danger-400 text-2xl">⚠</span>
          </div>
          <p className="text-white font-bold text-lg mb-2">Erreur inattendue</p>
          <p className="text-danger-400 text-sm font-mono mb-6 max-w-sm break-all">{error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-6 py-3 rounded-2xl bg-brand-500 text-white font-bold text-sm tap"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
