"use client";

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { FileText, LayoutGrid, List, X, Copy, Loader2, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface Share {
  id: string;
  shortId: string;
  rawPasskey?: string;
  size: number;
  expiresAt: string;
  createdAt: string;
  files: { name: string; size: number }[];
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [activeShares, setActiveShares] = useState<Share[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initialize session ID
  useEffect(() => {
    let sid = localStorage.getItem("myfiles_session_id");
    if (!sid) {
      sid = nanoid();
      localStorage.setItem("myfiles_session_id", sid);
    }
    setSessionId(sid);
  }, []);

  // Fetch active shares
  useEffect(() => {
    if (!sessionId) return;
    fetchShares();
  }, [sessionId]);

  const fetchShares = async () => {
    try {
      const res = await fetch("/api/user/shares", {
        headers: {
          "x-session-id": sessionId!,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setActiveShares(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch shares", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const allFiles = [...files, ...newFiles];
      const totalSize = allFiles.reduce((acc, file) => acc + file.size, 0);

      if (totalSize > 100 * 1024 * 1024) {
        setError("Total file size exceeds 100MB limit.");
        return;
      }

      setError(null);
      setFiles(allFiles);
    }
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      const allFiles = [...files, ...newFiles];
      const totalSize = allFiles.reduce((acc, file) => acc + file.size, 0);

      if (totalSize > 100 * 1024 * 1024) {
        setError("Total file size exceeds 100MB limit.");
        return;
      }

      setError(null);
      setFiles(allFiles);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setError(null);
  };

  const handleUpload = async () => {
    if (files.length === 0 || !sessionId) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "x-session-id": sessionId,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setFiles([]);
      fetchShares();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShare = async (id: string) => {
    if (!sessionId) return;
    if (!confirm("Are you sure you want to stop sharing this file?")) return;

    try {
      const res = await fetch(`/api/user/shares/${id}`, {
        method: "DELETE",
        headers: {
          "x-session-id": sessionId,
        },
      });

      if (!res.ok) throw new Error("Failed to delete share");

      fetchShares(); // Refresh
    } catch (error) {
      console.error(error);
      alert("Failed to delete share. It may have already expired.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center bg-background py-16 px-4 md:px-8 gap-10 font-sans">
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-end">
        <div className="flex flex-col">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground uppercase border-b-4 border-primary inline-block pb-1">
            MyFiles
          </h1>
          <p className="text-sm sm:text-base font-bold text-muted-foreground mt-4 uppercase tracking-wide">
            Share up to 100MB • Links expire in 24h
          </p>
        </div>
        <div className="border-2 border-border text-border mb-1 transition-all bg-background">
          <ThemeToggle />
        </div>
      </div>

      {/* Main Upload / Share area */}
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {error && (
          <div className="text-sm font-bold text-destructive bg-destructive/10 border-2 border-destructive p-4 rounded-none uppercase tracking-wide">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-stretch gap-6">
          <div className="flex-1 flex min-w-0">
            <label
              htmlFor="file-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group flex flex-1 items-center justify-center p-6 border-2 border-dashed cursor-pointer transition-colors ${isDragging
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-foreground hover:border-primary hover:bg-muted/50"
                }`}
            >
              <span className="font-bold text-lg uppercase tracking-widest group-hover:underline decoration-2 underline-offset-4 pointer-events-none">
                {isDragging ? "Drop files here" : "Upload or drag files"}
              </span>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>

          {files.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="flex-shrink-0 px-10 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest border-2 border-primary transition-all disabled:opacity-50 disabled:pointer-events-none hover:bg-foreground hover:border-foreground"
            >
              {loading ? "Uploading..." : `Confirm (${files.length})`}
            </button>
          )}
        </div>

        {/* Big File Container */}
        <div className="w-full min-h-[200px] max-h-[65vh] border-2 border-border bg-muted/10 relative text-foreground mt-2 flex flex-col overflow-hidden">
          {files.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-black text-2xl uppercase tracking-[0.3em] pointer-events-none select-none">
              [ No files ]
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 relative z-10">
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest border-b-2 border-border pb-3 text-muted-foreground p-3 ">
                <span>{files.length} Item{files.length !== 1 && 's'}</span>
                <div className="flex items-center gap-3">
                  <span>{(files.reduce((a, b) => a + b.size, 0) / 1024 / 1024).toFixed(2)} / 100 MB</span>
                  <div className="flex border-2 border-border">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
                      aria-label="List view"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0 px-6 sm:px-8 py-4">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {files.map((file, i) => (
                      <div key={`${file.name}-${i}`} className="group relative flex flex-col items-center justify-center p-4 h-36 bg-background border-2 border-border hover:border-primary transition-colors">
                        <FileText className="h-10 w-10 mb-3 text-primary" strokeWidth={1.5} />
                        <span className="text-sm font-bold text-center w-full truncate px-1" title={file.name}>{file.name}</span>
                        <span className="text-[11px] text-muted-foreground mt-1 font-mono font-medium tracking-wide">{(file.size / 1024).toFixed(1)} KB</span>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(i)}
                          className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground border-2 border-destructive font-black flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all z-10 hover:bg-secondary hover:border-secondary"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {files.map((file, i) => (
                      <div key={`${file.name}-${i}`} className="group flex items-center justify-between p-3 bg-background border-2 border-border hover:border-primary transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="h-5 w-5 text-primary shrink-0" strokeWidth={1.5} />
                          <span className="text-sm font-bold truncate" title={file.name}>{file.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-muted-foreground font-mono font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(i)}
                            className="h-6 w-6 bg-destructive text-destructive-foreground border-2 border-destructive flex items-center justify-center transition-all hover:bg-secondary hover:border-secondary"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
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
      </div>

      {/* Dashboard Section */}
      {activeShares.length > 0 && (
        <div className="w-full max-w-5xl mt-6">
          <h2 className="text-2xl font-black mb-6 uppercase tracking-widest text-foreground border-b-4 border-border inline-block pb-1">
            Active Shares
          </h2>
          <div className="flex flex-col gap-4 mt-4">
            {activeShares.map((share) => {
              const fileCount = share.files?.length || 0;
              const formattedDate = new Date(share.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              const expiresDate = new Date(share.expiresAt);
              const isExpired = Date.now() > expiresDate.getTime();

              return (
                <div
                  key={share.id}
                  className={`flex flex-col md:flex-row items-start md:items-center justify-between p-5 border-2 
                    ${isExpired ? "bg-muted/30 border-border/50 opacity-60 grayscale" : "bg-background border-border"}
                  `}
                >
                  <div className="flex flex-col gap-2 mb-4 md:mb-0 w-full md:w-auto overflow-hidden">
                    <div className="flex items-center gap-3">
                      <a
                        href={`/s/${share.shortId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-black text-primary hover:underline decoration-2 underline-offset-4"
                      >
                        /s/{share.shortId}
                      </a>
                      {isExpired ? (
                        <span className="text-[11px] uppercase font-black tracking-wider text-muted-foreground border-2 border-muted-foreground/30 bg-muted px-2 py-0.5">
                          Expired
                        </span>
                      ) : (
                        <span className="text-[11px] uppercase font-black tracking-wider text-accent border-2 border-accent bg-accent/10 px-2 py-0.5">
                          Active
                        </span>
                      )}

                      {!isExpired && share.rawPasskey && (
                        <span className="text-xs font-mono font-bold bg-muted px-2 py-1 border-2 border-border ml-2 flex items-center gap-2">
                          <span className="text-primary">{share.rawPasskey}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(share.rawPasskey!);
                              setCopiedId(share.id);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="p-1 hover:bg-background transition-colors"
                            title="Copy Passcode"
                          >
                            {copiedId === share.id ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground/80 font-mono tracking-wide mt-1">
                      {fileCount} ITEM(S) • {(share.size / 1024 / 1024).toFixed(2)} MB • {formattedDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto shrink-0 mt-3 md:mt-0">
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/s/${share.shortId}`)}
                      className="text-xs font-bold uppercase tracking-wider text-secondary-foreground border-2 border-secondary bg-secondary hover:bg-accent hover:border-accent hover:text-accent-foreground py-2 px-4 transition-colors"
                      title="Copy link"
                      disabled={isExpired}
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleDeleteShare(share.id)}
                      className="text-xs font-bold uppercase tracking-wider text-destructive border-2 border-destructive hover:bg-destructive hover:text-destructive-foreground px-4 py-2 transition-colors"
                      title="Stop sharing"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
