import { useAppState } from '../hooks/useAppState';
import Sidebar from './Sidebar';
import EditorPane from './EditorPane';
import ContextSidebar from './ContextSidebar';

export default function AppShell() {
  const { selectedId, isRightSidebarOpen, toggleRightSidebar } = useAppState();

  return (
    <div className="app-shell" data-mobile-view={selectedId ? 'editor' : 'list'}>
      <Sidebar />
      <EditorPane />
      {isRightSidebarOpen ? (
        <>
          {selectedId && <div className="context-sidebar-backdrop" onClick={toggleRightSidebar} />}
          <ContextSidebar />
        </>
      ) : (
        <button className="app-shell__reopen-panel" title="Show panel" onClick={toggleRightSidebar}>
          «
        </button>
      )}
    </div>
  );
}
