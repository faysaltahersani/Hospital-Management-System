import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiBlob, apiRequest, apiUpload } from "../../../lib/api";

/**
 * Image viewer for a study's attachments.
 *
 * Nothing here loads until the viewer is opened. The Patient Profile and the
 * history list show only counts and captions, which come from the study rows they
 * already have — opening a patient with years of imaging must not pull megabytes
 * of pictures across the wire.
 *
 * Within the viewer, loading is still per-image: the file list arrives first, and
 * each image's bytes are fetched the first time it is shown. Fetched blobs are
 * cached for the life of the viewer and revoked when it closes, so paging back and
 * forth does not re-download and closing does not leak.
 */

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;

/** Types the browser can render inline. Anything else is offered as a download. */
const isViewable = (mime) =>
  typeof mime === "string" &&
  (mime.startsWith("image/") || mime === "application/pdf");

/**
 * A study only accepts new files while it is still open. Once it is verified or
 * final the record is signed and the server refuses an upload (409), so the control
 * is hidden rather than offered and then rejected.
 */
const UPLOADABLE_STATUSES = new Set([
  "ordered",
  "sample_collected",
  "processing",
  "result_entered",
  "under_review",
]);

/** Live file rows carry `file_size`; a frozen snapshot carries `size_bytes`. */
const sizeOf = (file) => file?.file_size ?? file?.size_bytes ?? null;

const humanSize = (bytes) => {
  if (!Number.isFinite(Number(bytes))) return "";
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export function DiagnosticImageViewer({ study, onClose }) {
  const [files, setFiles] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const [objectUrl, setObjectUrl] = useState("");
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [caption, setCaption] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  // storage-key-free cache: attachment id -> object URL
  const cache = useRef(new Map());
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const studyId = study?.id;
  const canUpload = UPLOADABLE_STATUSES.has(study?.status);

  /* ── the file list (metadata only) ──────────────────────────────────────── */
  useEffect(() => {
    if (!studyId) return undefined;

    let cancelled = false;
    setLoadingList(true);
    setListError("");

    apiRequest(`/diagnostics/${studyId}/files?current_only=true`)
      .then((response) => {
        if (cancelled) return;
        const rows = Array.isArray(response?.data) ? response.data : [];
        setFiles(rows);
        setIndex(0);
      })
      .catch((error) => {
        if (!cancelled) setListError(error.message || "Could not load the file list");
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studyId, reloadToken]);

  /* ── revoke every cached URL when the viewer unmounts ───────────────────── */
  useEffect(
    () => () => {
      cache.current.forEach((url) => URL.revokeObjectURL(url));
      cache.current.clear();
    },
    []
  );

  const viewable = useMemo(() => files.filter((f) => isViewable(f.mime_type)), [files]);
  const others = useMemo(() => files.filter((f) => !isViewable(f.mime_type)), [files]);
  const current = viewable[index] || null;

  /* ── fetch the current image's bytes, once ──────────────────────────────── */
  useEffect(() => {
    if (!current || !studyId) {
      setObjectUrl("");
      return undefined;
    }

    const cached = cache.current.get(current.id);
    if (cached) {
      setObjectUrl(cached);
      setImageError("");
      return undefined;
    }

    let cancelled = false;
    setLoadingImage(true);
    setImageError("");

    apiBlob(`/diagnostics/${studyId}/files/${current.id}/download`)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        cache.current.set(current.id, url);
        setObjectUrl(url);
      })
      .catch((error) => {
        if (!cancelled) setImageError(error.message || "Could not load this image");
      })
      .finally(() => {
        if (!cancelled) setLoadingImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [current, studyId]);

  /* ── controls ───────────────────────────────────────────────────────────── */
  const reset = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  const go = useCallback(
    (delta) => {
      setIndex((prev) => {
        if (!viewable.length) return 0;
        const next = (prev + delta + viewable.length) % viewable.length;
        return next;
      });
      reset();
    },
    [reset, viewable.length]
  );

  const zoomBy = useCallback((delta) => {
    setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((prev + delta).toFixed(2)))));
  }, []);

  const download = useCallback(
    async (file) => {
      if (!studyId || !file) return;
      try {
        const blob = await apiBlob(`/diagnostics/${studyId}/files/${file.id}/download?download=true`);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.original_name || `file-${file.id}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Revoked on the next tick so the browser has started the save.
        setTimeout(() => URL.revokeObjectURL(url), 0);
      } catch (error) {
        setImageError(error.message || "Could not download the file");
      }
    },
    [studyId]
  );

  /**
   * Uploads one or more pictures to this study.
   *
   * The server is the authority on what is acceptable: it re-checks the type
   * against its allow-list, computes the checksum and refuses a locked study. Its
   * message is shown verbatim rather than replaced with a generic failure, because
   * "SVG is not an accepted type" is useful and "upload failed" is not.
   */
  const upload = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (!studyId || !files.length) return;

      setUploading(true);
      setUploadError("");
      setUploadNote("");

      try {
        const form = new FormData();
        files.forEach((file) => form.append("files", file));
        form.append("kind", "image");
        // One caption applies to a single file; with several, each keeps its name.
        if (files.length === 1 && caption.trim()) form.append("caption", caption.trim());

        const response = await apiUpload(`/diagnostics/${studyId}/files`, form);
        const added = Array.isArray(response?.data) ? response.data.length : files.length;
        setUploadNote(`${added} file(s) added.`);
        setCaption("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Re-read the list so the new pictures appear with their server-side
        // metadata rather than a guess at what was stored.
        setReloadToken((prev) => prev + 1);
      } catch (error) {
        setUploadError(error.message || "Could not upload the file");
      } finally {
        setUploading(false);
      }
    },
    [caption, studyId]
  );

  /* ── keyboard ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (event) => {
      // Typing a caption must not page the images or toggle full screen.
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (event.key === "Escape") event.target.blur();
        return;
      }
      if (event.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else onClose?.();
        return;
      }
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "+" || event.key === "=") zoomBy(ZOOM_STEP);
      if (event.key === "-") zoomBy(-ZOOM_STEP);
      if (event.key === "0") reset();
      if (event.key.toLowerCase() === "r") setRotation((prev) => (prev + 90) % 360);
      if (event.key.toLowerCase() === "f") setFullscreen((prev) => !prev);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, go, onClose, reset, zoomBy]);

  const isPdf = current?.mime_type === "application/pdf";

  const button =
    "rounded-[3px] border border-[#d6dde0] bg-white px-2 py-[3px] text-[12px] leading-none text-[#40484e] transition-colors hover:bg-[#eef3f5] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[rgba(16,26,31,0.82)] ${
        fullscreen ? "" : "p-4 sm:p-8"
      }`}
      ref={containerRef}
    >
      <div
        className={`mx-auto flex w-full flex-1 flex-col overflow-hidden bg-white ${
          fullscreen ? "" : "max-w-[1180px] rounded-[8px] shadow-[0_18px_44px_rgba(9,20,26,0.4)]"
        }`}
      >
        {/* header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e4eaec] bg-[#f7fafb] px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#1f252b]">
              {study?.test_name || "Images"}
              <span className="ml-2 font-normal text-[#6b757c]">{study?.study_code}</span>
            </p>
            <p className="truncate text-[11px] text-[#7b858c]">
              {current
                ? `${current.original_name || "file"} · ${current.mime_type || ""} · ${humanSize(sizeOf(current))}`
                : "No viewable image in this study"}
            </p>
          </div>

          <span className="rounded-[3px] bg-[#e8eef0] px-2 py-[3px] text-[12px] leading-none text-[#40484e]">
            {viewable.length ? `${index + 1} / ${viewable.length}` : "0 / 0"}
          </span>

          <button className={button} onClick={onClose} type="button">
            Close
          </button>
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#e4eaec] px-3 py-2">
          <button className={button} disabled={viewable.length < 2} onClick={() => go(-1)} type="button">
            ‹ Prev
          </button>
          <button className={button} disabled={viewable.length < 2} onClick={() => go(1)} type="button">
            Next ›
          </button>

          <span className="mx-1 h-4 w-px bg-[#e0e6e9]" />

          <button className={button} disabled={isPdf} onClick={() => zoomBy(-ZOOM_STEP)} type="button">
            −
          </button>
          <span className="min-w-[46px] text-center text-[12px] text-[#40484e]">
            {Math.round(zoom * 100)}%
          </span>
          <button className={button} disabled={isPdf} onClick={() => zoomBy(ZOOM_STEP)} type="button">
            +
          </button>

          <button
            className={button}
            disabled={isPdf}
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            type="button"
          >
            Rotate
          </button>
          <button className={button} disabled={isPdf} onClick={reset} type="button">
            Reset
          </button>
          <button className={button} onClick={() => setFullscreen((prev) => !prev)} type="button">
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>

          <span className="mx-1 h-4 w-px bg-[#e0e6e9]" />

          <button className={button} disabled={!current} onClick={() => download(current)} type="button">
            Download
          </button>

          <span className="ml-auto text-[11px] text-[#9aa4aa]">
            ← → page · + − zoom · R rotate · 0 reset · F full screen · Esc close
          </span>
        </div>

        {/* stage */}
        <div className="relative flex-1 overflow-auto bg-[#111a1f]">
          {loadingList && (
            <p className="p-6 text-center text-[13px] text-[#c8d2d7]">Loading files…</p>
          )}

          {!loadingList && listError && (
            <p className="p-6 text-center text-[13px] text-[#ffb4b4]">{listError}</p>
          )}

          {!loadingList && !listError && !viewable.length && (
            <div className="p-6 text-center">
              <p className="text-[13px] text-[#c8d2d7]">
                This study has no image or PDF attachment.
              </p>
              {canUpload && (
                <p className="pt-1 text-[12px] text-[#8fa2ab]">
                  Add one with “Add pictures” below.
                </p>
              )}
            </div>
          )}

          {loadingImage && (
            <p className="p-6 text-center text-[13px] text-[#c8d2d7]">Loading image…</p>
          )}

          {imageError && <p className="p-6 text-center text-[13px] text-[#ffb4b4]">{imageError}</p>}

          {!loadingImage && !imageError && objectUrl && isPdf && (
            <iframe className="h-full min-h-[60vh] w-full" src={objectUrl} title="Report PDF" />
          )}

          {!loadingImage && !imageError && objectUrl && !isPdf && (
            <div className="flex min-h-full items-center justify-center p-4">
              <img
                alt={current?.caption || current?.original_name || "Diagnostic image"}
                className="max-w-none select-none"
                src={objectUrl}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 120ms ease-out",
                }}
              />
            </div>
          )}
        </div>

        {/* upload: only while the study is still open */}
        {canUpload ? (
          <div className="border-t border-[#e4eaec] bg-[#f7fafb] px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#40484e]">Add pictures</span>

              <input
                accept="image/*,application/pdf,.dcm"
                className="text-[11px] text-[#40484e] file:mr-2 file:rounded-[3px] file:border file:border-[#d6dde0] file:bg-white file:px-2 file:py-[3px] file:text-[11px] file:text-[#40484e]"
                disabled={uploading}
                multiple
                onChange={(event) => upload(event.target.files)}
                ref={fileInputRef}
                type="file"
              />

              <input
                className="h-[26px] w-[190px] rounded-[3px] border border-[#d6dde0] bg-white px-2 text-[11px] text-[#2c343a] outline-none focus:border-[#327b84]"
                disabled={uploading}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Caption (single file)"
                value={caption}
              />

              {uploading && <span className="text-[11px] text-[#5d666d]">Uploading…</span>}
              {uploadNote && !uploading && (
                <span className="text-[11px] text-[#2c6e31]">{uploadNote}</span>
              )}
              {uploadError && (
                <span className="text-[11px] text-[#c0392b]">{uploadError}</span>
              )}
            </div>
            <p className="pt-1 text-[10px] text-[#8b959b]">
              JPEG, PNG, TIFF, WebP, PDF and DICOM are accepted, up to 64 MB each. The server
              validates the type and records a checksum for every file.
            </p>
          </div>
        ) : (
          <div className="border-t border-[#e4eaec] bg-[#f7fafb] px-3 py-2">
            <p className="text-[11px] text-[#7b858c]">
              This study is “{study?.status}”, so its files are part of the signed record and
              cannot be changed. A correction goes through an amendment.
            </p>
          </div>
        )}

        {/* thumbnails: rendered from metadata, so this strip costs no downloads */}
        {viewable.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto border-t border-[#e4eaec] bg-[#f7fafb] px-3 py-2">
            {viewable.map((file, position) => (
              <button
                className={`min-w-[112px] max-w-[160px] shrink-0 rounded-[3px] border px-2 py-1 text-left transition-colors ${
                  position === index
                    ? "border-[#327b84] bg-[#e6f1f2]"
                    : "border-[#dfe6e9] bg-white hover:bg-[#eef3f5]"
                }`}
                key={file.id}
                onClick={() => {
                  setIndex(position);
                  reset();
                }}
                title={file.original_name}
                type="button"
              >
                <span className="block truncate text-[11px] leading-tight text-[#2c343a]">
                  {position + 1}. {file.caption || file.original_name || `File ${file.id}`}
                </span>
                <span className="block truncate text-[10px] leading-tight text-[#8b959b]">
                  {file.kind}
                  {file.version > 1 ? ` · v${file.version}` : ""}
                  {file.is_original ? "" : " · replacement"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* non-viewable attachments stay reachable */}
        {others.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#e4eaec] px-3 py-2">
            <span className="text-[11px] text-[#7b858c]">Other attachments:</span>
            {others.map((file) => (
              <button className={button} key={file.id} onClick={() => download(file)} type="button">
                {file.original_name || `File ${file.id}`} ({humanSize(sizeOf(file))})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
