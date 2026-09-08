import type { DocumentRecord, TreeNode } from '../types';

export function dirname(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx <= 0 ? '/' : path.slice(0, idx);
}

export function basename(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
}

export function titleFromPath(path: string): string {
  return basename(path).replace(/\.md$/i, '');
}

export function joinPath(dir: string, name: string): string {
  if (dir === '/' || dir === '') return `/${name}`;
  return `${dir}/${name}`;
}

export function isDescendantPath(path: string, ancestorFolderPath: string): boolean {
  return path === ancestorFolderPath || path.startsWith(`${ancestorFolderPath}/`);
}

export function buildTree(documents: DocumentRecord[]): TreeNode[] {
  const nodeByPath = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const doc of documents) {
    nodeByPath.set(doc.path, {
      id: doc.id,
      name: doc.isFolder ? basename(doc.path) : titleFromPath(doc.path),
      path: doc.path,
      isFolder: doc.isFolder,
      sortIndex: doc.sortIndex,
      children: [],
    });
  }

  for (const node of nodeByPath.values()) {
    const parent = nodeByPath.get(dirname(node.path));
    if (parent && parent.isFolder) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursively = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sortIndex - b.sortIndex);
    for (const node of nodes) sortRecursively(node.children);
  };
  sortRecursively(roots);

  return roots;
}
