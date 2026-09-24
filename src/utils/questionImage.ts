import { BASE_URL } from '../api/client';

/** Resolves the stored image path ("question-images/{id}.webp") to a loadable URL. */
export const questionImageUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,image/png,image/jpeg';
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Returns an error message, or null when the file is acceptable. */
export const validateImageFile = (file: File): string | null => {
  if (!/\.(png|jpe?g)$/i.test(file.name)) return 'Only .png, .jpg and .jpeg images are allowed';
  if (file.size > IMAGE_MAX_BYTES) return 'Image must be 5MB or smaller';
  return null;
};
