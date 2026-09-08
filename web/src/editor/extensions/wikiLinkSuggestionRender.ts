import type { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import type { DocumentSummary } from '../../types';

interface RenderHandle {
  element: HTMLDivElement;
  unmount: (() => void) | null;
  items: DocumentSummary[];
  selectedIndex: number;
  command: ((item: DocumentSummary) => void) | null;
}

function renderItems(handle: RenderHandle): void {
  handle.element.innerHTML = '';
  if (handle.items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'wiki-suggestion__empty';
    empty.textContent = 'No matching notes';
    handle.element.appendChild(empty);
    return;
  }
  handle.items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = `wiki-suggestion__item${index === handle.selectedIndex ? ' is-selected' : ''}`;
    row.textContent = item.title;
    row.addEventListener('mousedown', (event) => {
      event.preventDefault();
      handle.command?.(item);
    });
    handle.element.appendChild(row);
  });
}

export function createWikiLinkSuggestionRender(): NonNullable<SuggestionOptions<DocumentSummary>['render']> {
  return () => {
    const handle: RenderHandle = {
      element: document.createElement('div'),
      unmount: null,
      items: [],
      selectedIndex: 0,
      command: null,
    };
    handle.element.className = 'wiki-suggestion';

    return {
      onStart(props: SuggestionProps<DocumentSummary>) {
        handle.items = props.items;
        handle.selectedIndex = 0;
        handle.command = props.command;
        renderItems(handle);
        handle.unmount = props.mount(handle.element);
      },
      onUpdate(props: SuggestionProps<DocumentSummary>) {
        handle.items = props.items;
        handle.selectedIndex = 0;
        handle.command = props.command;
        renderItems(handle);
      },
      onKeyDown(props: SuggestionKeyDownProps): boolean {
        if (props.event.key === 'ArrowDown') {
          handle.selectedIndex = handle.items.length ? (handle.selectedIndex + 1) % handle.items.length : 0;
          renderItems(handle);
          return true;
        }
        if (props.event.key === 'ArrowUp') {
          handle.selectedIndex = handle.items.length
            ? (handle.selectedIndex - 1 + handle.items.length) % handle.items.length
            : 0;
          renderItems(handle);
          return true;
        }
        if (props.event.key === 'Enter') {
          const item = handle.items[handle.selectedIndex];
          if (item) {
            handle.command?.(item);
            return true;
          }
          return false;
        }
        return props.event.key === 'Escape';
      },
      onExit() {
        handle.unmount?.();
      },
    };
  };
}
