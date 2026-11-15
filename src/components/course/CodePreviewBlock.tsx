
import { useEffect, useId, useRef, useState } from "react";

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
 * Membuat dokumen preview terisolasi.
 * Skrip hanya digunakan untuk mengirimkan tinggi dokumen
 * kepada halaman utama.
 */
function createPreviewDocument(code: string, previewId: string) {
  const nonce = "gradeup-preview-resize";

  const securityPolicy = `
    <meta
      http-equiv="Content-Security-Policy"
      content="
        default-src 'none';
        style-src 'unsafe-inline';
        img-src data:;
        font-src data:;
        connect-src 'none';
        script-src 'nonce-${nonce}';
        form-action 'none';
        base-uri 'none';
      "
    />
  `;

  const resizeScript = `
    <script nonce="${nonce}">
      (() => {
        const sendHeight = () => {
          const body = document.body;
          const html = document.documentElement;

          const height = Math.max(
            body?.scrollHeight || 0,
            body?.offsetHeight || 0,
            html.scrollHeight,
            html.offsetHeight,
            html.clientHeight
          );

          parent.postMessage({
            type: "GRADEUP_PREVIEW_HEIGHT",
            id: "${previewId}",
            height
          }, "*");
        };

        window.addEventListener("load", sendHeight);
        window.addEventListener("resize", sendHeight);

        if (document.body && window.ResizeObserver) {
          new ResizeObserver(sendHeight).observe(document.body);
        }

        if (window.MutationObserver) {
          new MutationObserver(sendHeight).observe(
            document.documentElement,
            {
              childList: true,
              subtree: true,
              attributes: true,
              characterData: true
            }
          );
        }

        setTimeout(sendHeight, 100);
        setTimeout(sendHeight, 500);
        setTimeout(sendHeight, 1000);
        setTimeout(sendHeight, 2000);
      })();
    </script>
  `;

  let documentHtml = code;

  if (/<html[\s>]/i.test(documentHtml)) {
    if (/<head[\s>]/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(
        /<head([^>]*)>/i,
        `<head$1>${securityPolicy}`
      );
    } else {
      documentHtml = documentHtml.replace(
        /<html([^>]*)>/i,
        `<html$1><head>${securityPolicy}</head>`
      );
    }

    if (/<\/body>/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(
        /<\/body>/i,
        `${resizeScript}</body>`
      );
    } else {
      documentHtml += resizeScript;
    }

    return documentHtml;
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${securityPolicy}
</head>
<body>
${documentHtml}
${resizeScript}
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
  const [previewHeight, setPreviewHeight] = useState(600);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewId = useId().replace(/:/g, "");

  const code = String(node.attrs.code ?? "");
  const title = String(node.attrs.title ?? "Contoh Kode");

  const isEditable = editor.isEditable;

  /**
   * Menerima informasi tinggi dari iframe milik komponen ini saja.
   */
  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (
        event.data?.type !== "GRADEUP_PREVIEW_HEIGHT" ||
        event.data?.id !== previewId
      ) {
        return;
      }

      const height = Number(event.data.height);

      if (!Number.isFinite(height) || height <= 0) {
        return;
      }

      setPreviewHeight((previousHeight) => {
        const nextHeight = Math.max(300, Math.ceil(height + 8));

        return Math.abs(previousHeight - nextHeight) > 2
          ? nextHeight
          : previousHeight;
      });
    };

    window.addEventListener("message", handlePreviewMessage);

    return () => {
      window.removeEventListener("message", handlePreviewMessage);
    };
  }, [previewId]);

  /**
   * Mengirim ulang pengukuran saat kode berubah.
   */
  useEffect(() => {
    setPreviewHeight(600);
  }, [code]);

  const openFullPreview = () => {
    setActiveView("preview");
    setIsExpanded(true);
  };

  const closeFullPreview = () => {
    setIsExpanded(false);
  };

  return (
    <NodeViewWrapper className="gu-code-preview-block my-6 w-full min-w-0 max-w-none">
      <section
        contentEditable={false}
        className={`flex w-full min-w-0 flex-col border border-slate-200 bg-white ${
          isExpanded
            ? "fixed inset-0 z-[99999] h-[100dvh] max-h-[100dvh] overflow-hidden rounded-none shadow-2xl"
            : "max-w-none overflow-hidden rounded-xl shadow-sm"
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

        {/* Editor kode khusus admin */}
        {isEditable && activeView === "kode" && !isExpanded ? (
          <div className="min-h-0 w-full bg-slate-950 p-3">
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
          /* Area preview */
          <div
            className={`w-full min-w-0 bg-white ${
              isExpanded
                ? "min-h-0 flex-1 overflow-auto"
                : "overflow-hidden"
            }`}
          >
            <iframe
              ref={iframeRef}
              title={title || "Preview materi"}
              srcDoc={createPreviewDocument(code, previewId)}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              scrolling="no"
              onLoad={() => {
                setPreviewHeight(600);
              }}
              style={{
                height: isExpanded
                  ? "100%"
                  : `${previewHeight}px`,
                minHeight: isExpanded ? "100%" : "300px",
              }}
              className="block w-full border-0 bg-white"
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
