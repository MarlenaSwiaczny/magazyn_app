import React, { useEffect, useState } from 'react';
import { resolveImageUrl } from '../../services/api';
import ProductDetailsModal from './ProductDetailsModal';
import { EditButton, DeleteButton } from '../buttons/button';

export default function EditListItem({ product, onEdit, onDelete }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const name = product?.name ?? product?.Nazwa ?? '';
  const size = product?.size ?? product?.Rozmiar ?? '';
  const type = product?.type ?? product?.Typ ?? '';
  const available = product?.availableQty ?? 0;
  const rawImage = product?.imageThumb ?? product?.imageUrl ?? product?.image ?? '';
  let image = '';
  if (typeof rawImage === 'string') image = resolveImageUrl(rawImage) || rawImage || '';
  else if (rawImage && (rawImage instanceof File || rawImage instanceof Blob || typeof rawImage === 'object')) image = objectUrl || '';

  useEffect(() => {
    if (rawImage && (rawImage instanceof File || rawImage instanceof Blob || typeof rawImage === 'object')) {
      try { const url = URL.createObjectURL(rawImage); setObjectUrl(url); return () => { try { URL.revokeObjectURL(url); } catch (e) {} }; } catch (e) { setObjectUrl(null); }
    } else {
      if (objectUrl) { try { URL.revokeObjectURL(objectUrl); } catch (e) {} setObjectUrl(null); }
    }
    setImageFailed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawImage]);

  return (
    <div className="w-full mb-2">
      <div className={`w-full rounded-lg p-2 border border-[#e5e7eb] hover:bg-slate-50 md:max-w-3xl md:mx-auto md:p-4`} onClick={() => setShowDetailsModal(true)}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {image && !imageFailed ? (
              <img src={image} alt={name || 'image'} className="rounded-md object-cover border cursor-pointer" style={{ width: 56, height: 56 }} onClick={(e) => { e.stopPropagation(); setShowDetailsModal(true); }} onError={() => setImageFailed(true)} />
            ) : (
              <div className="rounded-md bg-white border" style={{ width: 56, height: 56 }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center md:gap-4">
              {type && <div className="text-xs md:text-sm px-1 md:px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 inline-flex items-center mb-1 md:mb-0 whitespace-nowrap max-w-max">{type}</div>}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm md:text-base lg:text-lg text-[#2a3b6e] truncate">{name}{size ? ` ${size}` : ''}</div>
              </div>
              <div className="text-xs md:text-sm mt-1 md:mt-0 md:ml-2">
                {product && Array.isArray(product.rawRows) ? (() => {
                  const totalQty = product.availableQty ?? product.rawRows.reduce((s, r) => s + (Number(r.availableQty ?? r.quantity ?? r.Ilość ?? 0) || 0), 0);
                  const whCount = (product.warehousesCount ?? Array.from(new Set((product.rawRows || []).map(r => r.warehouse || r.Magazyn).filter(Boolean))).length) || 0;
                  if (totalQty > 0) {
                    return (
                      <span className="text-sm font-semibold inline-flex items-center px-1 md:px-2 py-0.5 md:py-1 rounded bg-green-50 text-green-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z"/></svg>
                        Dostępny w <span className="font-bold px-1">{whCount}</span> magazynach — <span className="font-bold px-1">{totalQty}</span>
                      </span>
                    );
                  }
                  return (<span className="text-sm font-semibold inline-block px-1 md:px-2 py-0.5 md:py-1 rounded bg-yellow-50 text-yellow-800">Niedostępny</span>);
                })() : (available > 0 ? (
                  <span className="text-sm font-semibold inline-flex items-center px-1 md:px-2 py-0.5 md:py-1 rounded bg-green-50 text-green-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z"/></svg>
                    <span className="font-bold px-1">{available}</span>
                  </span>
                ) : (
                  <span className="text-sm font-semibold inline-block px-1 md:px-2 py-0.5 md:py-1 rounded bg-yellow-50 text-yellow-800">Niedostępny</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <EditButton onClick={(e) => { e.stopPropagation(); if (typeof onEdit === 'function') onEdit(product); }} />
            <DeleteButton onClick={(e) => { e.stopPropagation(); if (typeof onDelete === 'function') onDelete(product); }} />
          </div>
        </div>
      </div>

      <ProductDetailsModal product={product} open={showDetailsModal} onClose={() => setShowDetailsModal(false)} />
    </div>
  );
}
