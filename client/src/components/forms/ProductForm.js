import React, { useState, useEffect, useRef } from "react";
import ProductImageDropzone from "./ProductImageDropzone";
import { createThumbnail, createResizedImage } from '../../utils/imageUtils';
import ConfirmButton from "../common/ConfirmButton";
import QtyStepper from '../common/QtyStepper';
import styles from './product-form.module.css';
import { BASE, getProductsDb } from '../../services/api';
import { DeleteButton, CancelButton } from '../buttons/button';

export default function ProductForm({
  form,
  setForm,
  types,
  warehouses,
  sizeSuggestions,
  loading,
  onAddProduct,
  onConfirmEdit,
  onCancelEdit,
  isEditing,
  editingId,
  canAdd,
  userId,
  imageUrl,
  // optional prop: when fields that also act as list filters change, emit them here
  onFilterChange,
  // optional multi-warehouse editing passed by parent (EditView)
  stockRows,
  setStockRows,
}) {
  const [image, setImage] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    // We intentionally run this effect only when entering/exiting edit mode or when the
    // initial imageUrl prop changes. We do not want to update originalForm while the
    // user is editing fields — originalForm should capture the original values at the
    // moment edit mode is entered. ESLint would normally ask to include form fields in
    // the dependency array, but that would cause originalForm to update during edits.
    if (isEditing) {
      setOriginalForm({
        Nazwa: form.Nazwa,
        Rozmiar: form.Rozmiar,
        Typ: form.Typ,
        imageUrl: form.imageUrl || imageUrl || null
      });
      // Initialize local image preview with existing image URL so user sees current photo
      setImage(form.imageUrl || imageUrl || null);
    } else {
      setOriginalForm(null);
      setImage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, imageUrl]);

  // Check if form changed during edit
  const [originalStockRows, setOriginalStockRows] = useState(null);
  useEffect(() => {
    if (isEditing && Array.isArray(stockRows)) {
      setOriginalStockRows(JSON.stringify(stockRows || []));
    } else {
      setOriginalStockRows(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const isFormChanged = isEditing && originalForm && (
    form.Nazwa !== originalForm.Nazwa ||
    form.Rozmiar !== originalForm.Rozmiar ||
    form.Typ !== originalForm.Typ ||
    (image !== null && image !== originalForm.imageUrl) ||
    (originalStockRows && JSON.stringify(stockRows || []) !== originalStockRows)
  );

  const filterTimerRef = useRef(null);
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // update local form
    setForm((prev) => {
      const newForm = { ...prev, [name]: value };
      // If this field is one of the filter fields, emit debounced filter change
      if (typeof onFilterChange === 'function' && ['Nazwa', 'Rozmiar', 'Typ'].includes(name)) {
        try {
          if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
        } catch (_) {}
        filterTimerRef.current = setTimeout(() => {
          try { onFilterChange({ [name]: newForm[name] }); } catch (_) {}
        }, 250);
      }
      return newForm;
    });
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { try { if (filterTimerRef.current) clearTimeout(filterTimerRef.current); } catch (_) {} };
  }, []);

  // Validation for required fields
  const isTypeFilled = Boolean(form.Typ && form.Typ.trim());
  const isNameFilled = Boolean(form.Nazwa && form.Nazwa.trim());
  const isSizeFilled = Boolean(form.Rozmiar && form.Rozmiar.trim());

  // For add/edit require at least one stock row with positive quantity
  const hasValidStocks = Array.isArray(stockRows) && stockRows.some(r => Number(r.quantity) > 0);

  // Add: button enabled only if required fields (name/size/type) are filled.
  // Stocks are optional when creating a product — if present they will be sent in payload.
  const canAddValidated = isNameFilled && isSizeFilled && isTypeFilled && canAdd;
  const [validationError, setValidationError] = useState(null);

  // Edit: button enabled only if required fields are filled and form changed
  const canEditValidated = isEditing && isTypeFilled && isFormChanged;

  return (
    <form className="bg-white rounded-xl shadow p-4 border border-[#e5e7eb] flex flex-col mb-6">
      <div className="w-full flex flex-row flex-wrap items-end gap-4 overflow-x-auto form-row">
        {/* Dropzone for product image */}
        <div className="min-w-[120px] flex flex-col">
          <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Zdjęcie (opcjonalne)</label>
          <div className="w-32 max-w-[208px] min-w-[208px]">
            <ProductImageDropzone image={image} setImage={setImage} />
          </div>
        </div>
        <div className="min-w-[120px] flex flex-col">
          <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Nazwa</label>
          <input
            name="Nazwa"
            placeholder="Nazwa produktu"
            value={form.Nazwa}
            onChange={handleFormChange}
            className="border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] w-full text-xs sm:text-sm"
            autoComplete="off"
          />
        </div>
        <div className="min-w-[100px] flex flex-col">
          <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Rozmiar</label>
          <input
            name="Rozmiar"
            list="rozmiary-list"
            placeholder="Rozmiar"
            value={form.Rozmiar}
            onChange={handleFormChange}
            className="border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] w-full text-xs sm:text-sm"
            autoComplete="off"
          />
          <datalist id="rozmiary-list">
            {sizeSuggestions
              .filter(
                (s) =>
                  s.toLowerCase() === form.Rozmiar.trim().toLowerCase() ||
                  s.toLowerCase().startsWith(form.Rozmiar.trim().toLowerCase())
              )
              .map((size, idx) => (
                <option key={idx} value={size} />
              ))}
          </datalist>
        </div>
        <div className="min-w-[100px] flex flex-col">
          <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Typ</label>
          <select
            name="Typ"
            value={form.Typ || ''}
            onChange={handleFormChange}
            className="border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] w-full text-xs sm:text-sm"
          >
            <option value="">-- wybierz typ --</option>
            {types && types.length > 0 ? types.map((type, idx) => (
              // types can be array of strings (legacy) or objects { id, name }
              typeof type === 'string' ? (
                <option key={idx} value={type}>{type}</option>
              ) : (
                // use the display name as value so filter-by-type (string) works consistently
                <option key={type.id} value={type.name || String(type.id)}>{type.name || String(type.id)}</option>
              )
            )) : null}
          </select>
        </div>
        {/* Magazyn and Ilość removed from top row; they are edited below in the multi-warehouse editor */}
      </div>
      {/* Action buttons depending on mode */}
      {/* Multi-warehouse editor: works for both add and edit flows. Existing rows show warehouse as read-only label and editable quantity. */}
      {Array.isArray(stockRows) && (
        <div className="mt-4 w-full">
          <div className="flex items-center gap-2 mb-2">
            {/* warehouse icon used elsewhere in the app (keeps visual parity) */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#2a3b6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z" />
            </svg>
            <span className="text-sm font-semibold text-[#2a3b6e]">Magazyny:</span>
          </div>
          <div className="space-y-2">
            {stockRows.map((r, idx) => {
              const isNew = !!r.isNew || (!r.warehouseId && !r.warehouseName);
              return (
                <div key={idx} className="flex gap-2 items-center">
                  {/* Warehouse column: either read-only label for existing, or a select for new row */}
                  <div className="flex-1">
                    {isNew ? (
                      <select
                        className="w-full border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] text-xs sm:text-sm"
                        value={r.warehouseId || r.warehouseName || ''}
                        onChange={e => {
                          const raw = e.target.value;
                          const maybeId = Number(raw);
                          if (!Number.isNaN(maybeId) && maybeId > 0) {
                            const found = warehouses.find(w => String(w.id) === String(maybeId));
                            setStockRows(prev => prev.map((it, i) => i === idx ? { ...it, warehouseId: maybeId, warehouseName: found ? found.name : raw, isNew: false, quantity: (it.quantity && Number(it.quantity) >= 1) ? Number(it.quantity) : 1 } : it));
                          } else {
                            setStockRows(prev => prev.map((it, i) => i === idx ? { ...it, warehouseId: null, warehouseName: raw, isNew: false, quantity: (it.quantity && Number(it.quantity) >= 1) ? Number(it.quantity) : 1 } : it));
                          }
                        }}
                      >
                        <option value="">-- wybierz magazyn --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    ) : (
                      <div className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm truncate">{r.warehouseName || (r.warehouse && r.warehouse.name) || '—'}</div>
                    )}
                  </div>

                  {/* Quantity input */}
                  <QtyStepper
                    value={typeof r.quantity === 'number' ? r.quantity : (r.quantity ? Number(r.quantity) : 1)}
                    min={1}
                    onChange={(v) => setStockRows(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Number(v) } : it))}
                    className="mx-0"
                  />

                  {/* Delete button */}
                  <DeleteButton onClick={() => setStockRows(prev => prev.filter((_, i) => i !== idx))} className="flex-shrink-0" />
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            {/* Add button hidden while a new-select row is being chosen */}
            {!(stockRows.some(r => !!r.isNew || (!r.warehouseId && !r.warehouseName))) && (
              <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded shadow" onClick={() => setStockRows(prev => [...prev, { warehouseId: null, warehouseName: '', quantity: 1, isNew: true }])}>Dodaj magazyn</button>
            )}
          </div>
        </div>
      )}
  <div className="flex gap-3 mt-2 w-full justify-end form-actions">
        {isEditing ? (
          <>
            <ConfirmButton
              disabled={loading || !canEditValidated}
              onClick={async () => {
                if (!isTypeFilled) return;
                setUploadError(null);
                let imageUrlFinal = null;
                let imageThumbForPayload = null;
                if (image && typeof image !== "string") {
                  // image might be a thumbnail File with _original attached or the original file itself
                  const originalFile = image._original || image;

                  const uploadFile = async (fileToUpload, filename) => {
                    const fd = new FormData();
                    fd.append('file', fileToUpload, filename || (fileToUpload.name || 'upload.jpg'));
                    // uploadFile invoked
                    const r = await fetch(`${BASE}/api/upload`, { method: 'POST', body: fd });
                    
                    if (!r.ok) {
                      let bodyText = '';
                      try { bodyText = await r.text(); } catch (_) {}
                       
                      console.error('[ProductForm] upload failed body:', bodyText);
                      throw new Error('Upload failed: ' + (bodyText || r.statusText));
                    }
                    const d = await r.json();
                    
                    if (!d.url) throw new Error('No image URL returned');
                    // return the full response so caller can use thumbUrl when available
                    return d;
                  };

                  try {
                    // create a compact thumbnail for list preview / immediate upload
                    const thumbBlob = await createThumbnail(originalFile, 200, 0.75);
                    const thumbFile = thumbBlob ? new File([thumbBlob], `thumb-${originalFile.name}`, { type: thumbBlob.type || 'image/jpeg' }) : originalFile;
                    const thumbResp = await uploadFile(thumbFile, thumbFile.name);
                    const thumbUrl = thumbResp.thumbUrl || thumbResp.url;
                    imageUrlFinal = thumbUrl;
                    const imageThumbValue = thumbResp.thumbUrl || thumbResp.url;
                    imageThumbForPayload = imageThumbValue;
                    // update parent form state so edit handler sees new (thumbnail) imageUrl/thumb
                    if (typeof setForm === 'function') {
                      setForm(prev => ({ ...prev, imageUrl: imageUrlFinal, imageThumb: imageThumbValue }));
                    }
                    // update local preview to the uploaded thumbnail URL
                    setImage(imageUrlFinal);

                    // Start background upload of full original image; when done, update imageUrl to full-sized image
                    (async () => {
                      try {
                        // Resize the original before uploading to limit bandwidth and memory use.
                        const resizedBlob = await createResizedImage(originalFile, 1600, 0.9);
                        const fileToSend = resizedBlob ? new File([resizedBlob], originalFile.name || 'product.jpg', { type: resizedBlob.type || originalFile.type || 'image/jpeg' }) : originalFile;
                        const fullResp = await uploadFile(fileToSend, fileToSend.name || 'product.jpg');
                        const fullUrl = fullResp.url;
                        // update parent/state to full image
                        if (typeof setForm === 'function') {
                          setForm(prev => ({ ...prev, imageUrl: fullUrl }));
                        }
                        setImage(fullUrl);

                        // If we're editing an existing product, persist the full image URL to the DB.
                        // Include the previously uploaded thumbnail (imageThumb) when available so the
                        // server does not clear it by receiving only imageUrl.
                        if (isEditing && editingId) {
                          try {
                            const bodyPayload = { imageUrl: fullUrl, imageThumb: imageThumbForPayload || form.imageThumb || null };
                            // background persist payload prepared
                            await fetch(`${BASE}/api/products/${editingId}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(bodyPayload)
                            });
                            try { window.dispatchEvent(new CustomEvent('resetProductFilters')); } catch (_) {}
                          } catch (e) {
                            console.warn('Failed to persist full image URL after background upload', e);
                          }
                        }
                      } catch (bgErr) {
                        // background upload failed – don't block edit, keep thumbnail
                        console.warn('Background full-image upload failed', bgErr);
                      }
                    })();
                  } catch (err) {
                 
                console.error('[ProductForm] upload error', err);
                setUploadError("Błąd przesyłania zdjęcia: " + err.message);
                    return;
                  }
                } else if (typeof image === "string") {
                  // ensure string URL is absolute
                  imageUrlFinal = image.startsWith('http') ? image : (BASE ? `${BASE}${image}` : image);
                  if (typeof setForm === 'function') {
                    setForm(prev => ({ ...prev, imageUrl: imageUrlFinal }));
                  }
                }
                // Resolve warehouse id (prefer numeric id, fallback to lookup by name)
                const resolveWarehouseId = (val) => {
                  if (val === undefined || val === null || String(val).trim() === '') return null;
                  // if user passed an id already
                  const maybe = Number(val);
                  if (!Number.isNaN(maybe) && Number.isInteger(maybe)) {
                    // verify it's in provided warehouses list if available
                    if (warehouses && warehouses.length > 0) {
                      const found = warehouses.find(w => String(w.id) === String(maybe));
                      if (found) return Number(maybe);
                    } else {
                      return Number(maybe);
                    }
                  }
                  // lookup by name (case-insensitive)
                  if (warehouses && warehouses.length > 0) {
                    const found = warehouses.find(w => ((typeof w === 'object' ? (w.name || '') : String(w))).toString().trim().toLowerCase() === String(val).trim().toLowerCase());
                    if (found) return found.id ?? null;
                  }
                  return null;
                };

                const warehouseId = resolveWarehouseId(form.Magazyn);
                const fromWarehouseId = resolveWarehouseId(form.fromWarehouse ?? null);

                // Confirm edit - build payload. Prefer multi-warehouse `stockRows` when present,
                // otherwise fall back to single-warehouse fields for backward compatibility.
                const payload = {
                  name: form.Nazwa,
                  size: form.Rozmiar,
                  type: form.Typ,
                  userId: userId || form.userId || '',
                  imageUrl: imageUrlFinal || form.imageUrl || '',
                  imageThumb: imageThumbForPayload || form.imageThumb || null,
                };
                if (Array.isArray(stockRows) && stockRows.length > 0) {
                  payload.stocks = stockRows.map(r => ({ warehouseId: r.warehouseId || null, warehouseName: r.warehouseName || '', quantity: Number(r.quantity) || 0 }));
                } else {
                  payload.warehouseId = warehouseId;
                  payload.warehouseName = form.Magazyn ?? null;
                  payload.fromWarehouseId = fromWarehouseId;
                  payload.fromWarehouseName = form.fromWarehouse ?? null;
                  payload.quantity = form.Ilość;
                }
                const ok = await onConfirmEdit(payload);
                // if backend reported conflict or error, keep form values so user can fix them
                if (!ok) return;
                setForm({ Nazwa: "", Rozmiar: "", Typ: "" });
                setImage(null);
              }}
              className={styles['btn-main']}
            >Zatwierdź edycję</ConfirmButton>
            <CancelButton onClick={onCancelEdit} className={styles['btn-cancel']}>Anuluj</CancelButton>
          </>
        ) : (
          <>
            <ConfirmButton
              disabled={loading || !canAddValidated}
              onClick={async () => {
                if (!isNameFilled || !isSizeFilled || !isTypeFilled) return;
                setUploadError(null);
                setValidationError(null);

                // Client-side uniqueness check (Name+Size+Type). If the check fails (network),
                // we continue and let the server handle duplicates as a fallback.
                try {
                  const resp = await getProductsDb();
                  const products = resp && resp.products ? resp.products : (Array.isArray(resp) ? resp : []);
                  const norm = s => (s || '').toString().trim().toLowerCase();
                  const exists = products.some(p => (norm(p.name) === norm(form.Nazwa) && norm(p.size) === norm(form.Rozmiar) && norm(p.type) === norm(form.Typ)));
                  if (exists) {
                    setValidationError('Produkt o tych parametrach już istnieje');
                    return;
                  }
                } catch (e) {
                  // network or API error during pre-check: log and continue to submit (server will validate)
                   
                  console.warn('Pre-submit uniqueness check failed, proceeding to submit:', e);
                }

                let imageUrl = null;
                if (image) {
                  const originalFile = image._original || image;
                  const uploadFile = async (fileToUpload, filename) => {
                    const fd = new FormData();
                    fd.append('file', fileToUpload, filename || (fileToUpload.name || 'upload.jpg'));
                    // uploadFile invoked for add
                    const r = await fetch(`${BASE}/api/upload`, { method: 'POST', body: fd });
                    
                    if (!r.ok) {
                      let bodyText = '';
                      try { bodyText = await r.text(); } catch (_) {}
                       
                      console.error('[ProductForm] upload failed body (add):', bodyText);
                      throw new Error('Upload failed: ' + (bodyText || r.statusText));
                    }
                    const d = await r.json();
                    
                    if (!d.url) throw new Error('No image URL returned');
                    return d;
                  };

                  try {
                    const thumbBlob = await createThumbnail(originalFile, 200, 0.75);
                    const thumbFile = thumbBlob ? new File([thumbBlob], `thumb-${originalFile.name}`, { type: thumbBlob.type || 'image/jpeg' }) : originalFile;
                    const thumbResp = await uploadFile(thumbFile, thumbFile.name);
                    const thumbUrl = thumbResp.thumbUrl || thumbResp.url;
                    imageUrl = thumbUrl;
                    const imageThumbValue = thumbResp.thumbUrl || thumbResp.url;
                    if (typeof setForm === 'function') {
                      setForm(prev => ({ ...prev, imageUrl, imageThumb: imageThumbValue }));
                    }

                    // kick off background upload of full image (resize before send)
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
                        console.warn('Background full-image upload failed', bgErr);
                      }
                    })();
                  } catch (err) {
                 
                console.error('[ProductForm] upload error (add)', err);
                setUploadError("Błąd przesyłania zdjęcia: " + err.message);
                    return;
                  }
                }
                // Build payload using multi-warehouse rows (stockRows)
                const payload = {
                  name: form.Nazwa,
                  size: form.Rozmiar,
                  type: form.Typ,
                  userId,
                  imageUrl,
                  imageThumb: form.imageThumb || null,
                };
                if (Array.isArray(stockRows) && stockRows.length > 0) {
                  payload.stocks = stockRows.map(r => ({ warehouseId: r.warehouseId || null, warehouseName: r.warehouseName || '', quantity: Number(r.quantity) || 0 }));
                }
                await onAddProduct(payload);
                setForm({ Nazwa: "", Rozmiar: "", Typ: "" });
                setImage(null);
              }}
              className={styles['btn-main'] + ' w-full sm:w-auto'}
            >Dodaj produkt</ConfirmButton>
            <CancelButton onClick={onCancelEdit} className={styles['btn-cancel']}>Anuluj</CancelButton>
          </>
        )}
      </div>
      {/* Toast notification */}
      {loading && (
        <div className={styles['toast']}>
          Przetwarzanie...
        </div>
      )}
      {uploadError && (
        <div className={styles['toast']} style={{ background: '#f87171', color: '#fff' }}>
          {uploadError}
        </div>
      )}
      {validationError && (
        <div className={styles['toast']} style={{ background: '#f87171', color: '#fff' }}>
          {validationError}
        </div>
      )}
      {/* Mobile styles: ensure the flex row stacks and child min-widths don't force horizontal scroll */}
          <style>{`
        @media (max-width: 640px) {
          form > .form-row {
            flex-direction: column !important;
            gap: 8px !important;
            align-items: stretch !important;
          }
          /* Make each input group full width and remove restrictive min-widths */
          .form-row > div {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .form-row .w-32,
          .form-row .max-w-[208px],
          .form-row .min-w-[208px] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>
    </form>
  );
}