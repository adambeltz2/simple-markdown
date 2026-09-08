export interface DocumentRecord {
  id: string;
  path: string;
  title: string;
  isFolder: boolean;
  content: string;
  tags: string[];
  properties: Record<string, string>;
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface LinkRecord {
  sourceId: string;
  targetPath: string;
  targetId: string | null;
}

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  sortIndex: number;
  children: TreeNode[];
}

export type DocumentSummary = Pick<DocumentRecord, 'id' | 'title'>;

export interface Backlink {
  source: DocumentRecord;
  targetPath: string;
}
