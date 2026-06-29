import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { invoke } from "@tauri-apps/api/core";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ViewMode = "continuous" | "single";

interface PdfViewerProps {
  filePath: string;
}

export function PdfViewer({ filePath }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("continuous");
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [goToPageInput, setGoToPageInput] = useState("");
  const [showGoToPage, setShowGoToPage] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isScrollingProgrammatically = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    invoke<string>("read_pdf_base64", { pdfPath: filePath })
      .then((b64) => {
        setPdfData(`data:application/pdf;base64,${b64}`);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [filePath]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setCurrentPage(1);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  // Détecter la page courante au scroll (mode continu)
  useEffect(() => {
    if (viewMode !== "continuous") return;
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleScroll() {
      if (isScrollingProgrammatically.current) return;
      const containerRect = container!.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;

      let closestPage = 1;
      let closestDistance = Infinity;

      pageRefs.current.forEach((el, pageNum) => {
        const rect = el.getBoundingClientRect();
        const pageCenter = rect.top + rect.height / 2;
        const distance = Math.abs(pageCenter - containerCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = pageNum;
        }
      });

      setCurrentPage(closestPage);
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [viewMode, numPages]);

  // Ctrl+Molette pour zoomer — actif sur toute la zone PDF (conteneur parent)
  useEffect(() => {
    const pdfZone = scrollContainerRef.current?.closest("[data-pdf-zone]") as HTMLElement | null;
    if (!pdfZone) return;

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.max(0.3, Math.min(4, s + delta)));
    }

    pdfZone.addEventListener("wheel", handleWheel, { passive: false });
    return () => pdfZone.removeEventListener("wheel", handleWheel);
  }, []);

  // Raccourcis clavier — actifs uniquement quand le conteneur PDF a le focus
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPage(Math.max(1, currentPage - 1));
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goToPage(Math.min(numPages, currentPage + 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === "End") {
        e.preventDefault();
        goToPage(numPages);
      } else if (e.key === "+" && e.ctrlKey) {
        e.preventDefault();
        setScale((s) => Math.min(4, s + 0.25));
      } else if (e.key === "-" && e.ctrlKey) {
        e.preventDefault();
        setScale((s) => Math.max(0.3, s - 0.25));
      } else if (e.key === "0" && e.ctrlKey) {
        e.preventDefault();
        setScale(1.2);
      } else if (e.key === "g" && e.ctrlKey) {
        e.preventDefault();
        setShowGoToPage(true);
        setGoToPageInput(String(currentPage));
      } else if (e.key === "t" && !e.ctrlKey && !e.altKey) {
        setShowThumbnails((v) => !v);
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, numPages]);

  function goToPage(page: number) {
    const target = Math.max(1, Math.min(numPages, page));
    setCurrentPage(target);

    if (viewMode === "continuous") {
      const el = pageRefs.current.get(target);
      if (el) {
        isScrollingProgrammatically.current = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 500);
      }
    }
  }

  function handleGoToPageSubmit(e: React.FormEvent) {
    e.preventDefault();
    const page = parseInt(goToPageInput, 10);
    if (!isNaN(page)) {
      goToPage(page);
    }
    setShowGoToPage(false);
  }

  function fitToWidth() {
    const container = scrollContainerRef.current;
    if (!container) return;
    // Estimer la largeur d'une page A4 standard (595 points)
    const containerWidth = container.clientWidth - 48; // padding
    const a4Width = 595;
    setScale(containerWidth / a4Width);
  }

  function fitToPage() {
    const container = scrollContainerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth - 48;
    const containerHeight = container.clientHeight - 32;
    const a4Width = 595;
    const a4Height = 842;
    const scaleW = containerWidth / a4Width;
    const scaleH = containerHeight / a4Height;
    setScale(Math.min(scaleW, scaleH));
  }

  async function openExternally() {
    try {
      await invoke("open_file_externally", { path: filePath });
    } catch {
      // Fallback : essayer avec shell
      try {
        await invoke("shell_open", { path: filePath });
      } catch (err) {
        console.error("Impossible d'ouvrir le fichier:", err);
      }
    }
  }

  // Pages à afficher
  const pageNumbers = useMemo(() => {
    if (numPages === 0) return [];
    if (viewMode === "single") return [currentPage];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages, viewMode, currentPage]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-or-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-red-400 text-sm font-medium">Erreur de chargement du PDF</p>
        <p className="text-xs text-muted max-w-md text-center">{error}</p>
        <p className="text-xs text-muted-light mt-2">
          Fichier : <code className="text-or-400">{filePath}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-pdf-zone>
      {/* Barre d'outils PDF */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-marine-800 border-b border-marine-400/20 gap-2 shrink-0">
        {/* Navigation pages */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-marine-600 disabled:opacity-30 transition-colors text-muted-light"
            title="Page précédente (←)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Indicateur de page cliquable */}
          {showGoToPage ? (
            <form onSubmit={handleGoToPageSubmit} className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={numPages}
                value={goToPageInput}
                onChange={(e) => setGoToPageInput(e.target.value)}
                onBlur={() => setShowGoToPage(false)}
                autoFocus
                className="w-12 px-1.5 py-0.5 text-sm text-center bg-marine-700 border border-or-500/50 rounded text-creme-200 focus:outline-none"
              />
              <span className="text-sm text-muted">/ {numPages}</span>
            </form>
          ) : (
            <button
              onClick={() => {
                setShowGoToPage(true);
                setGoToPageInput(String(currentPage));
              }}
              className="px-2 py-0.5 text-sm text-muted-light hover:text-or-300 hover:bg-marine-700 rounded transition-colors"
              title="Aller à la page (Ctrl+G)"
            >
              {currentPage} / {numPages || "..."}
            </button>
          )}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded hover:bg-marine-600 disabled:opacity-30 transition-colors text-muted-light"
            title="Page suivante (→)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="w-px h-5 bg-marine-400/30 mx-1" />

          {/* Mode d'affichage */}
          <button
            onClick={() => setViewMode(viewMode === "continuous" ? "single" : "continuous")}
            className={`p-1.5 rounded transition-colors ${
              viewMode === "continuous"
                ? "bg-or-500/20 text-or-300"
                : "text-muted hover:bg-marine-600 hover:text-muted-light"
            }`}
            title={viewMode === "continuous" ? "Mode page unique" : "Mode défilement continu"}
          >
            {viewMode === "continuous" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </button>

          {/* Miniatures */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded transition-colors ${
              showThumbnails
                ? "bg-or-500/20 text-or-300"
                : "text-muted hover:bg-marine-600 hover:text-muted-light"
            }`}
            title="Miniatures (T)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScale((s) => Math.max(0.3, s - 0.15))}
            className="p-1.5 rounded hover:bg-marine-600 transition-colors text-muted-light"
            title="Zoom arrière (Ctrl+-)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          <span className="text-xs text-muted-light w-12 text-center font-mono">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => setScale((s) => Math.min(4, s + 0.15))}
            className="p-1.5 rounded hover:bg-marine-600 transition-colors text-muted-light"
            title="Zoom avant (Ctrl++)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <div className="w-px h-5 bg-marine-400/30 mx-0.5" />

          <button
            onClick={fitToWidth}
            className="px-2 py-1 text-xs rounded hover:bg-marine-600 transition-colors text-muted hover:text-muted-light"
            title="Ajuster à la largeur"
          >
            Largeur
          </button>
          <button
            onClick={fitToPage}
            className="px-2 py-1 text-xs rounded hover:bg-marine-600 transition-colors text-muted hover:text-muted-light"
            title="Ajuster à la page"
          >
            Page
          </button>
          <button
            onClick={() => setScale(1.2)}
            className="px-2 py-1 text-xs rounded hover:bg-marine-600 transition-colors text-muted hover:text-muted-light"
            title="Zoom par défaut (Ctrl+0)"
          >
            100%
          </button>

          <div className="w-px h-5 bg-marine-400/30 mx-0.5" />

          {/* Ouvrir externe */}
          <button
            onClick={openExternally}
            className="p-1.5 rounded hover:bg-marine-600 transition-colors text-muted-light"
            title="Ouvrir dans le lecteur PDF externe"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Zone PDF avec miniatures optionnelles */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panneau miniatures */}
        {showThumbnails && numPages > 0 && pdfData && (
          <aside className="w-36 shrink-0 bg-marine-800 border-r border-marine-400/20 overflow-auto py-2 px-2 space-y-2">
            <Document file={pdfData} loading={null}>
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-full rounded-md overflow-hidden border-2 transition-all mb-2 ${
                    currentPage === pageNum
                      ? "border-or-500 shadow-lg shadow-or-500/20"
                      : "border-transparent hover:border-marine-300/40"
                  }`}
                >
                  <Page
                    pageNumber={pageNum}
                    width={120}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                  <div className={`text-center py-0.5 text-xs ${
                    currentPage === pageNum ? "text-or-400 font-semibold" : "text-muted-dark"
                  }`}>
                    {pageNum}
                  </div>
                </button>
              ))}
            </Document>
          </aside>
        )}

        {/* Zone principale de rendu PDF */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto bg-marine-900"
          tabIndex={0}
        >
          {pdfData && (
            <Document
              file={pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-8 h-8 border-2 border-or-500 border-t-transparent rounded-full" />
                </div>
              }
            >
              <div className={`flex flex-col items-center ${viewMode === "continuous" ? "py-4 gap-4" : "p-4 h-full justify-center"}`}>
                {pageNumbers.map((pageNum) => (
                  <div
                    key={pageNum}
                    ref={(el) => {
                      if (el) pageRefs.current.set(pageNum, el);
                    }}
                    className="relative shadow-xl shadow-black/40"
                  >
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                    {/* Numéro de page en filigrane */}
                    {viewMode === "continuous" && (
                      <div className="absolute bottom-2 right-3 px-2 py-0.5 bg-black/50 rounded text-xs text-white/70 font-mono">
                        {pageNum}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Document>
          )}
        </div>
      </div>

      {/* Barre de statut en bas */}
      <div className="flex items-center justify-between px-3 py-1 bg-marine-800 border-t border-marine-400/20 text-xs text-muted-dark shrink-0">
        <div className="flex items-center gap-3">
          <span>{numPages} page{numPages > 1 ? "s" : ""}</span>
          <span>|</span>
          <span>{Math.round(scale * 100)}%</span>
          <span>|</span>
          <span>{viewMode === "continuous" ? "Défilement continu" : "Page unique"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-60">Ctrl+Molette : zoom</span>
          <span className="opacity-60">|</span>
          <span className="opacity-60">← → : pages</span>
          <span className="opacity-60">|</span>
          <span className="opacity-60">Ctrl+G : aller à</span>
        </div>
      </div>
    </div>
  );
}
