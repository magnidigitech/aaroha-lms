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
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      sessionStorage.clear();
      // Keep persistent login unless requested
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
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

            {/* Action buttons with visible keyboard focus */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0A7CB3] focus:ring-offset-2 transition-all"
              >
                <RefreshCw size={14} />
                <span>Reload View</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetState}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all"
              >
                <RotateCcw size={14} />
                <span>Retry View</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all"
              >
                <Home size={14} />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
