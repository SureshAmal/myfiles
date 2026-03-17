"use client";

import { useState, useEffect, use } from "react";
import { FileText, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import JSZip from "jszip";

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
  const [downloadingAll, setDownloadingAll] = useState(false);

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

  const handleDownloadAll = async () => {
    if (!downloadLinks || downloadLinks.length === 0) return;
    setDownloadingAll(true);

    try {
      const zip = new JSZip();

      const fetchPromises = downloadLinks.map(async (file) => {
        const response = await fetch(file.url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        zip.file(file.name, blob);
      });

      await Promise.all(fetchPromises);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `myfiles_${id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error("Failed to create zip:", err);
      alert("Failed to create zip file. You can still try accessing files individually.");
    } finally {
      setDownloadingAll(false);
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
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8 md:pt-16 bg-background relative font-sans">
      <div className="absolute top-4 right-4 md:top-8 md:right-8 border-2 border-border text-border bg-background transition-all">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-5xl bg-background border-2 border-border p-8">
        <h1 className="text-3xl font-extrabold mb-2 uppercase tracking-tight text-foreground border-b-4 border-primary inline-block pb-1">
          Download
        </h1>

        {shareData && (
          <p className="text-sm font-bold text-muted-foreground mt-4 uppercase tracking-wide">
            {shareData.files.length} FILE(S) •{" "}
            {(shareData.size / 1024 / 1024).toFixed(2)} MB<br />
            EXPIRES: {new Date(shareData.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        <div className="mt-8">
          {!downloadLinks ? (
            <form onSubmit={handleVerify} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="passkey-input" className="text-sm font-black uppercase tracking-widest text-foreground">
                  Access Passcode:
                </label>
                <input
                  id="passkey-input"
                  type="text"
                  placeholder="e.g. aBcDeFgH"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  autoComplete="off"
                  className="w-full py-4 px-4 border-2 border-border bg-muted/30 text-foreground font-mono text-xl tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:bg-background transition-colors"
                />
              </div>

              {error && (
                <div className="text-sm font-bold text-destructive bg-destructive/10 border-2 border-destructive p-3 uppercase tracking-wide">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!passkey || verifying}
                className="w-full py-4 px-6 bg-primary text-primary-foreground font-black uppercase tracking-widest border-2 border-primary hover:bg-foreground hover:border-foreground transition-all disabled:opacity-50 disabled:pointer-events-none mt-2"
              >
                {verifying ? "VERIFYING…" : "UNLOCK FILES"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-primary pl-3">
                {downloadLinks.length > 1 && (
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="w-full md:w-auto text-[11px] sm:text-xs font-black uppercase tracking-widest bg-secondary text-secondary-foreground border-2 border-secondary hover:bg-foreground hover:border-foreground py-2 md:py-3 px-4 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {downloadingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        ZIPPING FILES...
                      </>
                    ) : (
                      "DOWNLOAD ALL (ZIP)"
                    )}
                  </button>
                )}
              </div>
              <ul className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto pr-1">
                {downloadLinks.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const a = document.createElement('a');
                        a.href = file.url;
                        a.download = file.name;
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="w-full group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/30 border-2 border-border text-foreground hover:border-primary transition-all text-left"
                    >
                      <div className="flex items-center gap-3 overflow-hidden w-full sm:w-auto mb-3 sm:mb-0">
                        <FileText className="h-6 w-6 text-primary shrink-0" strokeWidth={1.5} />
                        <span className="font-bold truncate max-w-full text-base" title={file.name}>{file.name}</span>
                      </div>
                      <span className="text-xs text-primary-foreground font-black uppercase tracking-wider py-2 px-4 bg-primary border-2 border-primary group-hover:bg-foreground group-hover:border-foreground transition-colors w-full sm:w-auto text-center shrink-0">
                        DOWNLOAD
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

          )}
        </div>
      </div>
    </main>
  );
}
