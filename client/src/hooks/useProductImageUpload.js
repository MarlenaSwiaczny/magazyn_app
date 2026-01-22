import { createThumbnail, createResizedImage } from '../utils/imageUtils';
import { BASE } from '../services/api';

// Lightweight hook-style helper (not a React hook with state) that provides
// an upload helper for product images. Keeps the same behavior as previous
// inline code in ProductForm: upload thumb synchronously, start background
// full-image upload and update setForm when it completes.
export function useProductImageUpload() {
  const uploadImageForAdd = async (image, setForm) => {
    if (!image) return null;
    const originalFile = image._original || image;

    const uploadFile = async (fileToUpload, filename) => {
      const fd = new FormData();
      fd.append('file', fileToUpload, filename || (fileToUpload.name || 'upload.jpg'));
      const r = await fetch(`${BASE}/api/upload`, { method: 'POST', body: fd });
      if (!r.ok) {
        let bodyText = '';
        try { bodyText = await r.text(); } catch (_) {}
        throw new Error('Upload failed: ' + (bodyText || r.statusText));
      }
      const d = await r.json();
      if (!d.url) throw new Error('No image URL returned');
      return d;
    };

    // upload thumbnail first (blocking)
    const thumbBlob = await createThumbnail(originalFile, 200, 0.75);
    const thumbFile = thumbBlob ? new File([thumbBlob], `thumb-${originalFile.name}`, { type: thumbBlob.type || 'image/jpeg' }) : originalFile;
    const thumbResp = await uploadFile(thumbFile, thumbFile.name);
    const thumbUrl = thumbResp.thumbUrl || thumbResp.url;

    // update form with thumb immediately
    if (typeof setForm === 'function') {
      setForm(prev => ({ ...prev, imageUrl: thumbUrl, imageThumb: thumbResp.thumbUrl || thumbResp.url }));
    }

    // kick off background upload of full image
    (async () => {
      try {
        const resizedBlob = await createResizedImage(originalFile, 1600, 0.9);
        const fileToSend = resizedBlob ? new File([resizedBlob], originalFile.name || 'product.jpg', { type: resizedBlob.type || originalFile.type || 'image/jpeg' }) : originalFile;
        const fullResp = await uploadFile(fileToSend, fileToSend.name || 'product.jpg');
        const fullUrl = fullResp.url;
        if (typeof setForm === 'function') {
          setForm(prev => ({ ...prev, imageUrl: fullUrl }));
        }
      } catch (bgErr) {
        // keep behavior minimal: log but do not throw
        // eslint-disable-next-line no-console
        console.warn('Background full-image upload failed', bgErr);
      }
    })();

    return thumbUrl;
  };

  return { uploadImageForAdd };
}

export default useProductImageUpload;
