import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { DocumentRecord } from '../types';
import { buildSearchIndex, searchDocuments } from '../lib/search';

interface AppStateValue {
  documents: DocumentRecord[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResultIds: string[] | null;
  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
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

  useEffect(() => {
    if (!indexReady) {
      buildSearchIndex(documents);
      setIndexReady(true);
    }
    // Only build the full index once, from the first load; later mutations
    // update it incrementally from db/documents.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, indexReady]);

  const searchResultIds = useMemo(() => {
    if (!indexReady || !searchQuery.trim()) return null;
    return searchDocuments(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, indexReady]);

  const value: AppStateValue = {
    documents,
    selectedId,
    setSelectedId,
    searchQuery,
    setSearchQuery,
    searchResultIds,
    isRightSidebarOpen,
    toggleRightSidebar: () => setRightSidebarOpen((v) => !v),
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
