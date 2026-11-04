
import { useEffect, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  MessageSquareText,
  Redo2,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";

import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

type EditorTab = "beranda" | "insert" | "layout" | "tinjau";

interface EditorCanvasProps {
  initialContent?: JSONContent;
  onChange?: (content: JSONContent) => void;
}

interface ToolButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`gu-tool-button ${active ? "is-active" : ""}`}
    >
      {children}
    </button>
  );
}

function ToolDivider() {
  return <span className="gu-tool-divider" />;
}

function insertCallout(
  editor: Editor,
  title: string,
  prefix: string
) {
  editor
    .chain()
    .focus()
    .insertContent({
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `${title}: ${prefix}`,
            },
          ],
        },
      ],
    })
    .run();
}

export default function EditorCanvas({
  initialContent,
  onChange,
}: EditorCanvasProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("beranda");
  const [isPreview, setIsPreview] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],

    content: initialContent ?? {
      type: "doc",
      content: [{ type: "paragraph" }],
    },

    onUpdate: ({ editor }) => {
      const text = editor.getText().trim();
      const words = text ? text.split(/\s+/).length : 0;

      setWordCount(words);
      onChange?.(editor.getJSON());
    },

    editorProps: {
      attributes: {
        class: "gu-prose",
        spellcheck: "true",
        "aria-label": "Area penulisan materi pembelajaran",
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!isPreview);
    }
  }, [editor, isPreview]);

  useEffect(() => {
    if (editor) {
      const text = editor.getText().trim();
      setWordCount(text ? text.split(/\s+/).length : 0);
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="gu-editor-loading">
        Menyiapkan GradeUp Studio...
      </div>
    );
  }

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Masukkan alamat tautan:", previousUrl);

    if (url === null) return;

    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        window.alert("Gunakan alamat tautan HTTP atau HTTPS.");
        return;
      }

      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: parsed.href })
        .run();
    } catch {
      window.alert("Alamat tautan tidak valid.");
    }
  };

  const addImage = () => {
    const url = window.prompt("Masukkan URL gambar:");

    if (!url?.trim()) return;

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        window.alert("Gunakan URL gambar HTTP atau HTTPS.");
        return;
      }

      editor
        .chain()
        .focus()
        .setImage({ src: parsed.href, alt: "Ilustrasi materi" })
        .run();
    } catch {
      window.alert("URL gambar tidak valid.");
    }
  };

  const addTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({
        rows: 3,
        cols: 3,
        withHeaderRow: true,
      })
      .run();
  };

  const renderHomeToolbar = () => (
    <>
      <div className="gu-tool-group">
        <ToolButton
          label="Heading 1"
          active={isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 size={18} />
        </ToolButton>

        <ToolButton
          label="Heading 2"
          active={isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={18} />
        </ToolButton>

        <ToolButton
          label="Heading 3"
          active={isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 size={18} />
        </ToolButton>
      </div>

      <ToolDivider />

      <div className="gu-tool-group">
        <ToolButton
          label="Tebal"
          active={isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={17} />
        </ToolButton>

        <ToolButton
          label="Miring"
          active={isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={17} />
        </ToolButton>

        <ToolButton
          label="Garis bawah"
          active={isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={17} />
        </ToolButton>

        <ToolButton
          label="Coret"
          active={isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={17} />
        </ToolButton>

        <ToolButton
          label="Highlight"
          active={isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <span className="gu-highlight-icon">A</span>
        </ToolButton>
      </div>

      <ToolDivider />

      <div className="gu-tool-group">
        <ToolButton
          label="Rata kiri"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("left").run()
          }
        >
          <AlignLeft size={17} />
        </ToolButton>

        <ToolButton
          label="Rata tengah"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("center").run()
          }
        >
          <AlignCenter size={17} />
        </ToolButton>

        <ToolButton
          label="Rata kanan"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("right").run()
          }
        >
          <AlignRight size={17} />
        </ToolButton>
      </div>

      <ToolDivider />

      <div className="gu-tool-group">
        <ToolButton
          label="Bullet list"
          active={isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={18} />
        </ToolButton>

        <ToolButton
          label="Numbered list"
          active={isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={18} />
        </ToolButton>
      </div>
    </>
  );

  const renderInsertToolbar = () => (
    <>
      <div className="gu-tool-group">
        <ToolButton label="Sisipkan tabel" onClick={addTable}>
          <Table2 size={18} />
          <span>Tabel</span>
        </ToolButton>

        <ToolButton label="Sisipkan gambar" onClick={addImage}>
          <ImagePlus size={18} />
          <span>Gambar</span>
        </ToolButton>

        <ToolButton label="Sisipkan tautan" onClick={addLink}>
          <Link2 size={18} />
          <span>Tautan</span>
        </ToolButton>
      </div>

      <ToolDivider />

      <div className="gu-tool-group">
        <ToolButton
          label="Catatan penting"
          onClick={() =>
            insertCallout(editor, "Catatan penting", "Tuliskan catatan di sini")
          }
        >
          <MessageSquareText size={18} />
          <span>Catatan</span>
        </ToolButton>

        <ToolButton
          label="Contoh pembelajaran"
          onClick={() =>
            insertCallout(editor, "Contoh", "Tuliskan contoh di sini")
          }
        >
          <FileText size={18} />
          <span>Contoh</span>
        </ToolButton>

        <ToolButton
          label="Perlu diingat"
          onClick={() =>
            insertCallout(editor, "Perlu diingat", "Tuliskan poin penting di sini")
          }
        >
          <Lightbulb size={18} />
          <span>Perlu diingat</span>
        </ToolButton>
      </div>
    </>
  );

  const renderLayoutToolbar = () => (
    <div className="gu-tool-group">
      <ToolButton
        label="Lebar dokumen"
        active={!isCompact}
        onClick={() => setIsCompact(false)}
      >
        <span>Lebar</span>
      </ToolButton>

      <ToolButton
        label="Lebar dokumen ringkas"
        active={isCompact}
        onClick={() => setIsCompact(true)}
      >
        <span>Ringkas</span>
      </ToolButton>
    </div>
  );

  const renderReviewToolbar = () => (
    <div className="gu-tool-group">
      <ToolButton
        label="Urungkan"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={18} />
        <span>Undo</span>
      </ToolButton>

      <ToolButton
        label="Ulangi"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={18} />
        <span>Redo</span>
      </ToolButton>

      <ToolDivider />

      <ToolButton
        label="Lihat preview"
        onClick={() => setIsPreview(true)}
      >
        <Eye size={18} />
        <span>Preview</span>
      </ToolButton>
    </div>
  );

  return (
    <section className="gu-studio">
      <div className="gu-studio-header">
        <div>
          <div className="gu-studio-eyebrow">
            GRADEUP LEARNING PLATFORM
          </div>
          <h1>GradeUp Studio</h1>
          <p>Ruang pembuatan materi pembelajaran</p>
        </div>

        <div className="gu-studio-document-icon">
          <FileText size={23} />
        </div>
      </div>

      {isPreview ? (
        <div className="gu-preview-header">
          <div>
            <Eye size={18} />
            <span>Mode Preview Materi</span>
          </div>

          <button
            type="button"
            className="gu-preview-close"
            onClick={() => setIsPreview(false)}
          >
            <X size={17} />
            Kembali ke Editor
          </button>
        </div>
      ) : (
        <div className="gu-ribbon">
          <div className="gu-ribbon-tabs">
            {(
              [
                ["beranda", "Beranda"],
                ["insert", "Insert"],
                ["layout", "Layout"],
                ["tinjau", "Tinjau"],
              ] as [EditorTab, string][]
            ).map(([tab, label]) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`gu-ribbon-tab ${
                  activeTab === tab ? "is-active" : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="gu-ribbon-tools">
            {activeTab === "beranda" && renderHomeToolbar()}
            {activeTab === "insert" && renderInsertToolbar()}
            {activeTab === "layout" && renderLayoutToolbar()}
            {activeTab === "tinjau" && renderReviewToolbar()}
          </div>
        </div>
      )}

      <div className="gu-document-workspace">
        <div
          className={`gu-document-page ${
            isCompact ? "gu-document-page--compact" : ""
          } ${isPreview ? "gu-document-page--preview" : ""}`}
        >
          {!isPreview && (
            <div className="gu-document-label">
              <span className="gu-document-dot" />
              DOKUMEN MATERI
            </div>
          )}

          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="gu-editor-statusbar">
        <div className="gu-status-left">
          <span>
            <FileText size={14} />
            {wordCount} kata
          </span>
          <span>Bahasa Indonesia</span>
        </div>

        <div className="gu-status-right">
          {isPreview ? "Tampilan siswa" : "Mode pengeditan"}
        </div>
      </div>
    </section>
  );
}
