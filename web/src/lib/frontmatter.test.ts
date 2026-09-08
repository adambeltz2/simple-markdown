import { describe, expect, it } from 'vitest';
import { parseMarkdownFile, serializeMarkdownFile } from './frontmatter';

describe('parseMarkdownFile', () => {
  it('separates frontmatter tags/properties from the body', () => {
    const raw = `---\ntags:\n  - foo\n  - bar\nauthor: Ada\n---\n# Hello\n\nBody text.`;

    const parsed = parseMarkdownFile(raw);

    expect(parsed.tags).toEqual(['foo', 'bar']);
    expect(parsed.properties).toEqual({ author: 'Ada' });
    expect(parsed.content).toBe('# Hello\n\nBody text.');
  });

  it('handles a file with no frontmatter', () => {
    const parsed = parseMarkdownFile('Just plain content.');

    expect(parsed.tags).toEqual([]);
    expect(parsed.properties).toEqual({});
    expect(parsed.content).toBe('Just plain content.');
  });
});

describe('serializeMarkdownFile', () => {
  it('returns bare content when there are no tags or properties', () => {
    const out = serializeMarkdownFile({ content: 'Hello', tags: [], properties: {} });
    expect(out).toBe('Hello');
  });

  it('emits frontmatter when tags or properties are present', () => {
    const out = serializeMarkdownFile({ content: 'Hello', tags: ['foo'], properties: { author: 'Ada' } });
    expect(out).toContain('---');
    expect(out).toContain('Hello');
  });

  it('round-trips through parse -> serialize -> parse', () => {
    const original = { content: 'Body text.', tags: ['foo', 'bar'], properties: { author: 'Ada' } };
    const serialized = serializeMarkdownFile(original);
    const reparsed = parseMarkdownFile(serialized);

    expect(reparsed).toEqual(original);
  });
});
