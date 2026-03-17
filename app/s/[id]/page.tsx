"use client";

import { useState, useEffect, use } from "react";

interface ShareData {
  size: number;
  expiresAt: string;
  files: { id: string; name: string; size: number }[];
}

interface DownloadLink {
  id: string;
  name: string;
  url: string;
}

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passkey, setPasskey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[] | null>(null);

  useEffect(() => {
    const fetchShareData = async () => {
      try {
        const res = await fetch(`/api/share/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setShareData(data.data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load share.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchShareData();
  }, [id]);

  const handleVerify = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!passkey) return;

    setVerifying(true);
    setError(null);

    try {
      const res = await fetch(`/api/share/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDownloadLinks(data.data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Verification failed.");
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error && !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive" role="alert">{error}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1 text-foreground">
          Download Files
        </h1>

        {shareData && (
          <p className="text-sm text-muted-foreground mb-6">
            {shareData.files.length} file(s) •{" "}
            {(shareData.size / 1024 / 1024).toFixed(2)} MB • Expires{" "}
            {new Date(shareData.expiresAt).toLocaleString()}
          </p>
        )}

        {!downloadLinks ? (
          <form onSubmit={handleVerify} className="flex flex-col gap-3">
            <label htmlFor="passkey-input" className="text-sm text-muted-foreground">
              Enter your passkey to unlock:
            </label>
            <input
              id="passkey-input"
              type="text"
              placeholder="e.g. aBcDeFgH"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              autoComplete="off"
              className="w-full py-2.5 px-3 border border-border rounded-sm
                         bg-muted text-foreground font-mono tracking-widest text-center
                         focus-visible:outline-2 focus-visible:outline-ring"
            />

            {error && (
              <div className="text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!passkey || verifying}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground
                         rounded-md font-medium text-sm
                         hover:opacity-90 transition-opacity
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              {verifying ? "Verifying…" : "Unlock Files"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-foreground">
              Files available for download (links expire in 1 hour):
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              {downloadLinks.map((file) => (
                <li key={file.id}>
                  <a
                    href={file.url}
                    download={file.name}
                    className="flex items-center justify-between p-3 bg-muted rounded-sm
                               border border-border text-foreground no-underline
                               hover:bg-accent hover:text-accent-foreground transition-colors
                               focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                  >
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <span className="text-xs text-primary font-semibold py-1 px-2
                                     bg-background rounded-sm shrink-0">
                      Download
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
