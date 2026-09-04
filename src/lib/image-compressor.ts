import imageCompression from 'browser-image-compression';

export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

export async function compressImage(file: File, options?: CompressOptions): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 0.15, // Max 150KB
    maxWidthOrHeight: 1200, // Max 1200px width/height
    useWebWorker: true,
    fileType: 'image/webp', // Convert to efficient WebP
    ...options,
  };

  try {
    const compressedBlob = await imageCompression(file, defaultOptions);
    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([compressedBlob], newFileName, { type: 'image/webp' });
  } catch (error) {
    console.warn('Image compression failed, falling back to original:', error);
    return file;
  }
}
