import React from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an unhandled rendering error:', error, errorInfo);

    // Auto-recover once from stale dynamic chunk hash mismatches caused by recent deployments
    const errorMsg = error?.message || '';
    const isChunkError = (
      errorMsg.includes('dynamically imported module') ||
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('Failed to fetch') ||
      error?.name === 'ChunkLoadError'
    );
    if (isChunkError) {
      try {
        const hasRetried = sessionStorage.getItem('aaroha_chunk_reload_attempted');
        if (!hasRetried) {
          sessionStorage.setItem('aaroha_chunk_reload_attempted', 'true');
          window.location.reload();
          return;
        }
      } catch (e) {}
    }
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem('aaroha_chunk_reload_attempted');
    } catch (e) {}
    window.location.reload();
  };

  handleResetState = () => {
    try {
      sessionStorage.removeItem('aaroha_selected_course_id');
      sessionStorage.removeItem('aaroha_chunk_reload_attempted');
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleSafeRecover = () => {
    try {
      sessionStorage.removeItem('aaroha_selected_course_id');
      sessionStorage.removeItem('aaroha_chunk_reload_attempted');
    } catch (e) {}
    window.location.href = '/?view=catalog';
  };

  handleHardReset = () => {
    try {
      localStorage.removeItem('aaroha_token');
      localStorage.removeItem('aaroha_user');
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || String(this.state.error || 'Unknown render exception');

      return (
        <div 
          role="alert" 
          aria-live="assertive"
          className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50"
        >
          <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Dashboard Synchronization Notice
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                An unexpected client rendering error occurred while synchronizing this view. Your institutional database records remain secure.
              </p>
            </div>

            {/* Diagnostic Details Disclosure for rapid triage */}
            {this.state.error && (
              <details className="text-left bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs" open>
                <summary className="font-semibold text-slate-700 cursor-pointer hover:text-slate-900 select-none flex items-center justify-between">
                  <span>Diagnostic Details: {this.state.error?.name || 'Error'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">click to collapse</span>
                </summary>
                <div className="mt-2.5 font-mono text-[11px] text-rose-600 break-words whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200/80 max-h-36 overflow-y-auto">
                  {errorMsg}
                </div>
              </details>
            )}

            {/* Action buttons with visible keyboard focus */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4.5 py-2.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0A7CB3] focus:ring-offset-2 transition-all"
              >
                <RefreshCw size={14} />
                <span>Reload View</span>
              </button>

              <button
                type="button"
                onClick={this.handleSafeRecover}
                className="w-full sm:w-auto px-4.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all"
              >
                <RotateCcw size={14} />
                <span>Return to Catalog</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium inline-flex items-center justify-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all"
                title="Clears local cache and signs out"
              >
                <Home size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
