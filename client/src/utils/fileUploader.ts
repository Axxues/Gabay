/**
 * File Uploader Utility
 * Saves uploaded files directly to /public/uploads/ via Vite dev server upload middleware
 * so that all uploaded files and images in announcements, modules, and courses
 * persist permanently on disk and survive reloads and builds.
 */

export interface UploadResult {
  name: string;
  size: string;
  url: string;
  type?: string;
  isImage?: boolean;
}

// Single source of truth for the client-side upload cap (matches the
// server multer limit in server/src/routes/files.ts).
export const FILE_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export const isFileTooLarge = (sizeBytes: number): boolean =>
  sizeBytes > FILE_UPLOAD_MAX_BYTES;

// Short CourseFile/ModuleItem type union (mirrors the server detectFileType
// in server/src/routes/files.ts). NEVER store a raw MIME string here:
// office MIME types (e.g. ...wordprocessingml.document, 71 chars) exceed
// the ModuleItem.fileType NVarChar(64) column and cause a 400.
export const toShortFileType = (nameOrMime: string): string => {
  const lower = (nameOrMime || '').toLowerCase();
  if (lower.endsWith('.pdf') || lower.includes('pdf')) return 'pdf';
  if (
    lower.includes('image/') ||
    lower.startsWith('data:image/') ||
    /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)$/.test(lower)
  )
    return 'image';
  if (
    lower.includes('zip') ||
    lower.includes('archive') ||
    /\.(zip|tar|gz|rar|7z)$/.test(lower)
  )
    return 'archive';
  if (
    lower.includes('presentation') ||
    lower.includes('slide') ||
    lower.endsWith('.ppt') ||
    lower.endsWith('.pptx')
  )
    return 'slide';
  if (
    lower.includes('code') ||
    /\.(ts|tsx|js|jsx|py|json|html|css|java|c|cpp)$/.test(lower)
  )
    return 'code';
  return 'document';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const isImageFile = (name: string, type?: string, url?: string): boolean => {
  if (type && type.startsWith('image/')) return true;
  if (url && (url.startsWith('data:image/') || /\.(png|jpg|jpeg|webp|gif|svg|bmp|avif)$/i.test(url))) return true;
  const ext = name.toLowerCase().split('.').pop() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext);
};

export const uploadFileToPublic = async (file: File): Promise<UploadResult> => {
  const formattedSize = formatFileSize(file.size);
  const isImg = isImageFile(file.name, file.type);

  // Convert to base64 DataURL for payload and immediate preview
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  try {
    // Attempt local Vite middleware upload to write directly to /public/uploads/
    const sanitizedName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: sanitizedName,
        dataUrl
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.url) {
        return {
          name: file.name,
          size: formattedSize,
          url: data.url, // e.g. "/uploads/1725900000_filename.pdf"
          type: toShortFileType(file.name),
          isImage: isImg
        };
      }
    }
  } catch (err) {
    console.warn('Vite dev upload endpoint unreachable, falling back to data URL storage:', err);
  }

  // Graceful fallback to persistent Data URL if endpoint not available
  return {
    name: file.name,
    size: formattedSize,
    url: dataUrl,
    type: toShortFileType(file.name),
    isImage: isImg
  };
};
