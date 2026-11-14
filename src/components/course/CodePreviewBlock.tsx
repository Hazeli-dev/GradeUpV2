
import { useState } from "react";
import { Code, Code2, Eye } from "lucide-react";

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

  const code = String(node.attrs.code ?? "");
  const title = String(node.attrs.title ?? "Contoh Kode");

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper className="gu-code-preview-block">
      <section
        contentEditable={false}
        className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Code2
              size={18}
              className="shrink-0 text-blue-600"
            />

            {isEditable ? (
              <input
                type="text"
                value={title}
                onChange={(event) =>
                  updateAttributes({
                    title: event.target.value,
                  })
                }
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
