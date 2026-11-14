
import { useEffect, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
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
  Ruler,
  Code2,
  Code,
} from "lucide-react";

import {
  Editor,
  Extension,
  Node,
  mergeAttributes,
  type JSONContent,
} from "@tiptap/core";

import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from "@tiptap/react";

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

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contoh Materi</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 24px;
      background: #f1f5f9;
    }

    .card {
      max-width: 500px;
      margin: auto;
      padding: 24px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }

    h2 {
      color: #2563eb;
    }

    p {
      color: #475569;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Halo, Siswa GradeUp!</h2>
    <p>Ini adalah contoh tampilan materi yang dibuat menggunakan HTML dan CSS.</p>
  </div>
</body>
</html>`;

/**
 * Membungkus HTML pengguna ke dalam dokumen preview terisolasi.
 * JavaScript, koneksi jaringan, form, dan navigasi dinonaktifkan.
 */
function createPreviewDocument(code: string) {
  const securityPolicy = `
    <meta
      http-equiv="Content-Security-Policy"
      content="
        default-src 'none';
        style-src 'unsafe-inline';
        img-src data:;
        font-src data:;
        connect-src 'none';
        script-src 'none';
        form-action 'none';
        base-uri 'none';
      "
    />
  `;

  if (/<html[\s>]/i.test(code)) {
    if (/<head[\s>]/i.test(code)) {
      return code.replace(
        /<head([^>]*)>/i,
        `<head$1>${securityPolicy}`
      );
    }

    return code.replace(
      /<html([^>]*)>/i,
      `<html$1><head>${securityPolicy}</head>`
    );
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${securityPolicy}
</head>
<body>
${code}
</body>
</html>`;
}

/**
 * Tampilan blok kode dan preview.
 *
 * Node ini disimpan sebagai bagian dari JSON Tiptap.
 * Pada editor admin, pengguna dapat mengubah kode.
 * Pada halaman siswa, hanya hasil preview yang ditampilkan.
 */
function CodePreviewView({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const [activeView, setActiveView] = useState<"kode" | "preview">(
    "preview"
  );

  const code = String(node.attrs.code ?? "");
  const title = String(node.attrs.title ?? "Contoh Kode");

  const isEditable = editor.isEditable;

  const updateCode = (value: string) => {
    updateAttributes({ code: value });
  };

  const updateTitle = (value: string) => {
    updateAttributes({ title: value });
  };

  return (
    <NodeViewWrapper className="gu-code-preview-block">
      <section
        contentEditable={false}
        className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Code2 size={18} className="shrink-0 text-blue-600" />

            {isEditable ? (
              <input
                type="text"
                value={title}
                onChange={(event) => updateTitle(event.target.value)}
                aria-label="Judul blok kode"
                className="min-w-0 max-w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none focus:ring-0"
                placeholder="Judul blok kode"
              />
            ) : (
              <span className="truncate text-sm font-semibold text-slate-800">
                {title}
              </span>
            )}
          </div>

          {isEditable && (
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setActiveView("kode")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeView === "kode"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Code size={14} />
                  Kode
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("preview")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeView === "preview"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Eye size={14} />
                  Preview
                </span>
              </button>
            </div>
          )}
        </div>

        {isEditable && activeView === "kode" ? (
          <div className="bg-slate-950 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                HTML / CSS
              </span>

              <span className="text-xs text-slate-500">
                Tempel atau edit kode di bawah
              </span>
            </div>

            <textarea
              value={code}
              onChange={(event) => updateCode(event.target.value)}
              spellCheck={false}
              aria-label="Editor kode HTML dan CSS"
              placeholder="Tempel kode HTML dan CSS di sini..."
              className="min-h-[320px] w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-4 font-mono text-xs leading-6 text-green-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div className="bg-white">
            <iframe
              title={title || "Preview materi"}
              srcDoc={createPreviewDocument(code)}
              sandbox=""
              referrerPolicy="no-referrer"
              className="block min-h-[300px] w-full border-0 bg-white"
              loading="lazy"
            />
          </div>
        )}

        {isEditable && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-xs text-slate-500">
              Preview HTML/CSS terisolasi
            </span>

            <button
              type="button"
              onClick={() => setActiveView("preview")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Lihat hasil desain
            </button>
          </div>
        )}
      </section>
    </NodeViewWrapper>
  );
}

/**
 * Ekstensi Tiptap untuk blok Kode & Preview.
 *
 * Ekstensi ini perlu digunakan juga di LessonLearningPage
 * agar blok yang sama dapat dibaca oleh editor siswa.
 */
export const CodePreviewBlock = Node.create({
  name: "codePreview",

  group: "block",

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      title: {
        default: "Contoh Kode",
      },

      code: {
        default: DEFAULT_HTML,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="code-preview"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "code-preview",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodePreviewView);
  },
});

/**
 * Atribut tata letak paragraf.
 * Semua atribut disimpan dalam JSON Tiptap.
 */
const ParagraphLayout = Extension.create({
  name: "paragraphLayout",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],

        attributes: {
          textIndent: {
            default: 0,
            parseHTML: (element) =>
              parseFloat(element.style.textIndent) || 0,
            renderHTML: (attributes) =>
              attributes.textIndent
                ? {
                    style: `text-indent: ${attributes.textIndent}px`,
                  }
                : {},
          },

          leftIndent: {
            default: 0,
            parseHTML: (element) =>
              parseFloat(element.style.paddingLeft) || 0,
            renderHTML: (attributes) =>
              attributes.leftIndent
                ? {
                    style: `padding-left: ${attributes.leftIndent}px`,
                  }
                : {},
          },

          rightIndent: {
            default: 0,
            parseHTML: (element) =>
              parseFloat(element.style.paddingRight) || 0,
            renderHTML: (attributes) =>
              attributes.rightIndent
                ? {
                    style: `padding-right: ${attributes.rightIndent}px`,
                  }
                : {},
          },

          lineHeight: {
            default: "1.5",
            parseHTML: (element) =>
              element.style.lineHeight || "1.5",
            renderHTML: (attributes) => ({
              style: `line-height: ${attributes.lineHeight}`,
            }),
          },

          marginTop: {
            default: 0,
            parseHTML: (element) =>
              parseFloat(element.style.marginTop) || 0,
            renderHTML: (attributes) =>
              attributes.marginTop
                ? {
                    style: `margin-top: ${attributes.marginTop}px`,
                  }
                : {},
          },

          marginBottom: {
            default: 8,
            parseHTML: (element) =>
              parseFloat(element.style.marginBottom) || 8,
            renderHTML: (attributes) => ({
              style: `margin-bottom: ${attributes.marginBottom}px`,
            }),
          },
        },
      },
    ];
  },
});

/**
 * Tombol toolbar.
 */
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

/**
 * Menyisipkan blok informasi pembelajaran.
 */
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

  const [showRuler, setShowRuler] = useState(true);

  const [leftIndent, setLeftIndent] = useState(0);
  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [rightIndent, setRightIndent] = useState(0);

  const [lineHeight, setLineHeight] = useState("1.5");
  const [marginTop, setMarginTop] = useState(0);
  const [marginBottom, setMarginBottom] = useState(8);

  /**
   * Menentukan jenis blok aktif.
   */
  const getBlockName = (instance: Editor) =>
    instance.isActive("heading") ? "heading" : "paragraph";

  /**
   * Membaca atribut tata letak blok aktif.
   */
  const readLayout = (instance: Editor) => {
    const block = getBlockName(instance);
    const attrs = instance.getAttributes(block);

    setLeftIndent(Number(attrs.leftIndent ?? 0));
    setFirstLineIndent(Number(attrs.textIndent ?? 0));
    setRightIndent(Number(attrs.rightIndent ?? 0));
    setLineHeight(String(attrs.lineHeight ?? "1.5"));
    setMarginTop(Number(attrs.marginTop ?? 0));
    setMarginBottom(Number(attrs.marginBottom ?? 8));
  };

  /**
   * Inisialisasi editor Tiptap.
   */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),

      ParagraphLayout,

      Underline,

      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
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

      CodePreviewBlock,
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

    onSelectionUpdate: ({ editor }) => {
      readLayout(editor);
    },

    editorProps: {
      attributes: {
        class: "gu-prose",
        spellcheck: "true",
        "aria-label": "Area penulisan materi pembelajaran",
      },

      /**
       * Tab untuk menambah indentasi.
       * Shift + Tab untuk mengurangi indentasi.
       * Tab pada tabel tetap ditangani oleh Tiptap.
       */
      handleKeyDown: (view, event) => {
        if (event.key !== "Tab") return false;

        const { state } = view;
        const parent = state.selection.$from.parent;

        if (
          parent.type.name === "tableCell" ||
          parent.type.name === "tableHeader"
        ) {
          return false;
        }

        const block = parent.type.name;

        if (block !== "paragraph" && block !== "heading") {
          return false;
        }

        const currentIndent = Number(
          parent.attrs.textIndent ?? 0
        );

        const nextIndent = event.shiftKey
          ? Math.max(0, currentIndent - 24)
          : Math.min(240, currentIndent + 24);

        const transaction = state.tr.setNodeMarkup(
          state.selection.$from.before(),
          undefined,
          {
            ...parent.attrs,
            textIndent: nextIndent,
          }
        );

        view.dispatch(transaction);

        event.preventDefault();
        return true;
      },
    },
  });

  /**
   * Mengatur mode edit dan preview.
   */
  useEffect(() => {
    if (!editor) return;

    editor.setEditable(!isPreview);
  }, [editor, isPreview]);

  /**
   * Memuat jumlah kata dan tata letak awal.
   */
  useEffect(() => {
    if (!editor) return;

    const text = editor.getText().trim();

    setWordCount(text ? text.split(/\s+/).length : 0);

    readLayout(editor);
  }, [editor]);

  if (!editor) {
    return (
      <div className="gu-editor-loading">
        Menyiapkan GradeUp Studio...
      </div>
    );
  }

  const isActive = (
    name: string,
    attrs?: Record<string, unknown>
  ) => editor.isActive(name, attrs);

  /**
   * Mengubah atribut tata letak blok aktif.
   */
  const updateLayout = (
    attributes: Record<string, unknown>
  ) => {
    const block = getBlockName(editor);

    editor
      .chain()
      .focus()
      .updateAttributes(block, attributes)
      .run();
  };

  const changeLeftIndent = (value: number) => {
    setLeftIndent(value);
    updateLayout({ leftIndent: value });
  };

  const changeFirstLineIndent = (value: number) => {
    setFirstLineIndent(value);
    updateLayout({ textIndent: value });
  };

  const changeRightIndent = (value: number) => {
    setRightIndent(value);
    updateLayout({ rightIndent: value });
  };

  const changeLineHeight = (value: string) => {
    setLineHeight(value);
    updateLayout({ lineHeight: value });
  };

  const changeMarginTop = (value: number) => {
    setMarginTop(value);
    updateLayout({ marginTop: value });
  };

  const changeMarginBottom = (value: number) => {
    setMarginBottom(value);
    updateLayout({ marginBottom: value });
  };

  /**
   * Menambahkan tautan.
   */
  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href ?? "";

    const url = window.prompt(
      "Masukkan alamat tautan:",
      previousUrl
    );

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

  /**
   * Menambahkan gambar melalui URL.
   */
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
        .setImage({
          src: parsed.href,
          alt: "Ilustrasi materi",
        })
        .run();
    } catch {
      window.alert("URL gambar tidak valid.");
    }
  };

  /**
   * Menambahkan tabel.
   */
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

  /**
   * Menambahkan blok Kode & Preview.
   */
  const addCodePreview = () => {
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "codePreview",
          attrs: {
            title: "Contoh Kode",
            code: DEFAULT_HTML,
          },
        },
        {
          type: "paragraph",
        },
      ])
      .run();
  };

  /**
   * Toolbar Beranda.
   */
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
          onClick={() =>
            editor.chain().focus().toggleBold().run()
          }
        >
          <Bold size={17} />
        </ToolButton>

        <ToolButton
          label="Miring"
          active={isActive("italic")}
          onClick={() =>
            editor.chain().focus().toggleItalic().run()
          }
        >
          <Italic size={17} />
        </ToolButton>

        <ToolButton
          label="Garis bawah"
          active={isActive("underline")}
          onClick={() =>
            editor.chain().focus().toggleUnderline().run()
          }
        >
          <UnderlineIcon size={17} />
        </ToolButton>

        <ToolButton
          label="Coret"
          active={isActive("strike")}
          onClick={() =>
            editor.chain().focus().toggleStrike().run()
          }
        >
          <Strikethrough size={17} />
        </ToolButton>

        <ToolButton
          label="Highlight"
          active={isActive("highlight")}
          onClick={() =>
            editor.chain().focus().toggleHighlight().run()
          }
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

        <ToolButton
          label="Rata kanan-kiri (Justify)"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("justify").run()
          }
        >
          <AlignJustify size={17} />
        </ToolButton>
      </div>

      <ToolDivider />

      <div className="gu-tool-group">
        <ToolButton
          label="Bullet list"
          active={isActive("bulletList")}
          onClick={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          <List size={18} />
        </ToolButton>

        <ToolButton
          label="Numbered list"
          active={isActive("orderedList")}
          onClick={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          <ListOrdered size={18} />
        </ToolButton>
      </div>
    </>
  );

  /**
   * Toolbar Insert.
   */
  const renderInsertToolbar = () => (
    <>
      <div className="gu-tool-group">
        <ToolButton
          label="Sisipkan tabel"
          onClick={addTable}
        >
          <Table2 size={18} />
          <span>Tabel</span>
        </ToolButton>

        <ToolButton
          label="Sisipkan gambar"
          onClick={addImage}
        >
          <ImagePlus size={18} />
          <span>Gambar</span>
        </ToolButton>

        <ToolButton
          label="Sisipkan tautan"
          onClick={addLink}
        >
          <Link2 size={18} />
          <span>Tautan</span>
        </ToolButton>

        <ToolButton
          label="Sisipkan blok Kode & Preview"
          onClick={addCodePreview}
        >
          <Code2 size={18} />
          <span>Kode & Preview</span>
        </ToolButton>
      </div>

      <ToolDivider />

      <div className="gu-tool-group">
        <ToolButton
          label="Catatan penting"
          onClick={() =>
            insertCallout(
              editor,
              "Catatan penting",
              "Tuliskan catatan di sini"
            )
          }
        >
          <MessageSquareText size={18} />
          <span>Catatan</span>
        </ToolButton>

        <ToolButton
          label="Contoh pembelajaran"
          onClick={() =>
            insertCallout(
              editor,
              "Contoh",
              "Tuliskan contoh di sini"
            )
          }
        >
          <FileText size={18} />
          <span>Contoh</span>
        </ToolButton>

        <ToolButton
          label="Perlu diingat"
          onClick={() =>
            insertCallout(
              editor,
              "Perlu diingat",
              "Tuliskan poin penting di sini"
            )
          }
        >
          <Lightbulb size={18} />
          <span>Perlu diingat</span>
        </ToolButton>
      </div>
    </>
  );

  /**
   * Penggaris horizontal.
   */
  const renderRuler = () => (
    <div className="gu-ruler-wrapper">
      <div className="gu-ruler-heading">
        <Ruler size={15} />
        <span>Penggaris horizontal</span>
      </div>

      <div className="gu-ruler">
        {Array.from({ length: 17 }, (_, index) => (
          <div className="gu-ruler-tick" key={index}>
            <span>{index === 0 ? "0" : index}</span>
            <i />
          </div>
        ))}
      </div>

      <div className="gu-ruler-controls">
        <label>
          <span>Indentasi kiri</span>

          <input
            type="range"
            min="0"
            max="120"
            step="4"
            value={leftIndent}
            onChange={(event) =>
              changeLeftIndent(Number(event.target.value))
            }
          />

          <strong>{leftIndent} px</strong>
        </label>

        <label>
          <span>Baris pertama</span>

          <input
            type="range"
            min="0"
            max="120"
            step="4"
            value={firstLineIndent}
            onChange={(event) =>
              changeFirstLineIndent(Number(event.target.value))
            }
          />

          <strong>{firstLineIndent} px</strong>
        </label>

        <label>
          <span>Indentasi kanan</span>

          <input
            type="range"
            min="0"
            max="120"
            step="4"
            value={rightIndent}
            onChange={(event) =>
              changeRightIndent(Number(event.target.value))
            }
          />

          <strong>{rightIndent} px</strong>
        </label>
      </div>
    </div>
  );

  /**
   * Toolbar Layout.
   */
  const renderLayoutToolbar = () => (
    <div className="gu-layout-panel">
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

      <ToolDivider />

      <div className="gu-tool-group">
        <ToolButton
          label="Tampilkan penggaris"
          active={showRuler}
          onClick={() => setShowRuler(!showRuler)}
        >
          <Ruler size={17} />
          <span>Penggaris</span>
        </ToolButton>
      </div>

      <ToolDivider />

      <div className="gu-layout-setting">
        <label htmlFor="gu-line-height">
          Spasi baris
        </label>

        <select
          id="gu-line-height"
          value={lineHeight}
          onChange={(event) =>
            changeLineHeight(event.target.value)
          }
        >
          <option value="1">1.0</option>
          <option value="1.15">1.15</option>
          <option value="1.5">1.5</option>
          <option value="2">2.0</option>
        </select>
      </div>

      <div className="gu-layout-setting">
        <label htmlFor="gu-margin-top">
          Sebelum paragraf
        </label>

        <select
          id="gu-margin-top"
          value={marginTop}
          onChange={(event) =>
            changeMarginTop(Number(event.target.value))
          }
        >
          {[0, 4, 8, 12, 16, 20, 24].map((value) => (
            <option key={value} value={value}>
              {value} px
            </option>
          ))}
        </select>
      </div>

      <div className="gu-layout-setting">
        <label htmlFor="gu-margin-bottom">
          Sesudah paragraf
        </label>

        <select
          id="gu-margin-bottom"
          value={marginBottom}
          onChange={(event) =>
            changeMarginBottom(Number(event.target.value))
          }
        >
          {[0, 4, 8, 12, 16, 20, 24].map((value) => (
            <option key={value} value={value}>
              {value} px
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  /**
   * Toolbar Tinjau.
   */
  const renderReviewToolbar = () => (
    <div className="gu-tool-group">
      <ToolButton
        label="Urungkan"
        disabled={!editor.can().undo()}
        onClick={() =>
          editor.chain().focus().undo().run()
        }
      >
        <Undo2 size={18} />
        <span>Undo</span>
      </ToolButton>

      <ToolButton
        label="Ulangi"
        disabled={!editor.can().redo()}
        onClick={() =>
          editor.chain().focus().redo().run()
        }
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

  /**
   * Tampilan utama GradeUp Studio.
   */
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

      {!isPreview && showRuler && renderRuler()}

      <div className="gu-document-workspace">
        <div
          className={`gu-document-page ${
            isCompact ? "gu-document-page--compact" : ""
          } ${
            isPreview ? "gu-document-page--preview" : ""
          }`}
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
          {isPreview
            ? "Tampilan siswa"
            : "Mode pengeditan"}
        </div>
      </div>
    </section>
  );
}
