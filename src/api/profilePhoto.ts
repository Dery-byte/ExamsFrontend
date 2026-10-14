import client from './client';

/**
 * The signed-in user's own profile photo (every role). The server checks it is a real PNG or JPEG,
 * crops it square and compresses it to WebP, like question images. Returns the stored path.
 */
export const uploadProfilePhoto = (file: File): Promise<{ profilePicture: string | null }> => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/profile/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

export const removeProfilePhoto = (): Promise<{ profilePicture: string | null }> =>
  client.delete('/profile/photo').then(r => r.data);
