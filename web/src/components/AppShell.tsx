import { useAppState } from '../hooks/useAppState';
import Sidebar from './Sidebar';
import EditorPane from './EditorPane';
import ContextSidebar from './ContextSidebar';

export default function AppShell() {
  const { isRightSidebarOpen, toggleRightSidebar } = useAppState();

  return (
    <div className="app-shell">
      <Sidebar />
      <EditorPane />
      {isRightSidebarOpen ? (
        <ContextSidebar />
      ) : (
        <button className="app-shell__reopen-panel" title="Show panel" onClick={toggleRightSidebar}>
          «
        </button>
      )}
    </div>
  );
}
