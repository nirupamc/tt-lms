import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service here
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report to error tracking service (e.g., Sentry)
    // reportError(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { title = "Something went wrong", showDetails = false } = this.props;

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-slate-600 dark:text-slate-400">
                    We're sorry, but something unexpected happened. 
                    Don't worry - your progress is saved and this is likely a temporary issue.
                  </p>
                  {this.state.error?.message && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                      Error: {this.state.error.message}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={this.handleRetry} className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={this.handleReload}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                </div>

                {/* Expandable error details for development */}
                {showDetails && this.state.error && (
                  <details className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Technical Details (for developers)
                    </summary>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong className="text-red-600 dark:text-red-400">Error:</strong>
                        <pre className="mt-1 text-xs bg-white dark:bg-slate-900 p-2 rounded overflow-auto">
                          {this.state.error && this.state.error.toString()}
                        </pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong className="text-red-600 dark:text-red-400">Stack Trace:</strong>
                          <pre className="mt-1 text-xs bg-white dark:bg-slate-900 p-2 rounded overflow-auto max-h-40">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Help text */}
                <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                  If this problem persists, please contact support with the error details above.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Video-specific error boundary with custom messaging
export const VideoErrorBoundary = ({ children }) => (
  <ErrorBoundary 
    title="Video Player Error"
    showDetails={false}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;