import matter from 'gray-matter';

export interface ParsedFrontmatter {
  content: string;
  tags: string[];
  properties: Record<string, string>;
}

export function parseMarkdownFile(raw: string): ParsedFrontmatter {
  const { content, data } = matter(raw);
  const tags = Array.isArray(data.tags) ? data.tags.map((t) => String(t)) : [];
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'tags') continue;
    properties[key] = String(value);
  }
  return { content: content.trim(), tags, properties };
}

export function serializeMarkdownFile(doc: { content: string; tags: string[]; properties: Record<string, string> }): string {
  const data: Record<string, unknown> = { ...doc.properties };
  if (doc.tags.length > 0) data.tags = doc.tags;
  if (Object.keys(data).length === 0) return doc.content;
  return matter.stringify(doc.content, data);
}
