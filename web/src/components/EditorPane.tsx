import { useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAppState } from '../hooks/useAppState';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { renameDocument, updateDocumentContent } from '../db/documents';
import { serializeMarkdownFile } from '../lib/frontmatter';
import MarkdownEditor from '../editor/MarkdownEditor';
import type { DocumentSummary } from '../types';

export default function EditorPane() {
  const { selectedId, setSelectedId, documents, toggleRightSidebar } = useAppState();
  const activeDoc = useLiveQuery(
    async () => (selectedId ? db.documents.get(selectedId) : undefined),
    [selectedId],
  );

  const titleInputRef = useRef<HTMLInputElement>(null);

  const documentSummaries = useMemo<DocumentSummary[]>(
    () => documents.filter((d) => !d.isFolder).map((d) => ({ id: d.id, title: d.title })),
    [documents],
  );

  const debouncedSave = useDebouncedCallback((id: string, markdown: string) => {
    void updateDocumentContent(id, markdown);
  }, 400);

  const handleNavigate = (target: string) => {
    const normalized = target.trim().toLowerCase();
    const match = documents.find((d) => !d.isFolder && d.title.toLowerCase() === normalized);
    if (match) setSelectedId(match.id);
  };

  const commitTitle = async () => {
    if (!activeDoc) return;
    const trimmed = titleInputRef.current?.value.trim() ?? '';
    if (trimmed && trimmed !== activeDoc.title) {
      await renameDocument(activeDoc.id, trimmed);
    } else if (titleInputRef.current) {
      titleInputRef.current.value = activeDoc.title;
    }
  };

  const handleExport = () => {
    if (!activeDoc) return;
    const raw = serializeMarkdownFile(activeDoc);
    const blob = new Blob([raw], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeDoc.title}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedId || !activeDoc) {
    return (
      <main className="editor-pane editor-pane--empty">
        <p>Select a note, or create a new one to start writing.</p>
      </main>
    );
  }

  return (
    <main className="editor-pane">
      <header className="editor-pane__header">
        <button className="editor-pane__back" title="Back to notes" onClick={() => setSelectedId(null)}>
          ‹ Notes
        </button>
        <input
          key={activeDoc.id}
          ref={titleInputRef}
          className="editor-pane__title"
          defaultValue={activeDoc.title}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="editor-pane__path">{activeDoc.path}</span>
        <button className="editor-pane__meta-toggle" title="Note info" onClick={toggleRightSidebar}>
          ⓘ
        </button>
        <button className="editor-pane__export" onClick={handleExport}>
          Export .md
        </button>
      </header>
      <MarkdownEditor
        key={activeDoc.id}
        content={activeDoc.content}
        documents={documentSummaries}
        onChange={(markdown) => debouncedSave(activeDoc.id, markdown)}
        onNavigate={handleNavigate}
      />
    </main>
  );
}
