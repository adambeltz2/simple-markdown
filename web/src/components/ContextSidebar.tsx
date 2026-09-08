import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAppState } from '../hooks/useAppState';
import { updateDocumentMetadata } from '../db/documents';
import { getBacklinks } from '../db/links';
import type { Backlink } from '../types';

export default function ContextSidebar() {
  const { selectedId, setSelectedId, toggleRightSidebar } = useAppState();
  const activeDoc = useLiveQuery(
    async () => (selectedId ? db.documents.get(selectedId) : undefined),
    [selectedId],
  );
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [propKeyDraft, setPropKeyDraft] = useState('');
  const [propValueDraft, setPropValueDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (selectedId ? getBacklinks(selectedId) : Promise.resolve<Backlink[]>([])).then((links) => {
      if (!cancelled) setBacklinks(links);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, activeDoc?.content]);

  if (!activeDoc) {
    return <aside className="context-sidebar context-sidebar--empty" />;
  }

  const addTag = async () => {
    const tag = tagDraft.trim();
    if (!tag || activeDoc.tags.includes(tag)) {
      setTagDraft('');
      return;
    }
    await updateDocumentMetadata(activeDoc.id, { tags: [...activeDoc.tags, tag] });
    setTagDraft('');
  };

  const removeTag = async (tag: string) => {
    await updateDocumentMetadata(activeDoc.id, { tags: activeDoc.tags.filter((t) => t !== tag) });
  };

  const addProperty = async () => {
    const key = propKeyDraft.trim();
    if (!key) return;
    await updateDocumentMetadata(activeDoc.id, { properties: { ...activeDoc.properties, [key]: propValueDraft } });
    setPropKeyDraft('');
    setPropValueDraft('');
  };

  const removeProperty = async (key: string) => {
    const rest = { ...activeDoc.properties };
    delete rest[key];
    await updateDocumentMetadata(activeDoc.id, { properties: rest });
  };

  return (
    <aside className="context-sidebar">
      <button className="context-sidebar__collapse" title="Hide panel" onClick={toggleRightSidebar}>
        »
      </button>

      <div className="context-sidebar__section">
        <h3>Metadata</h3>
        <dl className="context-sidebar__meta">
          <dt>Created</dt>
          <dd>{new Date(activeDoc.createdAt).toLocaleString()}</dd>
          <dt>Updated</dt>
          <dd>{new Date(activeDoc.updatedAt).toLocaleString()}</dd>
        </dl>
      </div>

      <div className="context-sidebar__section">
        <h3>Tags</h3>
        <div className="tag-list">
          {activeDoc.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
              <button onClick={() => removeTag(tag)}>&times;</button>
            </span>
          ))}
        </div>
        <div className="inline-form">
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addTag();
            }}
            placeholder="Add tag…"
          />
          <button onClick={addTag}>Add</button>
        </div>
      </div>

      <div className="context-sidebar__section">
        <h3>Properties</h3>
        <table className="property-table">
          <tbody>
            {Object.entries(activeDoc.properties).map(([key, value]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{value}</td>
                <td>
                  <button onClick={() => removeProperty(key)}>&times;</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="inline-form">
          <input placeholder="key" value={propKeyDraft} onChange={(e) => setPropKeyDraft(e.target.value)} />
          <input placeholder="value" value={propValueDraft} onChange={(e) => setPropValueDraft(e.target.value)} />
          <button onClick={addProperty}>Add</button>
        </div>
      </div>

      <div className="context-sidebar__section">
        <h3>Backlinks ({backlinks.length})</h3>
        <ul className="backlink-list">
          {backlinks.map(({ source }) => (
            <li key={source.id}>
              <button className="link-button" onClick={() => setSelectedId(source.id)}>
                {source.title}
              </button>
            </li>
          ))}
          {backlinks.length === 0 && <li className="backlink-list__empty">No notes link here yet.</li>}
        </ul>
      </div>
    </aside>
  );
}
