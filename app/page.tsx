"use client";

import { useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    shortUrlId: string;
    passkey: string;
    expiresAt: string;
  } | null>(null);

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
    setError(null); // Clear any size errors if we remove a file
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data.data);
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1 text-foreground">
          Secure File Share
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Share up to 100MB securely. Links expire in 12 hours.
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
              Click to select files or drag them here
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
                <ul className="list-none p-0 m-0 flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 rounded-md">
                  {files.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex items-center justify-between p-2 bg-muted rounded-md
                                 border border-border text-sm"
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="truncate text-foreground font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
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
                              py-2 px-3 bg-background rounded-sm border border-dashed border-border">
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
              onClick={() => {
                setResult(null);
                setFiles([]);
              }}
              className="mt-2 bg-transparent border-none text-muted-foreground
                         underline cursor-pointer text-sm
                         focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              Upload more files
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
