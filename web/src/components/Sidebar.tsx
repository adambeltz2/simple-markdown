import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useAppState } from '../hooks/useAppState';
import { buildTree, dirname } from '../lib/pathUtils';
import { parseMarkdownFile } from '../lib/frontmatter';
import {
  createDocument,
  deleteDocument,
  moveDocument,
  renameDocument,
  reorderSiblings,
  updateDocumentContent,
  updateDocumentMetadata,
} from '../db/documents';
import type { DocumentRecord, TreeNode } from '../types';

export default function Sidebar() {
  const {
    documents,
    selectedId,
    setSelectedId,
    searchQuery,
    setSearchQuery,
    searchResultIds,
    folderStatus,
    folderName,
    connectFolder,
    reconnectFolder,
    disconnectFolder,
  } = useAppState();
  const tree = useMemo(() => buildTree(documents), [documents]);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(documents.filter((d) => d.isFolder).map((d) => d.path)),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleNewNote = async (parentPath: string) => {
    setExpanded((prev) => new Set(prev).add(parentPath));
    const doc = await createDocument(parentPath, 'Untitled', false);
    setSelectedId(doc.id);
  };

  const handleNewFolder = async (parentPath: string) => {
    setExpanded((prev) => new Set(prev).add(parentPath));
    await createDocument(parentPath, 'New Folder', true);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const raw = await file.text();
    const { content, tags, properties } = parseMarkdownFile(raw);
    const name = file.name.replace(/\.md$/i, '');
    const doc = await createDocument('/', name, false);
    await updateDocumentContent(doc.id, content);
    await updateDocumentMetadata(doc.id, { tags, properties });
    setSelectedId(doc.id);
  };

  const handleDropOnNode = async (target: TreeNode, draggedId: string) => {
    if (draggedId === target.id) return;
    if (target.isFolder) {
      await moveDocument(draggedId, target.path);
      return;
    }
    const parentPath = dirname(target.path);
    await moveDocument(draggedId, parentPath);
    const siblings = documents
      .filter((d: DocumentRecord) => dirname(d.path) === parentPath && d.id !== draggedId)
      .sort((a, b) => a.sortIndex - b.sortIndex);
    const targetIndex = siblings.findIndex((d) => d.id === target.id);
    const orderedIds = siblings.map((d) => d.id);
    orderedIds.splice(targetIndex + 1, 0, draggedId);
    await reorderSiblings(orderedIds);
  };

  const handleDropOnRoot = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain');
    if (draggedId) await moveDocument(draggedId, '/');
  };

  const visibleIds = searchResultIds ? new Set(searchResultIds) : null;

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <input
          className="sidebar__search"
          type="search"
          placeholder="Search notes…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="sidebar__actions">
        <button onClick={() => handleNewNote('/')}>+ Note</button>
        <button onClick={() => handleNewFolder('/')}>+ Folder</button>
        <button onClick={handleImportClick}>+ Import</button>
        <input ref={fileInputRef} type="file" accept=".md,text/markdown" hidden onChange={handleImportFile} />
      </div>
      {folderStatus !== 'unsupported' && (
        <div className="sidebar__folder-status">
          {folderStatus === 'disconnected' && (
            <button className="sidebar__folder-connect" onClick={() => void connectFolder()}>
              🔗 Connect local folder
            </button>
          )}
          {folderStatus === 'connected' && (
            <>
              <span className="sidebar__folder-name" title={`Synced with local folder "${folderName}"`}>
                📁 {folderName}
              </span>
              <button
                className="sidebar__folder-disconnect"
                title="Disconnect local folder"
                aria-label="Disconnect local folder"
                onClick={() => void disconnectFolder()}
              >
                &times;
              </button>
            </>
          )}
          {folderStatus === 'needs-permission' && (
            <button className="sidebar__folder-connect" onClick={() => void reconnectFolder()}>
              ⚠️ Reconnect "{folderName}"
            </button>
          )}
        </div>
      )}
      <div className="sidebar__tree" onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnRoot}>
        {tree.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggleExpanded}
            selectedId={selectedId}
            onSelect={setSelectedId}
            visibleIds={visibleIds}
            onNewNote={handleNewNote}
            onNewFolder={handleNewFolder}
            onDropOnNode={handleDropOnNode}
          />
        ))}
        {tree.length === 0 && <p className="sidebar__empty">No notes yet — create one above.</p>}
      </div>
    </aside>
  );
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  visibleIds: Set<string> | null;
  onNewNote: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
  onDropOnNode: (target: TreeNode, draggedId: string) => void;
}

function nodeMatchesFilter(node: TreeNode, visibleIds: Set<string> | null): boolean {
  if (!visibleIds) return true;
  if (!node.isFolder) return visibleIds.has(node.id);
  return node.children.some((child) => nodeMatchesFilter(child, visibleIds));
}

function TreeNodeItem({
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  visibleIds,
  onNewNote,
  onNewFolder,
  onDropOnNode,
}: TreeNodeItemProps) {
  const [isRenaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(node.name);
  const [isDragOver, setDragOver] = useState(false);

  if (!nodeMatchesFilter(node, visibleIds)) return null;

  const isOpen = node.isFolder && expanded.has(node.path);

  const commitRename = async () => {
    setRenaming(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== node.name) {
      await renameDocument(node.id, trimmed);
    } else {
      setDraftName(node.name);
    }
  };

  const handleDelete = async () => {
    const label = node.isFolder ? `"${node.name}" and everything inside it` : `"${node.name}"`;
    if (window.confirm(`Delete ${label}?`)) {
      await deleteDocument(node.id);
      if (selectedId === node.id) onSelect(null);
    }
  };

  return (
    <div className="tree-node">
      <div
        className={`tree-node__row${selectedId === node.id ? ' is-selected' : ''}${isDragOver ? ' is-drag-over' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/plain', node.id)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const draggedId = e.dataTransfer.getData('text/plain');
          if (draggedId) onDropOnNode(node, draggedId);
        }}
        onClick={() => (node.isFolder ? onToggle(node.path) : onSelect(node.id))}
        onDoubleClick={() => setRenaming(true)}
      >
        <span className="tree-node__icon">{node.isFolder ? (isOpen ? '📂' : '📁') : '📄'}</span>
        {isRenaming ? (
          <input
            className="tree-node__rename-input"
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraftName(node.name);
                setRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-node__label">{node.name}</span>
        )}
        <span className="tree-node__spacer" />
        <span className="tree-node__actions" onClick={(e) => e.stopPropagation()}>
          {node.isFolder && (
            <>
              <button title="New note" onClick={() => onNewNote(node.path)}>
                +📄
              </button>
              <button title="New folder" onClick={() => onNewFolder(node.path)}>
                +📁
              </button>
            </>
          )}
          <button title="Delete" onClick={handleDelete}>
            🗑
          </button>
        </span>
      </div>
      {node.isFolder && isOpen && (
        <div className="tree-node__children">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              visibleIds={visibleIds}
              onNewNote={onNewNote}
              onNewFolder={onNewFolder}
              onDropOnNode={onDropOnNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
