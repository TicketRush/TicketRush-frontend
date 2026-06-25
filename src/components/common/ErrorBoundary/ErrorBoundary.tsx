// ErrorBoundary — 컴포넌트 렌더링 중 발생한 에러를 잡아 fallback UI 표시
// 지난 흰 화면 사건의 재발 방지 목적
//
// 사용법:
//   <ErrorBoundary>
//     <App />
//   </ErrorBoundary>
//
// 또는 더 좁은 범위:
//   <ErrorBoundary fallback={<MyFallback />}>
//     <RiskyComponent />
//   </ErrorBoundary>

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** 에러 발생 시 호출 (Sentry 같은 로거에 보낼 때 사용) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // TODO: 프로덕션에서는 외부 로거 전송 (Sentry 등)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback이 있으면 사용
      if (this.props.fallback) return this.props.fallback;

      // 기본 fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white border border-border rounded-xl p-8 text-center">
            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
            <h1 className="text-xl font-bold mb-2">예상치 못한 오류가 발생했습니다</h1>
            <p className="text-sm text-text-secondary mb-6">
              화면을 표시하는 도중 문제가 발생했습니다.
              <br />
              잠시 후 다시 시도해주세요.
            </p>

            {/* 개발 환경에서만 상세 에러 표시 */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-red-50 border border-red-200 rounded p-3 mb-4">
                <summary className="text-xs font-semibold text-red-900 cursor-pointer">
                  개발 환경: 에러 상세 정보
                </summary>
                <pre className="text-[10px] text-red-700 mt-2 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold flex items-center justify-center gap-1"
              >
                <RotateCcw size={14} /> 다시 시도
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1"
              >
                <Home size={14} /> 홈으로
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
