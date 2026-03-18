"use client";

import { useState, useEffect, use, useMemo } from "react";
import {
  File,
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  Package,
  Loader2,
  Download,
  Check,
  Lock,
  Unlock,
  ClipboardPaste,
  LayoutGrid,
  List,
  AlertCircle,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import JSZip from "jszip";

/* ── Types ──────────────────────────────────────────────────────────── */

interface ShareFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

interface ShareData {
  size: number;
  expiresAt: string;
  files: ShareFile[];
}

interface DownloadLink extends ShareFile {
  url: string;
}

type DisplayFile = ShareFile & { url: string | null };

/* ── Helpers ─────────────────────────────────────────────────────────── */

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatMimeType(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "JPEG Image",
    "image/jpg": "JPEG Image",
    "image/png": "PNG Image",
    "image/gif": "GIF Image",
    "image/webp": "WebP Image",
    "image/svg+xml": "SVG Image",
    "image/bmp": "Bitmap Image",
    "image/tiff": "TIFF Image",
    "application/pdf": "PDF Document",
    "application/zip": "ZIP Archive",
    "application/x-zip-compressed": "ZIP Archive",
    "application/gzip": "GZip Archive",
    "application/x-tar": "TAR Archive",
    "application/json": "JSON File",
    "application/xml": "XML File",
    "text/plain": "Plain Text",
    "text/html": "HTML File",
    "text/css": "CSS File",
    "text/csv": "CSV Spreadsheet",
    "text/javascript": "JavaScript",
    "application/javascript": "JavaScript",
    "video/mp4": "MP4 Video",
    "video/webm": "WebM Video",
    "video/quicktime": "QuickTime Video",
    "video/x-msvideo": "AVI Video",
    "audio/mpeg": "MP3 Audio",
    "audio/wav": "WAV Audio",
    "audio/ogg": "OGG Audio",
    "audio/flac": "FLAC Audio",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "Word Document",
    "application/vnd.ms-excel": "Excel Sheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      "Excel Sheet",
    "application/vnd.ms-powerpoint": "PowerPoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "PowerPoint",
    "application/octet-stream": "Binary File",
  };
  return map[mime] ?? mime;
}

function FileTypeIcon({
  mimeType,
  className,
}: {
  mimeType: string;
  className?: string;
}) {
  const props = { className: className ?? "h-5 w-5", strokeWidth: 1.5 };
  if (mimeType.startsWith("image/")) return <ImageIcon {...props} />;
  if (mimeType.startsWith("video/")) return <Film {...props} />;
  if (mimeType.startsWith("audio/")) return <Music {...props} />;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("gzip") ||
    mimeType.includes("archive")
  )
    return <Package {...props} />;
  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("xml") ||
    mimeType.includes("html") ||
    mimeType.includes("css")
  )
    return <FileCode {...props} />;
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation")
  )
    return <FileText {...props} />;
  return <File {...props} />;
}

/* ── Sort helpers ────────────────────────────────────────────────────── */

type SortField = "name" | "type" | "size";

function SortHeader({
  label,
  field,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  sortBy: SortField;
  sortDir: "asc" | "desc";
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const active = sortBy === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none group transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      } ${className ?? ""}`}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </div>
    </th>
  );
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [passkey, setPasskey] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[] | null>(
    null,
  );
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [zipProgress, setZipProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");

  /* ── Fetch share metadata ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/share/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setShareData(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load share.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── Verify passkey ── */
  const handleVerify = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!passkey.trim()) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: passkey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDownloadLinks(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  /* ── Download single file ── */
  const handleDownloadFile = (file: DisplayFile) => {
    if (!file.url) return;
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadedIds((prev) =>
      prev.includes(file.id) ? prev : [...prev, file.id],
    );
  };

  /* ── Download all as ZIP ── */
  const handleDownloadAll = async () => {
    if (!downloadLinks?.length) return;
    const total = downloadLinks.length;
    setZipProgress({ done: 0, total });
    try {
      const zip = new JSZip();
      await Promise.all(
        downloadLinks.map(async (file) => {
          const res = await fetch(file.url);
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${file.name}`);
          const blob = await res.blob();
          zip.file(file.name, blob);
          setZipProgress((p) => (p ? { ...p, done: p.done + 1 } : null));
        }),
      );
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `myfiles_${id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setDownloadedIds(downloadLinks.map((f) => f.id));
    } catch (err) {
      console.error("Zip error:", err);
      alert("Failed to create ZIP. You can still download files individually.");
    } finally {
      setZipProgress(null);
    }
  };

  /* ── Paste from clipboard ── */
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasskey(text.trim());
    } catch {
      /* clipboard access denied — ignore */
    }
  };

  /* ── Derived values ── */
  const isUnlocked = !!downloadLinks;

  const displayFiles: DisplayFile[] = useMemo(() => {
    if (!shareData || !downloadLinks) return [];
    return downloadLinks.map((dl) => ({ ...dl }));
  }, [shareData, downloadLinks]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const visibleFiles = useMemo(() => {
    let list = [...displayFiles];
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "type")
        cmp = formatMimeType(a.mimeType).localeCompare(
          formatMimeType(b.mimeType),
        );
      else if (sortBy === "size") cmp = a.size - b.size;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [displayFiles, filter, sortBy, sortDir]);

  const downloadedCount = downloadedIds.length;
  const totalCount = shareData?.files.length ?? 0;
  const unlockedCount = displayFiles.length;
  const visibleSize = visibleFiles.reduce((s, f) => s + f.size, 0);
  const allDownloaded =
    isUnlocked && unlockedCount > 0 && downloadedCount === unlockedCount;

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs font-black uppercase tracking-widest">
            Loading…
          </span>
        </div>
      </div>
    );
  }

  /* ── Fatal error screen (share not found / expired) ── */
  if (error && !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm border-2 border-destructive p-8 flex flex-col items-center gap-4 text-center">
          <AlertCircle
            className="h-10 w-10 text-destructive"
            strokeWidth={1.5}
          />
          <p className="font-black uppercase tracking-widest text-destructive text-sm">
            {error}
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <main className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-background font-sans">
      {/* ── Header bar ──────────────────────────────────────────────── */}
      <header className="shrink-0 border-b-2 border-border flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 lg:px-10 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Title + lock badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-foreground border-b-4 border-primary pb-0.5 leading-tight">
              Download
            </h1>
            <span
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest border-2 px-2.5 py-1 shrink-0 ${
                isUnlocked
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-muted-foreground/40 bg-muted/30 text-muted-foreground"
              }`}
            >
              {isUnlocked ? (
                <Unlock className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {isUnlocked ? "Unlocked" : "Locked"}
            </span>
          </div>

          {/* Metadata chips */}
          {shareData && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold font-mono text-muted-foreground uppercase tracking-wider">
              <span>
                {shareData.files.length} file
                {shareData.files.length !== 1 && "s"}
              </span>
              <span>{formatSize(shareData.size)}</span>
              <span>
                Expires{" "}
                {new Date(shareData.expiresAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {allDownloaded && (
                <span className="text-accent flex items-center gap-1">
                  <Check className="h-3 w-3" /> All saved
                </span>
              )}
            </div>
          )}
        </div>

        <div className="border-2 border-border bg-background shrink-0">
          <ThemeToggle />
        </div>
      </header>

      {/* ── Two-column body ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* ══ LEFT SIDEBAR ════════════════════════════════════════════ */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-5 p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-border lg:overflow-y-auto">
          {isUnlocked ? (
            /* ── Unlocked controls ── */
            <>
              {/* Download all */}
              {totalCount > 1 && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleDownloadAll}
                    disabled={!!zipProgress}
                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest bg-secondary text-secondary-foreground border-2 border-secondary hover:bg-foreground hover:border-foreground transition-all disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {zipProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        Fetching {zipProgress.done}/{zipProgress.total}…
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 shrink-0" />
                        Download All (ZIP)
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Info note */}
              <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider leading-relaxed border-t-2 border-border/40 pt-4">
                Presigned links expire in 3 hours. Refresh the page and re-enter
                the passkey if they stop working.
              </p>
            </>
          ) : (
            /* ── Locked: passkey form ── */
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="passkey-input"
                  className="text-[10px] font-black uppercase tracking-widest text-foreground"
                >
                  Access Passcode
                </label>

                {/* Input + paste button */}
                <div className="flex border-2 border-border focus-within:border-primary transition-colors">
                  <input
                    id="passkey-input"
                    type="text"
                    autoFocus
                    placeholder="e.g. aBcDeFgH"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 py-3 px-3 bg-muted/30 text-foreground font-mono text-base tracking-widest placeholder:text-muted-foreground/40 focus:outline-none focus:bg-background transition-colors min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handlePaste}
                    title="Paste from clipboard"
                    className="px-3 border-l-2 border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-[10px] font-bold text-destructive bg-destructive/10 border-2 border-destructive px-3 py-2.5 uppercase tracking-wide leading-snug">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!passkey.trim() || verifying}
                className="w-full py-3 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest border-2 border-primary hover:bg-foreground hover:border-foreground transition-all disabled:opacity-50 disabled:pointer-events-none text-xs"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    Unlock Files
                  </>
                )}
              </button>

              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider leading-relaxed">
                The file list is shown below as a preview. Enter the passcode to
                unlock downloads.
              </p>
            </form>
          )}

          {/* Share ID footer */}
          <div className="mt-auto pt-4 border-t-2 border-border/40">
            <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
              myfiles / {id}
            </p>
          </div>
        </aside>

        {/* ══ RIGHT MAIN — File List ══════════════════════════════════ */}
        <div className="flex-1 flex flex-col lg:overflow-hidden">
          {/* Toolbar — only when unlocked */}
          {isUnlocked && (
            <div className="shrink-0 border-b-2 border-border px-4 py-2 flex items-center gap-3 bg-muted/10">
              {/* Filter input */}
              <div className="relative flex items-center flex-1 min-w-0 max-w-xs">
                <Search className="absolute left-2.5 h-3 w-3 text-muted-foreground pointer-events-none shrink-0" />
                <input
                  type="text"
                  placeholder="Filter files…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-7 pr-7 py-1.5 text-xs bg-muted/30 border-2 border-border focus:border-primary focus:outline-none font-mono placeholder:text-muted-foreground/40 transition-colors"
                />
                {filter && (
                  <button
                    onClick={() => setFilter("")}
                    className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* File count */}
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-mono shrink-0 hidden sm:block">
                {filter
                  ? `${visibleFiles.length} / ${totalCount}`
                  : `${totalCount} file${totalCount !== 1 ? "s" : ""}`}
              </span>

              {/* Spacer */}
              <div className="flex-1 hidden sm:block" />

              {/* View toggle */}
              <div className="flex border-2 border-border shrink-0">
                <button
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  className={`p-1.5 transition-colors ${
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className={`p-1.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ── File content — scrollable ── */}
          <div className="flex-1 lg:overflow-y-auto flex flex-col">
            {!isUnlocked ? (
              /* Locked placeholder */
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center select-none">
                <Lock
                  className="h-12 w-12 text-muted-foreground/15"
                  strokeWidth={1}
                />
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/30">
                    {totalCount} file{totalCount !== 1 && "s"} locked
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/25 uppercase tracking-wider">
                    Enter the passcode on the left to access
                  </p>
                </div>
              </div>
            ) : displayFiles.length === 0 ? (
              <div className="flex items-center justify-center flex-1 p-10 text-muted-foreground/30">
                <span className="font-black uppercase tracking-widest text-sm">
                  No files
                </span>
              </div>
            ) : viewMode === "list" ? (
              /* ════════════════ LIST VIEW ════════════════ */
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-background border-b-2 border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-10 tabular-nums select-none">
                      #
                    </th>
                    <SortHeader
                      label="File"
                      field="name"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="text-left"
                    />
                    <SortHeader
                      label="Type"
                      field="type"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="text-left hidden md:table-cell w-40"
                    />
                    <SortHeader
                      label="Size"
                      field="size"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="text-right w-24"
                    />
                    <th className="px-4 py-2.5 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {visibleFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/30">
                          No files match &ldquo;{filter}&rdquo;
                        </span>
                      </td>
                    </tr>
                  ) : null}
                  {visibleFiles.map((file, i) => {
                    const done = downloadedIds.includes(file.id);
                    return (
                      <tr
                        key={file.id}
                        className="fp-row-in border-b border-border/30 transition-[background] duration-[60ms] hover:bg-muted/20"
                        style={{
                          animationDelay: `${Math.min(i * 8, 160)}ms`,
                        }}
                      >
                        {/* Index */}
                        <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground/40 tabular-nums select-none">
                          {i + 1}
                        </td>

                        {/* Icon + name */}
                        <td className="px-4 py-3 max-w-0">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span className="shrink-0 text-primary">
                              <FileTypeIcon
                                mimeType={file.mimeType}
                                className="h-4 w-4"
                              />
                            </span>
                            <span
                              className="font-bold text-sm truncate text-foreground"
                              title={file.name}
                            >
                              {file.name}
                            </span>
                            {done && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-accent border border-accent/50 bg-accent/10 px-1.5 py-0.5 leading-none">
                                <Check className="h-2.5 w-2.5" /> saved
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {formatMimeType(file.mimeType)}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-[11px] font-mono font-bold text-foreground/60 tabular-nums">
                            {formatSize(file.size)}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className={`flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider border-2 py-1.5 px-3 transition-all whitespace-nowrap w-full ${
                              done
                                ? "border-accent/60 text-accent hover:bg-primary hover:text-primary-foreground hover:border-primary"
                                : "border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                            }`}
                          >
                            <Download className="h-3 w-3" /> Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : /* ════════════════ GRID VIEW ════════════════ */
            visibleFiles.length === 0 ? (
              <div className="flex items-center justify-center flex-1 p-10">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/30">
                  No files match &ldquo;{filter}&rdquo;
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-5">
                {visibleFiles.map((file, i) => {
                  const done = downloadedIds.includes(file.id);
                  return (
                    <div
                      key={file.id}
                      className="fp-card-in relative flex flex-col border-2 border-border transition-colors hover:bg-muted/20 hover:border-primary"
                      style={{ animationDelay: `${Math.min(i * 12, 240)}ms` }}
                    >
                      {/* Downloaded badge */}
                      {done && (
                        <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-accent border border-accent/50 bg-accent/10 px-1.5 py-0.5 leading-none">
                          <Check className="h-2.5 w-2.5" /> saved
                        </span>
                      )}
                      {/* Card body */}
                      <div className="flex flex-col items-center gap-2 p-4 flex-1 text-center">
                        <div className="p-3 border-2 border-border bg-muted/30 text-primary transition-colors">
                          <FileTypeIcon
                            mimeType={file.mimeType}
                            className="h-6 w-6"
                          />
                        </div>
                        <span
                          className="font-bold text-xs leading-snug break-all line-clamp-2 w-full text-foreground"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground leading-none">
                          {formatMimeType(file.mimeType)}
                        </span>
                        <span className="text-[11px] font-black font-mono text-foreground/60">
                          {formatSize(file.size)}
                        </span>
                      </div>

                      {/* Download button */}
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 border-t-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          done
                            ? "border-accent/40 text-accent hover:bg-primary hover:text-primary-foreground hover:border-primary"
                            : "border-border bg-muted/10 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        }`}
                      >
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Status bar ── */}
            {displayFiles.length > 0 && (
              <div className="shrink-0 border-t-2 border-border px-5 py-2 bg-muted/10 flex items-center justify-between gap-4 text-[10px] font-mono">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>
                    {filter
                      ? `${visibleFiles.length} of ${totalCount} files`
                      : `${totalCount} file${totalCount !== 1 ? "s" : ""}`}
                  </span>
                  <span>{formatSize(visibleSize)}</span>
                  {sortBy !== "name" || sortDir !== "asc" ? (
                    <span className="text-primary">
                      Sorted by {sortBy} {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  ) : null}
                </div>
                {isUnlocked && downloadedCount > 0 && (
                  <span className="text-accent">
                    {downloadedCount} / {unlockedCount} saved
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
