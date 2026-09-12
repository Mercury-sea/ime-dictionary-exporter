import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main className="loading-screen"><h1>页面暂时无法使用</h1><p>请重新打开文件，或用其他浏览器打开。现有本地保存数据不会被自动清除。</p><button onClick={()=>location.reload()}>重新载入</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
