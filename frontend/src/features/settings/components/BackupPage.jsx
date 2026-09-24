import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { getStoredToken } from "../../../lib/auth";

const getDefaultApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:5000/api/v1";
  }

  return `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl();

function formatRelativeTime(value) {
  if (!value) return "No backup generated yet";

  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "Backup available";

  const diffMs = Date.now() - then.getTime();
  if (diffMs < 60 * 1000) return "Last backup just now";

  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    return `Last backup ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `Last backup ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `Last backup ${days} day${days === 1 ? "" : "s"} ago`;
}

export function BackupPage() {
  const [meta, setMeta] = useState({
    has_backup: false,
    last_backup_at: null,
    last_backup_filename: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const loadMeta = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/settings/backup/meta");
      setMeta(response.data || {});
      setFeedback({ type: "", message: "" });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to load backup information." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  const buttonLabel = useMemo(() => {
    if (isDownloading) return "DOWNLOADING BACKUP...";
    if (isLoading) return "LOADING BACKUP STATUS...";
    if (!meta.has_backup) return "DOWNLOAD DATABASE BACKUP";
    return `DOWNLOAD BACKUP - ${formatRelativeTime(meta.last_backup_at).replace(/^Last backup /, "").toUpperCase()}`;
  }, [isDownloading, isLoading, meta.has_backup, meta.last_backup_at]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setFeedback({ type: "", message: "" });

    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE_URL}/settings/backup/download`, {
        method: "GET",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        let message = "Failed to download backup.";
        try {
          const body = await response.json();
          message = body?.message || message;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename=\"?([^"]+)\"?/i);
      const filename = filenameMatch?.[1] || "hospital-backup.sql";

      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      setFeedback({ type: "success", message: "Backup downloaded successfully." });
      await loadMeta();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to download backup." });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white px-5 py-8 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      {feedback.message ? (
        <div
          className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
            feedback.type === "error" ? "bg-[#fff1f1] text-[#d64545]" : "bg-[#eef9ee] text-[#218739]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid min-h-[475px] place-items-center">
        <div className="text-center">
          <button
            className="inline-flex items-center gap-2 rounded-[4px] bg-[#2d7fe0] px-4 py-2 text-[12px] font-semibold text-white shadow-[0_3px_8px_rgba(45,127,224,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || isDownloading}
            onClick={handleDownload}
            type="button"
          >
            <svg aria-hidden="true" className="h-[14px] w-[14px]" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 2.5a3.5 3.5 0 0 1 3.47 3.02A2.75 2.75 0 1 1 12 11H4.2a2.2 2.2 0 0 1-.2-4.39A4 4 0 0 1 8 2.5Zm0 3.1-2.2 2.2h1.4V10h1.6V7.8h1.4L8 5.6Z" />
            </svg>
            <span>{buttonLabel}</span>
          </button>

          <p className="mt-4 text-[13px] text-[#60707a]">
            {meta.has_backup
              ? `${formatRelativeTime(meta.last_backup_at)}${meta.last_backup_filename ? ` • ${meta.last_backup_filename}` : ""}`
              : "Generate and download a fresh database backup file."}
          </p>
        </div>
      </div>
    </section>
  );
}
