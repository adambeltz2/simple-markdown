export interface WikiLinkMatch {
  raw: string;
  target: string;
  label: string;
  index: number;
}

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function findWikiLinks(text: string): WikiLinkMatch[] {
  const matches: WikiLinkMatch[] = [];
  const re = new RegExp(WIKILINK_RE);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const target = match[1].trim();
    matches.push({
      raw: match[0],
      target,
      label: (match[2] ?? target).trim(),
      index: match.index,
    });
  }
  return matches;
}

export function extractWikiLinkTargets(text: string): string[] {
  return Array.from(new Set(findWikiLinks(text).map((m) => m.target)));
}

export function renameWikiLinksInContent(content: string, oldTitle: string, newTitle: string): string {
  const re = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;
  return content.replace(re, (full, target: string, aliasPart: string | undefined) => {
    if (target.trim().toLowerCase() === oldTitle.trim().toLowerCase()) {
      return `[[${newTitle}${aliasPart ?? ''}]]`;
    }
    return full;
  });
}
