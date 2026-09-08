import { InputRule, mergeAttributes, Node } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import type { DocumentSummary } from '../../types';
import { createWikiLinkSuggestionRender } from './wikiLinkSuggestionRender';

export interface WikiLinkOptions {
  onNavigate: (target: string) => void;
  getDocuments: () => DocumentSummary[];
}

export const WikiLinkSuggestionPluginKey = new PluginKey('wikiLinkSuggestion');

const WIKILINK_INPUT_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/;

interface MarkdownSerializerState {
  write: (text: string) => void;
}

interface MarkdownWikiLinkNode {
  attrs: { target: string; label: string };
}

function replaceWikiLinkText(root: HTMLElement): void {
  const SKIP_TAGS = new Set(['CODE', 'PRE']);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let parent = node.parentElement;
      while (parent) {
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        parent = parent.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    textNodes.push(node as Text);
  }

  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? '';
    if (!text.includes('[[')) continue;

    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    let matched = false;
    const fragment = document.createDocumentFragment();

    while ((match = re.exec(text))) {
      matched = true;
      const [full, target, label] = match;
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const span = document.createElement('span');
      span.setAttribute('data-type', 'wiki-link');
      span.setAttribute('data-target', target.trim());
      if (label) span.setAttribute('data-label', label.trim());
      span.textContent = (label ?? target).trim();
      fragment.appendChild(span);
      lastIndex = match.index + full.length;
    }

    if (!matched) continue;
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  }
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      onNavigate: () => {},
      getDocuments: () => [],
    };
  },

  addAttributes() {
    return {
      target: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-target') ?? '',
        renderHTML: () => ({}),
      },
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') ?? element.textContent ?? '',
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="wiki-link"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'wiki-link',
        'data-target': node.attrs.target as string,
        class: 'wiki-link',
      }),
      (node.attrs.label as string) || (node.attrs.target as string),
    ];
  },

  renderText({ node }) {
    const target = node.attrs.target as string;
    const label = node.attrs.label as string;
    return label && label !== target ? `[[${target}|${label}]]` : `[[${target}]]`;
  },

  addStorage() {
    return {
      markdown: {
        serialize: (state: MarkdownSerializerState, node: MarkdownWikiLinkNode) => {
          const { target, label } = node.attrs;
          state.write(label && label !== target ? `[[${target}|${label}]]` : `[[${target}]]`);
        },
        parse: {
          updateDOM(element: HTMLElement) {
            replaceWikiLinkText(element);
          },
        },
      },
    };
  },

  addNodeView() {
    return ({ node }) => {
      const span = document.createElement('span');
      span.className = 'wiki-link';
      span.dataset.type = 'wiki-link';
      span.dataset.target = node.attrs.target as string;
      span.textContent = (node.attrs.label as string) || (node.attrs.target as string);
      span.addEventListener('click', (event) => {
        event.preventDefault();
        this.options.onNavigate(node.attrs.target as string);
      });
      return { dom: span };
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: WIKILINK_INPUT_RE,
        handler: ({ state, range, match }) => {
          const target = match[1].trim();
          const label = (match[2] ?? match[1]).trim();
          state.tr.replaceWith(range.from, range.to, this.type.create({ target, label }));
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<DocumentSummary, DocumentSummary>({
        editor: this.editor,
        char: '[[',
        allowSpaces: true,
        pluginKey: WikiLinkSuggestionPluginKey,
        items: ({ query }) => {
          const q = query.trim().toLowerCase();
          const all = this.options.getDocuments();
          return (q ? all.filter((d) => d.title.toLowerCase().includes(q)) : all).slice(0, 8);
        },
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, {
              type: this.name,
              attrs: { target: props.title, label: props.title },
            })
            .run();
        },
        render: createWikiLinkSuggestionRender(),
      }),
    ];
  },
});
