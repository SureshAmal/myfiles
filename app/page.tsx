"use client";

import { useState, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import {
  FileText,
  LayoutGrid,
  List,
  X,
  Copy,
  Check,
  AlertTriangle,
  FolderOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

/* ── Types ───────────────────────────────────────────────────────────── */

interface Share {
  id: string;
  shortId: string;
  rawPasskey?: string;
  size: number;
  expiresAt: string;
  createdAt: string;
  files: { id: string; originalName: string; size: number; mimeType: string }[];
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

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

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [activeShares, setActiveShares] = useState<Share[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stagedViewMode, setStagedViewMode] = useState<"grid" | "list">("list");

  const [copiedPasskeyId, setCopiedPasskeyId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    shortId: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  /* ── Session init ── */
  useEffect(() => {
    let sid = localStorage.getItem("myfiles_session_id");
    if (!sid) {
      sid = nanoid();
      localStorage.setItem("myfiles_session_id", sid);
    }
    setSessionId(sid);
  }, []);

  /* ── Modal keyboard / focus trap ── */
  useEffect(() => {
    if (!deleteTarget) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDeleteTarget(null);
        return;
      }
      const focusable = [cancelBtnRef.current, deleteBtnRef.current].filter(
        Boolean,
      ) as HTMLButtonElement[];
      const currentIndex = focusable.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      if (e.key === "Tab") {
        e.preventDefault();
        const next = e.shiftKey
          ? (currentIndex - 1 + focusable.length) % focusable.length
          : (currentIndex + 1) % focusable.length;
        focusable[next]?.focus();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const next =
          e.key === "ArrowLeft"
            ? (currentIndex - 1 + focusable.length) % focusable.length
            : (currentIndex + 1) % focusable.length;
        focusable[next]?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [deleteTarget]);

  /* ── Fetch shares ── */
  useEffect(() => {
    if (!sessionId) return;
    fetchShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const fetchShares = async () => {
    try {
      const res = await fetch("/api/user/shares", {
        headers: { "x-session-id": sessionId! },
      });
      const data = await res.json();
      if (res.ok) setActiveShares(data.data || []);
    } catch (err) {
      console.error("Failed to fetch shares", err);
    }
  };

  /* ── File handlers ── */
  const addFiles = (incoming: File[]) => {
    const merged = [...files, ...incoming];
    if (merged.reduce((s, f) => s + f.size, 0) > 100 * 1024 * 1024) {
      setError("Total file size exceeds 100 MB limit.");
      return;
    }
    setError(null);
    setFiles(merged);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length)
      addFiles(Array.from(e.dataTransfer.files));
  };

  const handleRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setError(null);
  };

  const handleUpload = async () => {
    if (!files.length || !sessionId) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "x-session-id": sessionId },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setFiles([]);
      fetchShares();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteShare = async () => {
    if (!deleteTarget || !sessionId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/user/shares/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId },
      });
      if (!res.ok) throw new Error("Failed to delete share");
      fetchShares();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleCopyLink = (share: Share) => {
    navigator.clipboard.writeText(
      `${window.location.origin}/s/${share.shortId}`,
    );
    setCopiedLinkId(share.id);
    setTimeout(() => setCopiedLinkId(null), 1500);
  };

  const handleCopyPasskey = (share: Share) => {
    navigator.clipboard.writeText(share.rawPasskey!);
    setCopiedPasskeyId(share.id);
    setTimeout(() => setCopiedPasskeyId(null), 1500);
  };

  /* ── Derived ── */
  const totalStagedMB = (
    files.reduce((s, f) => s + f.size, 0) /
    1024 /
    1024
  ).toFixed(2);

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <main className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-background font-sans">
      {/* ── Header bar ──────────────────────────────────────────────── */}
      <header className="shrink-0 border-b-2 border-border flex items-center justify-between px-6 lg:px-10 py-4 gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground uppercase border-b-4 border-primary inline-block pb-0.5 leading-tight">
            MyFiles
          </h1>
          <p className="text-[11px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">
            Up to 100 MB per share • Links expire in 24 h
          </p>
        </div>
        <div className="border-2 border-border bg-background shrink-0">
          <ThemeToggle />
        </div>
      </header>

      {/* ── Two-column body ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* ══ LEFT PANEL — Upload ══════════════════════════════════════ */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-3 p-5 border-b-2 lg:border-b-0 lg:border-r-2 border-border lg:overflow-hidden">
          {/* Error */}
          {error && (
            <div className="shrink-0 text-xs font-bold text-destructive bg-destructive/10 border-2 border-destructive px-4 py-3 uppercase tracking-wide">
              {error}
            </div>
          )}

          {/* Drag-and-drop zone */}
          <label
            htmlFor="file-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`shrink-0 flex items-center justify-center p-5 border-2 border-dashed cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/30 text-foreground hover:border-primary hover:bg-muted/50"
            }`}
          >
            <span className="font-bold text-sm uppercase tracking-widest pointer-events-none">
              {isDragging ? "Drop files here" : "Click or drag files to upload"}
            </span>
            <input
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {/* Confirm button */}
          {files.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="shrink-0 w-full py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest border-2 border-primary transition-all disabled:opacity-50 disabled:pointer-events-none hover:bg-foreground hover:border-foreground"
            >
              {loading
                ? "Uploading…"
                : `Share ${files.length} file${files.length !== 1 ? "s" : ""} (${totalStagedMB} MB)`}
            </button>
          )}

          {/* ── Staged files container — fills remaining height ── */}
          <div className="min-h-48 lg:flex-1 lg:min-h-0 border-2 border-border bg-muted/10 relative flex flex-col overflow-hidden">
            {files.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/25 pointer-events-none select-none">
                <FolderOpen className="h-10 w-10" strokeWidth={1} />
                <span className="font-black text-sm uppercase tracking-[0.3em]">
                  No files staged
                </span>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Toolbar */}
                <div className="shrink-0 flex justify-between items-center px-3 py-2 border-b-2 border-border bg-muted/20 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <span>
                    {files.length} file{files.length !== 1 && "s"} •{" "}
                    {totalStagedMB} / 100 MB
                  </span>
                  <div className="flex border-2 border-border">
                    <button
                      onClick={() => setStagedViewMode("grid")}
                      className={`p-1.5 transition-colors ${
                        stagedViewMode === "grid"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setStagedViewMode("list")}
                      className={`p-1.5 transition-colors ${
                        stagedViewMode === "list"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                      aria-label="List view"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* File list */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  {stagedViewMode === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                      {files.map((file, i) => (
                        <div
                          key={`${file.name}-${i}`}
                          className="group relative flex flex-col items-center justify-center p-3 h-28 bg-background border-2 border-border hover:border-primary transition-colors"
                        >
                          <FileText
                            className="h-8 w-8 mb-2 text-primary shrink-0"
                            strokeWidth={1.5}
                          />
                          <span
                            className="text-[11px] font-bold text-center w-full truncate px-1"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            {formatSize(file.size)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(i)}
                            className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground border-2 border-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all z-10"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {files.map((file, i) => (
                        <div
                          key={`${file.name}-${i}`}
                          className="group flex items-center justify-between p-2.5 bg-background border-2 border-border hover:border-primary transition-colors"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText
                              className="h-4 w-4 text-primary shrink-0"
                              strokeWidth={1.5}
                            />
                            <span
                              className="text-xs font-bold truncate"
                              title={file.name}
                            >
                              {file.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatSize(file.size)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(i)}
                              className="h-5 w-5 bg-destructive text-destructive-foreground border-2 border-destructive flex items-center justify-center transition-all hover:bg-secondary hover:border-secondary"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ══ RIGHT PANEL — Active Shares ══════════════════════════════ */}
        <div className="flex-1 flex flex-col lg:overflow-y-auto">
          {activeShares.length === 0 ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="border-2 border-dashed border-border/40 p-10 flex flex-col items-center gap-3">
                <FolderOpen
                  className="h-12 w-12 text-muted-foreground/20"
                  strokeWidth={1}
                />
                <p className="font-black text-lg uppercase tracking-[0.2em] text-muted-foreground/30">
                  No active shares
                </p>
                <p className="text-xs text-muted-foreground/25 font-medium uppercase tracking-wider">
                  Upload files on the left to create a share
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 lg:p-8 flex flex-col gap-6">
              {/* Heading */}
              <div className="flex items-baseline gap-4 shrink-0">
                <h2 className="text-xl font-black uppercase tracking-widest text-foreground border-b-4 border-border pb-0.5">
                  Active Shares
                </h2>
                <span className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
                  {activeShares.length} share{activeShares.length !== 1 && "s"}
                </span>
              </div>

              {/* Cards grid — 1 col default, 2 cols on XL */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {activeShares.map((share) => {
                  const fileCount = share.files?.length || 0;
                  const formattedDate = new Date(
                    share.createdAt,
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const isExpired =
                    Date.now() > new Date(share.expiresAt).getTime();
                  const linkCopied = copiedLinkId === share.id;
                  const passkeyCopied = copiedPasskeyId === share.id;

                  return (
                    <div
                      key={share.id}
                      className={`flex flex-col border-2 transition-colors ${
                        isExpired
                          ? "bg-muted/30 border-border/50 opacity-60 grayscale"
                          : "bg-background border-border"
                      }`}
                    >
                      {/* ── Card top row ── */}
                      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                        {/* Left: URL + badges + passkey */}
                        <div className="flex flex-col gap-1.5 min-w-0 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`/s/${share.shortId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base font-black text-primary hover:underline decoration-2 underline-offset-4 shrink-0"
                            >
                              /s/{share.shortId}
                            </a>
                            {isExpired ? (
                              <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground border-2 border-muted-foreground/30 bg-muted px-2 py-0.5 shrink-0">
                                Expired
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-black tracking-wider text-accent border-2 border-accent bg-accent/10 px-2 py-0.5 shrink-0">
                                Active
                              </span>
                            )}
                            {!isExpired && share.rawPasskey && (
                              <span className="text-[11px] font-mono font-bold bg-muted px-2 py-0.5 border-2 border-border flex items-center gap-1.5 shrink-0">
                                <span className="text-primary">
                                  {share.rawPasskey}
                                </span>
                                <button
                                  onClick={() => handleCopyPasskey(share)}
                                  className="p-0.5 hover:bg-background transition-colors"
                                  title="Copy passcode"
                                >
                                  {passkeyCopied ? (
                                    <Check className="h-3 w-3 text-accent" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono font-medium text-muted-foreground/70 tracking-wide uppercase">
                            {fileCount} file{fileCount !== 1 && "s"} •{" "}
                            {formatSize(share.size)} • {formattedDate}
                          </div>
                        </div>

                        {/* Right: action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleCopyLink(share)}
                            disabled={isExpired}
                            title="Copy share link"
                            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border-2 py-1.5 px-3 transition-all disabled:opacity-50 disabled:pointer-events-none ${
                              linkCopied
                                ? "bg-accent border-accent text-accent-foreground"
                                : "bg-secondary text-secondary-foreground border-secondary hover:bg-accent hover:border-accent hover:text-accent-foreground"
                            }`}
                          >
                            {linkCopied ? (
                              <>
                                <Check className="h-3 w-3" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy Link
                              </>
                            )}
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                id: share.id,
                                shortId: share.shortId,
                              })
                            }
                            title="Stop sharing"
                            className="text-[10px] font-bold uppercase tracking-wider text-destructive border-2 border-destructive hover:bg-destructive hover:text-destructive-foreground px-3 py-1.5 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* ── Files in this share ── */}
                      {fileCount > 0 && (
                        <div className="border-t-2 border-border/40 px-4 py-2.5 bg-muted/20">
                          <div className="flex flex-wrap gap-1.5">
                            {share.files.map((f, i) => (
                              <span
                                key={i}
                                className="group relative inline-flex items-center gap-1 text-[10px] font-mono font-medium bg-background border-2 border-border px-2 py-0.5 max-w-[200px] hover:border-primary transition-colors cursor-default"
                              >
                                <FileText
                                  className="h-2.5 w-2.5 text-primary shrink-0"
                                  strokeWidth={2}
                                />
                                <span className="truncate">
                                  {f.originalName}
                                </span>
                                <span className="text-muted-foreground/40 shrink-0">
                                  {formatSize(f.size)}
                                </span>

                                {/* Tooltip */}
                                <div
                                  className={[
                                    "absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-52",
                                    "pointer-events-none",
                                    "opacity-0 translate-y-1.5 scale-95",
                                    "group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100",
                                    "transition-all duration-200 ease-out origin-bottom",
                                    "bg-background border-2 border-border shadow-lg flex flex-col overflow-hidden",
                                  ].join(" ")}
                                >
                                  <div className="px-3 py-2 bg-muted/50 border-b-2 border-border/60">
                                    <p className="text-[11px] font-bold text-foreground break-all leading-snug font-sans">
                                      {f.originalName}
                                    </p>
                                  </div>
                                  <div className="px-3 py-2 flex flex-col gap-1.5">
                                    <div className="flex justify-between gap-3">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
                                        Type
                                      </span>
                                      <span className="text-[11px] font-mono text-foreground text-right">
                                        {formatMimeType(f.mimeType)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
                                        Size
                                      </span>
                                      <span className="text-[11px] font-mono text-foreground">
                                        {formatSize(f.size)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
                                        Raw
                                      </span>
                                      <span className="text-[11px] font-mono text-muted-foreground text-right break-all">
                                        {f.mimeType}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-border" />
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-background" />
                                </div>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Custom Delete Confirmation Modal ──────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-md mx-4 bg-background border-2 border-destructive shadow-2xl flex flex-col">
            <div className="flex items-center gap-4 border-b-2 border-destructive/30 px-6 py-5">
              <div className="shrink-0 p-2 bg-destructive/10 border-2 border-destructive">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h3
                id="delete-dialog-title"
                className="text-base font-black uppercase tracking-widest text-foreground"
              >
                Delete Share?
              </h3>
            </div>
            <div className="px-6 py-6 flex flex-col gap-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Share{" "}
                <span className="font-black font-mono text-primary">
                  /s/{deleteTarget.shortId}
                </span>{" "}
                and all its files will be{" "}
                <span className="font-bold text-foreground">
                  permanently removed
                </span>
                . Recipients will immediately lose access. This cannot be
                undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  ref={cancelBtnRef}
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteLoading}
                  className="px-6 py-2.5 text-sm font-black uppercase tracking-widest border-2 border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                >
                  Cancel
                </button>
                <button
                  ref={deleteBtnRef}
                  onClick={confirmDeleteShare}
                  disabled={deleteLoading}
                  className="px-6 py-2.5 text-sm font-black uppercase tracking-widest bg-destructive text-destructive-foreground border-2 border-destructive hover:bg-foreground hover:border-foreground transition-colors disabled:opacity-70 flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
