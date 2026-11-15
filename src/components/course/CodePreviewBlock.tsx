
import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

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
 * Membuat script pengukur tinggi konten aktual.
 * Tidak menggunakan tinggi viewport atau scrollHeight body/html.
 */
function createResizeScript(previewId: string) {
  return `
<script nonce="gradeup-preview-resize">
(() => {
  const previewId = ${JSON.stringify(previewId)};

  let observer;
  let mutationObserver;
  let frameRequested = false;

  function measureContent() {
    frameRequested = false;

    const body = document.body;

    if (!body) return;

    let contentBottom = 0;

    Array.from(body.children).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;

      const style = window.getComputedStyle(element);

      if (style.display === "none" || style.position === "fixed") {
        return;
      }

      const rect = element.getBoundingClientRect();

      const marginBottom =
        parseFloat(style.marginBottom) || 0;

      contentBottom = Math.max(
        contentBottom,
        rect.bottom + window.scrollY + marginBottom
      );
    });

    const bodyStyle = window.getComputedStyle(body);

    const paddingBottom =
      parseFloat(bodyStyle.paddingBottom) || 0;

    const paddingTop =
      parseFloat(bodyStyle.paddingTop) || 0;

    const height = Math.ceil(
      Math.max(
        100,
        contentBottom + paddingBottom,
        paddingTop + paddingBottom + 100
      )
    );

    window.parent.postMessage(
      {
        type: "GRADEUP_PREVIEW_HEIGHT",
        id: previewId,
        height
      },
      "*"
    );
  }

  function scheduleMeasure() {
    if (frameRequested) return;

    frameRequested = true;

    requestAnimationFrame(measureContent);
  }

  function observeChildren() {
    if (!observer || !document.body) return;

    observer.disconnect();

    Array.from(document.body.children).forEach((element) => {
      if (element instanceof HTMLElement) {
        observer.observe(element);
      }
    });
  }

  function initialize() {
    if (!document.body) return;

    observer = new ResizeObserver(() => {
      scheduleMeasure();
    });

    mutationObserver = new MutationObserver(() => {
      observeChildren();
      scheduleMeasure();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    observeChildren();

    scheduleMeasure();

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("load", scheduleMeasure);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleMeasure);
    }

    // Mengukur ulang setelah gambar selesai dimuat.
    document.querySelectorAll("img").forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", scheduleMeasure);
        img.addEventListener("error", scheduleMeasure);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
</script>
`;
}

/**
 * Membungkus kode dalam dokumen preview terisolasi.
 */
function createPreviewDocument(
  code: string,
  previewId: string
) {
  const securityPolicy = `
    <meta
      http-equiv="Content-Security-Policy"
      content="
        default-src 'none';
        style-src 'unsafe-inline';
        img-src data: blob:;
        font-src data:;
        connect-src 'none';
        script-src 'nonce-gradeup-preview-resize';
        form-action 'none';
        base-uri 'none';
      "
    />
    <style>
      html,
      body {
        height: auto !important;
        min-height: 0 !important;
      }
    </style>
  `;

  const resizeScript = createResizeScript(previewId);

  if (/<html[\s>]/i.test(code)) {
    let documentCode = code;

    if (/<head[\s>]/i.test(documentCode)) {
      documentCode = documentCode.replace(
        /<head([^>]*)>/i,
        `<head$1>${securityPolicy}`
      );
    } else {
      documentCode = documentCode.replace(
        /<html([^>]*)>/i,
        `<html$1><head>${securityPolicy}</head>`
      );
    }

    if (/<\/body>/i.test(documentCode)) {
      documentCode = documentCode.replace(
        /<\/body>/i,
        `${resizeScript}</body>`
      );
    } else {
      documentCode = documentCode.replace(
        /<\/html>/i,
        `${resizeScript}</html>`
      );
    }

    return documentCode;
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

  const [previewHeight, setPreviewHeight] = useState(300);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generatedId = useId();

  const previewId = generatedId.replace(/:/g, "");

  const code = String(node.attrs.code ?? "");
  const title = String(node.attrs.title ?? "Contoh Kode");

  const isEditable = editor.isEditable;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data;

      if (
        !data ||
        data.type !== "GRADEUP_PREVIEW_HEIGHT" ||
        data.id !== previewId
      ) {
        return;
      }

      const nextHeight = Number(data.height);

      if (!Number.isFinite(nextHeight) || nextHeight < 0) {
        return;
      }

      setPreviewHeight((currentHeight) => {
        const safeHeight = Math.max(
          100,
          Math.ceil(nextHeight)
        );

        return currentHeight === safeHeight
          ? currentHeight
          : safeHeight;
      });
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [previewId]);

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
            ? "fixed inset-0 z-[99999] h-[100dvh] w-full max-w-none overflow-hidden rounded-none shadow-2xl"
            : "overflow-hidden rounded-xl shadow-sm"
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
          /* Area Preview */
          <div
            className={`w-full min-w-0 bg-white ${
              isExpanded
                ? "min-h-0 flex-1 overflow-auto"
                : "overflow-visible"
            }`}
          >
            <iframe
              ref={iframeRef}
              title={title || "Preview materi"}
              srcDoc={createPreviewDocument(code, previewId)}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              scrolling={isExpanded ? "auto" : "no"}
              onLoad={() => {
                setPreviewHeight(300);
              }}
              style={
                isExpanded
                  ? { height: "100%", minHeight: 0 }
                  : {
                      height: `${previewHeight}px`,
                      minHeight: 0,
                    }
              }
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
