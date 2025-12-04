import React, { useRef } from "react";

import { createThumbnail } from '../../utils/imageUtils';
import { resolveImageUrl } from '../../services/api';

export default function ProductImageDropzone({ image, setImage }) {
  const fileInputRef = useRef();
  const [previewError, setPreviewError] = React.useState(false);

  React.useEffect(() => {
    setPreviewError(false);
  }, [image]);

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      // create a lightweight thumbnail for immediate preview to avoid loading huge image into DOM
      try {
        const thumb = await createThumbnail(file, 400, 0.8);
        // prefer using the thumbnail blob for preview; keep original file attached under _original if parent needs it
        const thumbFile = thumb ? new File([thumb], `thumb-${file.name}`, { type: thumb.type }) : file;
        thumbFile._original = file;
        setImage(thumbFile);
      } catch (err) {
        setImage(file);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      (async () => {
        try {
          const thumb = await createThumbnail(file, 400, 0.8);
          const thumbFile = thumb ? new File([thumb], `thumb-${file.name}`, { type: thumb.type }) : file;
          thumbFile._original = file;
          setImage(thumbFile);
        } catch (err) {
          setImage(file);
        }
      })();
    }
  };

  return (
    <div
      className="border-2 border-dashed border-gray-400 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition relative w-48 h-48 min-w-[192px] min-h-[192px] max-w-[192px] max-h-[192px]"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current.click()}
      style={{}}
    >
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {image ? (
        <div className="relative w-full h-full flex items-center justify-center p-1">
          {(!previewError && image) ? (
            <img
              src={typeof image === "string" ? resolveImageUrl(image) : URL.createObjectURL(image)}
              alt="Podgląd zdjęcia"
              className="object-contain w-full h-full rounded-xl shadow bg-white"
              onError={(e) => {
                try { console.error('[ProductImageDropzone] preview image load error', { src: e?.target?.src }); } catch (err) {}
                setPreviewError(true);
              }}
            />
          ) : (
            <div className="w-full h-full rounded-xl shadow bg-white border border-dashed border-gray-400 flex items-center justify-center">
              <span className="text-gray-500">Brak podglądu</span>
            </div>
          )}
          <span style={{ position: 'absolute', left: 8, bottom: 8, background: '#fff', padding: '2px 8px', borderRadius: 6, fontSize: 10, opacity: 0.8 }}>
            Podgląd zdjęcia
          </span>
          <button
            type="button"
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 rounded-full p-1 bg-white shadow"
            style={{ zIndex: 2 }}
            onClick={e => { e.stopPropagation(); setImage(null); }}
            aria-label="Usuń zdjęcie"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        <span className="text-gray-500 flex items-center justify-center h-full w-full text-center">Przeciągnij lub wybierz zdjęcie produktu (max 200x200px, opcjonalne)</span>
      )}
    </div>
  );
}
