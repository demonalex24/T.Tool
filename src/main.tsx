import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../世界树工程设计系统/tokens.css';
import './design/bundle.css';
import './styles.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  render() {
    if (this.state.error) return <div className="wb-empty"><b>工作台暂时无法显示</b><p>工程文件仍保存在原文件夹。重新打开软件后可以继续。</p><pre>{this.state.error}</pre><button className="tt-btn tt-btn--secondary" onClick={() => location.reload()}>重新打开</button></div>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>);
