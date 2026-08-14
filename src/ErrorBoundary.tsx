import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// 页面崩溃时白屏什么都看不到，这里把报错显示出来，方便几个人自己反馈问题。
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[页面崩溃]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="mb-2 font-medium text-red-800">这个页面出错了</p>
        <p className="mb-3 text-sm text-red-700">{error.message}</p>
        <pre className="mb-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-gray-600">
          {error.stack}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700"
        >
          重试
        </button>
      </div>
    );
  }
}
