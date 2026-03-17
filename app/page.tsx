"use client";

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { FileText } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface Share {
  id: string;
  shortId: string;
  size: number;
  expiresAt: string;
  createdAt: string;
  files: { name: string; size: number }[];
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    shortUrlId: string;
    passkey: string;
    expiresAt: string;
  } | null>(null);

  const [activeShares, setActiveShares] = useState<Share[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

      setResult(data.data);
      setFiles([]); // Clear files after successful upload
      fetchShares(); // Refresh dashboard
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
    <main className="min-h-screen flex flex-col items-center bg-muted/30 py-12 px-4 gap-8">
      <div className="w-full max-w-4xl flex justify-between items-center mb-[-1rem]">
        <h2 className="text-xl font-bold tracking-tight text-foreground opacity-0">.</h2>
        <ThemeToggle />
      </div>

      {/* Upload Section */}
      <div className="w-full max-w-xl bg-background border border-border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1 text-foreground">
          MyFiles
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Share up to 100MB securely. Links expire in 24 hours.
        </p>

        {!result ? (
          <div className="flex flex-col gap-3">
            <label
              htmlFor="file-upload"
              className="block w-full p-4 border border-dashed border-border rounded-md
                         bg-muted text-muted-foreground text-sm text-center cursor-pointer
                         hover:bg-accent hover:text-accent-foreground transition-colors
                         focus-within:outline-2 focus-within:outline-ring"
            >
              Click to select files (or ZIP archives) or drag them here
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            {files.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-foreground flex justify-between">
                  <span>{files.length} file(s) selected</span>
                  <span className="text-muted-foreground">
                    {(files.reduce((a, b) => a + b.size, 0) / 1024 / 1024).toFixed(2)} / 100 MB
                  </span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 rounded-md">
                  {files.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md
                                 border border-border text-sm"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 text-primary shrink-0 opacity-70" />
                        <div className="flex flex-col truncate pr-2">
                          <span className="truncate text-foreground font-medium">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(i)}
                        className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive
                                   hover:bg-background rounded-sm transition-colors
                                   focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label={`Remove ${file.name}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={files.length === 0 || loading}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground
                         rounded-md font-medium text-sm
                         hover:opacity-90 transition-opacity
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              {loading ? "Uploading..." : "Upload Files"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-muted p-4 rounded-md border border-border">
              <div className="mb-2 text-sm font-semibold text-foreground">
                Keep this Passkey to access files:
              </div>
              <div className="font-mono text-xl tracking-wide text-primary text-center
                              py-2 px-3 bg-background rounded-sm border border-dashed border-border select-all">
                {result.passkey}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Share Link:
            </div>
            <a
              href={`/s/${result.shortUrlId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 px-4 bg-secondary text-secondary-foreground
                         text-center rounded-md font-medium text-sm border border-border
                         hover:bg-accent hover:text-accent-foreground transition-colors
                         focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              Open Link: /s/{result.shortUrlId}
            </a>

            <button
              onClick={() => setResult(null)}
              className="mt-2 bg-transparent border-none text-muted-foreground
                         underline cursor-pointer text-sm
                         focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              Upload more files
            </button>
          </div>
        )}
      </div>

      {/* Dashboard Section */}
      {activeShares.length > 0 && (
        <div className="w-full max-w-2xl bg-background border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Active Shares
          </h2>
          <div className="flex flex-col gap-3">
            {activeShares.map((share) => {
              const fileCount = share.files?.length || 0;
              const formattedDate = new Date(share.createdAt).toLocaleString();
              const expiresDate = new Date(share.expiresAt);
              const isExpired = Date.now() > expiresDate.getTime();

              return (
                <div
                  key={share.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-md border
                    ${isExpired ? "bg-muted/50 border-border/50 opacity-70" : "bg-card border-border shadow-sm"}
                  `}
                >
                  <div className="flex flex-col gap-1 mb-3 sm:mb-0 w-full sm:w-auto overflow-hidden">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/s/${share.shortId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        /s/{share.shortId}
                      </a>
                      {isExpired ? (
                        <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                          Expired
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-success-foreground bg-success/20 px-1.5 py-0.5 rounded-sm">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-md">
                      {share.files?.map((f) => f.name).join(", ")}
                    </div>
                    <div className="text-[11px] text-muted-foreground/70">
                      {fileCount} file(s) • {(share.size / 1024 / 1024).toFixed(2)} MB • {formattedDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/s/${share.shortId}`)}
                      className="text-xs font-medium text-secondary-foreground bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-sm transition-colors"
                      title="Copy link"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleDeleteShare(share.id)}
                      className="text-xs font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 px-3 py-1.5 rounded-sm transition-colors"
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
