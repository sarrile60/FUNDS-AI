// DocumentUploader.jsx
// =====================
// Drag-and-drop or click-to-upload component used on the Start Procedure page.
// Optional — user can start the procedure with zero documents.
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, FileText, Image as ImageIcon, X, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "../api";
import { useI18n } from "../i18n";

const MAX_FILES = 5;
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*";

function fmtSize(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploader() {
  const { t, lang } = useI18n();
  const isIt = lang === "it";
  const [docs, setDocs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState({}); // { tempId: progress }
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try { setDocs(await api.listDocuments()); } catch {}
    })();
  }, []);

  const upload = async (file) => {
    if (docs.length + Object.keys(uploading).length >= MAX_FILES) {
      toast.error(isIt ? `Massimo ${MAX_FILES} file` : `Maximum ${MAX_FILES} files`);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(isIt ? "File troppo grande (max 25 MB)" : "File too large (max 25 MB)");
      return;
    }
    const tempId = Math.random().toString(36).slice(2);
    setUploading((u) => ({ ...u, [tempId]: 0 }));
    try {
      const doc = await api.uploadDocument(file, (p) => {
        setUploading((u) => ({ ...u, [tempId]: p }));
      });
      setDocs((prev) => [doc, ...prev]);
      toast.success(isIt ? "Documento caricato" : "Document uploaded");
    } catch (e) {
      const d = e?.response?.data?.detail;
      const msg = typeof d === "string" ? d : isIt ? "Errore caricamento" : "Upload error";
      toast.error(msg);
    } finally {
      setUploading((u) => { const n = { ...u }; delete n[tempId]; return n; });
    }
  };

  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(upload);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []);
    files.forEach(upload);
  };

  const remove = async (doc) => {
    try {
      await api.deleteDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success(isIt ? "Documento eliminato" : "Document removed");
    } catch {
      toast.error(isIt ? "Errore eliminazione" : "Delete error");
    }
  };

  const total = docs.length + Object.keys(uploading).length;
  const canAdd = total < MAX_FILES;

  return (
    <div className="aif-card p-6 md:p-8" data-testid="document-uploader">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[12px] uppercase tracking-[0.2em] text-[#5FE3C9]">
            {isIt ? "Documenti (opzionale)" : "Documents (optional)"}
          </div>
          <p className="text-[13px] text-[var(--aif-text-dim)] mt-1 max-w-2xl">
            {isIt
              ? "Carica eventuali documenti relativi alla truffa: ricevute bancarie, screenshot, chat, dashboard del broker, denunce, ecc. Massimo 5 file da 25 MB ciascuno."
              : "Upload any documents related to the scam: bank receipts, screenshots, chats, broker dashboard, police reports, etc. Max 5 files of 25 MB each."}
          </p>
        </div>
        <div className="aif-chip text-[11px]">
          {total} / {MAX_FILES}
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => canAdd && inputRef.current?.click()}
        className={`mt-5 aif-card !rounded-xl p-8 text-center cursor-pointer transition border-2 border-dashed ${
          dragOver ? "!border-[#5FE3C9] bg-[#5FE3C9]/5" : canAdd ? "!border-[var(--aif-line)] hover:!border-[#5FE3C9]/50" : "!border-[var(--aif-line)] opacity-50 !cursor-not-allowed"
        }`}
        data-testid="doc-dropzone"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={onPick}
          className="hidden"
          disabled={!canAdd}
          data-testid="doc-input"
        />
        <UploadCloud size={36} className="text-[#5FE3C9] mx-auto mb-3" />
        <div className="text-white font-semibold text-[15px]">
          {isIt ? "Trascina qui i tuoi file o clicca per selezionarli" : "Drag your files here or click to select"}
        </div>
        <div className="text-[12px] text-[var(--aif-text-dim)] mt-1">
          PDF · JPG · PNG · HEIC · WEBP — {isIt ? "max" : "max"} 25 MB
        </div>
      </div>

      {/* List */}
      {(docs.length > 0 || Object.keys(uploading).length > 0) && (
        <div className="mt-5 space-y-2">
          {Object.entries(uploading).map(([id, p]) => (
            <div key={id} className="aif-card !rounded-xl p-3 flex items-center gap-3">
              <Loader2 size={18} className="text-[#5FE3C9] animate-spin"/>
              <div className="flex-1">
                <div className="text-[13px] text-white">{isIt ? "Caricamento…" : "Uploading…"}</div>
                <div className="h-1.5 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF] transition-all" style={{ width: `${p}%` }}/>
                </div>
              </div>
              <div className="text-[11px] text-[var(--aif-text-dim)] w-10 text-right">{p}%</div>
            </div>
          ))}

          {docs.map((d) => {
            const isImg = d.mime_type?.startsWith("image/");
            return (
              <div key={d.id} className="aif-card !rounded-xl p-3 flex items-center gap-3" data-testid={`doc-${d.id}`}>
                {isImg && d.thumbnail_url ? (
                  <img src={d.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover bg-[#0E1A36]"/>
                ) : (
                  <div className="w-10 h-10 rounded bg-[#5FE3C9]/15 border border-[#5FE3C9]/40 flex items-center justify-center text-[#5FE3C9]">
                    {isImg ? <ImageIcon size={16}/> : <FileText size={16}/>}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-white truncate flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-[#4ADE80] shrink-0"/>
                    <span className="truncate">{d.original_name}</span>
                  </div>
                  <div className="text-[11px] text-[var(--aif-text-dim)] mt-0.5">{fmtSize(d.size_bytes || 0)}</div>
                </div>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#5FE3C9] hover:underline">
                  {isIt ? "Visualizza" : "View"}
                </a>
                <button
                  onClick={() => remove(d)}
                  className="text-[var(--aif-text-dim)] hover:text-[#FF6B7A] p-1.5"
                  title={isIt ? "Rimuovi" : "Remove"}
                  data-testid={`doc-remove-${d.id}`}
                >
                  <X size={14}/>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
