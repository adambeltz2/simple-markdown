import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useRef } from 'react';
import { WikiLink } from './extensions/wikiLink';
import type { DocumentSummary } from '../types';

interface MarkdownEditorProps {
  content: string;
  documents: DocumentSummary[];
  onChange: (markdown: string) => void;
  onNavigate: (title: string) => void;
}

interface EditorWithMarkdownStorage extends Editor {
  storage: Editor['storage'] & { markdown: { getMarkdown: () => string } };
}

export default function MarkdownEditor({ content, documents, onChange, onNavigate }: MarkdownEditorProps) {
  const documentsRef = useRef(documents);
  const onNavigateRef = useRef(onNavigate);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    documentsRef.current = documents;
    onNavigateRef.current = onNavigate;
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Placeholder.configure({ placeholder: 'Start writing… type [[ to link a note' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Typography,
      // documentsRef/onNavigateRef are read lazily by the extension, not during this render.
      // oxlint-disable-next-line react/refs
      WikiLink.configure({
        getDocuments: () => documentsRef.current,
        onNavigate: (target: string) => onNavigateRef.current(target),
      }),
      Markdown.configure({ html: false, tightLists: true, linkify: true, breaks: false }),
    ],
    content,
    onUpdate: ({ editor: current }) => {
      onChangeRef.current((current as EditorWithMarkdownStorage).storage.markdown.getMarkdown());
    },
  });

  return (
    <div className="markdown-editor">
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="markdown-editor__content" />
    </div>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const items: Array<{ label: string; title: string; isActive?: () => boolean; onClick: () => void }> = [
    { label: 'B', title: 'Bold', isActive: () => editor.isActive('bold'), onClick: () => editor.chain().focus().toggleBold().run() },
    { label: 'I', title: 'Italic', isActive: () => editor.isActive('italic'), onClick: () => editor.chain().focus().toggleItalic().run() },
    { label: 'S', title: 'Strikethrough', isActive: () => editor.isActive('strike'), onClick: () => editor.chain().focus().toggleStrike().run() },
    { label: 'H1', title: 'Heading 1', isActive: () => editor.isActive('heading', { level: 1 }), onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'H2', title: 'Heading 2', isActive: () => editor.isActive('heading', { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'H3', title: 'Heading 3', isActive: () => editor.isActive('heading', { level: 3 }), onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: '•‣', title: 'Bullet list', isActive: () => editor.isActive('bulletList'), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { label: '1.', title: 'Ordered list', isActive: () => editor.isActive('orderedList'), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { label: '☑', title: 'Task list', isActive: () => editor.isActive('taskList'), onClick: () => editor.chain().focus().toggleTaskList().run() },
    { label: '"', title: 'Quote', isActive: () => editor.isActive('blockquote'), onClick: () => editor.chain().focus().toggleBlockquote().run() },
    { label: '</>', title: 'Code block', isActive: () => editor.isActive('codeBlock'), onClick: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: '—', title: 'Horizontal rule', onClick: () => editor.chain().focus().setHorizontalRule().run() },
  ];

  return (
    <div className="editor-toolbar">
      {items.map((item) => (
        <button
          key={item.title}
          type="button"
          title={item.title}
          className={`editor-toolbar__button${item.isActive?.() ? ' is-active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
      <span className="editor-toolbar__spacer" />
      <button type="button" title="Undo" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()}>
        ↶
      </button>
      <button type="button" title="Redo" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()}>
        ↷
      </button>
    </div>
  );
}
