import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { DocumentRecord } from '../types';
import { buildSearchIndex, searchDocuments } from '../lib/search';
import {
  connectLocalFolder,
  disconnectLocalFolder,
  getSavedFolderName,
  reconnectSavedFolder,
  supportsLocalFolder,
  tryReconnectSavedFolder,
} from '../lib/localFolder';

export type LocalFolderStatus = 'unsupported' | 'disconnected' | 'connected' | 'needs-permission';

interface AppStateValue {
  documents: DocumentRecord[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResultIds: string[] | null;
  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
  folderStatus: LocalFolderStatus;
  folderName: string | null;
  connectFolder: () => Promise<void>;
  reconnectFolder: () => Promise<void>;
  disconnectFolder: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const documents = useLiveQuery(() => db.documents.toArray(), [], []) ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 769px)').matches,
  );
  const [indexReady, setIndexReady] = useState(false);
  const [folderStatus, setFolderStatus] = useState<LocalFolderStatus>(() =>
    supportsLocalFolder() ? 'disconnected' : 'unsupported',
  );
  const [folderName, setFolderName] = useState<string | null>(null);

  useEffect(() => {
    if (!indexReady) {
      buildSearchIndex(documents);
      setIndexReady(true);
    }
    // Only build the full index once, from the first load; later mutations
    // update it incrementally from db/documents.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, indexReady]);

  useEffect(() => {
    if (!supportsLocalFolder()) return;
    void (async () => {
      const savedName = await getSavedFolderName();
      if (!savedName) return;
      const handle = await tryReconnectSavedFolder();
      setFolderName(savedName);
      setFolderStatus(handle ? 'connected' : 'needs-permission');
    })();
  }, []);

  const searchResultIds = useMemo(() => {
    if (!indexReady || !searchQuery.trim()) return null;
    return searchDocuments(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, indexReady]);

  const connectFolder = async () => {
    try {
      const { handle } = await connectLocalFolder();
      setFolderName(handle.name);
      setFolderStatus('connected');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // user cancelled the picker
      console.warn('Failed to connect a local folder:', err);
    }
  };

  const reconnectFolder = async () => {
    const handle = await reconnectSavedFolder();
    if (handle) {
      setFolderName(handle.name);
      setFolderStatus('connected');
    }
  };

  const disconnectFolder = async () => {
    await disconnectLocalFolder();
    setFolderName(null);
    setFolderStatus('disconnected');
  };

  const value: AppStateValue = {
    documents,
    selectedId,
    setSelectedId,
    searchQuery,
    setSearchQuery,
    searchResultIds,
    isRightSidebarOpen,
    toggleRightSidebar: () => setRightSidebarOpen((v) => !v),
    folderStatus,
    folderName,
    connectFolder,
    reconnectFolder,
    disconnectFolder,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
