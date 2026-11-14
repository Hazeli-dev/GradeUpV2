
import { useState } from "react";
import {
  Code,
  Code2,
  Eye,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";

import {
  Node,
  mergeAttributes,
} from "@tiptap/core";

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

export const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contoh Materi</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      padding: 24px;
      margin: 0;
      background: #f1f5f9;
    }

    .card {
      width: 100%;
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

    @media (max-width: 480px) {
      body {
        padding: 12px;
      }

      .card {
        padding: 18px;
      }
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
 * Membungkus kode dalam dokumen preview terisolasi.
 * JavaScript dan koneksi jaringan tidak diizinkan.
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

function CodePreviewView({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const [activeView, setActiveView] = useState<
    "kode" | "preview"
  >("preview");

  const [isExpanded, setIsExpanded] = useState(false);

  const code = String(node.attrs.code ?? "");
  const title = String(node.attrs.title ?? "Contoh Kode");

  const isEditable = editor.isEditable;

  const openFullPreview = () => {
    setActiveView("preview");
    setIsExpanded(true);
  };

  const closeFullPreview = () => {
    setIsExpanded(false);
  };

  return (
    <NodeViewWrapper className="gu-code-preview-block w-full max-w-none">
      <section
        contentEditable={false}
        className={`flex flex-col border border-slate-200 bg-white ${
          isExpanded
            ? "fixed inset-0 z-[99999] h-[100dvh] w-full max-w-none overflow-hidden rounded-none shadow-2xl"
            : "my-6 w-full max-w-none overflow-hidden rounded-xl shadow-sm"
        }`}
      >
        {/* Header khusus admin */}
        {isEditable && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Code2
                size={18}
                className="shrink-0 text-blue-600"
              />

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  updateAttributes({
                    title: event.target.value,
                  })
                }
                aria-label="Judul blok kode"
                className="min-w-0 w-full max-w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none focus:ring-0"
                placeholder="Judul blok kode"
              />
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    setActiveView("kode");
                  }}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition ${
                    activeView === "kode" && !isExpanded
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
                  onClick={() => {
                    setActiveView("preview");
                    setIsExpanded(false);
                  }}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition ${
                    activeView === "preview" && !isExpanded
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

              {!isExpanded ? (
                <button
                  type="button"
                  onClick={openFullPreview}
                  title="Buka preview layar penuh"
                  aria-label="Buka preview layar penuh"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Maximize2 size={15} />
                  <span className="hidden sm:inline">
                    Layar Penuh
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeFullPreview}
                  title="Tutup layar penuh"
                  aria-label="Tutup layar penuh"
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
                >
                  <Minimize2 size={15} />
                  <span className="hidden sm:inline">
                    Kecilkan
                  </span>
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Editor Kode */}
        {isEditable && activeView === "kode" && !isExpanded ? (
          <div className="min-h-0 bg-slate-950 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                HTML / CSS
              </span>

              <span className="text-xs text-slate-500">
                Tempel atau edit kode di bawah
              </span>
            </div>

            <textarea
              value={code}
              onChange={(event) =>
                updateAttributes({
                  code: event.target.value,
                })
              }
              spellCheck={false}
              aria-label="Editor kode HTML dan CSS"
              placeholder="Tempel kode HTML dan CSS di sini..."
              className="min-h-[320px] w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-4 font-mono text-xs leading-6 text-green-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ) : (
          /* Area Preview */
          <div
            className={`min-h-0 w-full bg-white ${
              isExpanded ? "flex-1 overflow-auto" : "w-full"
            }`}
          >
            <iframe
              title={title || "Preview materi"}
              srcDoc={createPreviewDocument(code)}
              sandbox=""
              referrerPolicy="no-referrer"
              className={`block w-full border-0 bg-white ${
                isExpanded
                  ? "h-full min-h-0"
                  : "h-[min(75vh,760px)] min-h-[420px]"
              }`}
              loading="lazy"
            />
          </div>
        )}

        {/* Footer khusus admin */}
        {isEditable && !isExpanded && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-xs text-slate-500">
              Preview HTML/CSS terisolasi
            </span>

            <button
              type="button"
              onClick={openFullPreview}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Lihat hasil desain layar penuh
            </button>
          </div>
        )}
      </section>
    </NodeViewWrapper>
  );
}

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
