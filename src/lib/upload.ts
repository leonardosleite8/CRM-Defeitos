const BUCKET = "defect-media";

/** Upload direto à API REST do Storage com progresso (XHR). */
export function uploadFileWithProgress(
  file: File,
  path: string,
  onProgress: (percent: number) => void,
): Promise<{ publicUrl: string }> {
  const urlBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!urlBase || !anon) {
    return Promise.reject(new Error("Supabase não configurado"));
  }
  const encoded = path
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  const url = `${urlBase}/storage/v1/object/${BUCKET}/${encoded}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${anon}`);
    xhr.setRequestHeader("apikey", anon);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const pub = `${urlBase}/storage/v1/object/public/${BUCKET}/${encoded}`;
        resolve({ publicUrl: pub });
      } else {
        reject(new Error(xhr.responseText || `Upload falhou (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Erro de rede no upload"));
    xhr.send(file);
  });
}

export function buildStoragePath(boardId: string, cardId: string, file: File) {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  return `${boardId}/${cardId}/${Date.now()}_${safe}`;
}

/** Uploads de imagem colados em comentários (pasta separada do card). */
export function buildCommentMediaPath(boardId: string, cardId: string, file: File) {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  return `comments/${boardId}/${cardId}/${Date.now()}_${safe}`;
}
