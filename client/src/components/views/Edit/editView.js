import React, { useState, useEffect, useMemo } from 'react';
import { getProductsDb, getProductStocks, getWarehouses, BASE } from '../../../services/api';
import aggregateProducts from '../../common/aggregateProducts';
import { useToast } from '../../common/ToastContext';
import ProductForm from '../../forms/ProductForm';
import ListItem from '../../product/listItem';
import Pagination from '../Shared/pagination';

export default function EditView({ onBack, onRefresh, userId, onImportExcel, user, pendingEditId = null, pendingEditItem = null, clearPendingEdit = () => {} }) {
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ Nazwa: '', Rozmiar: '', Typ: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingImageUrl, setEditingImageUrl] = useState(null);
  const [stockRows, setStockRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [sizeSuggestions, setSizeSuggestions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 60;
  const { showToast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProductsDb();
      const list = data.products || [];
      setRawProducts(list);
    } catch (err) {
      console.error('[EditView] fetchProducts error', err);
      setRawProducts([]);
      setTypes([]);
      setSizes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); getWarehouses().then(ws => setWarehouses(ws)).catch(() => {}); }, []);

  const products = useMemo(() => aggregateProducts(rawProducts), [rawProducts]);

  useEffect(() => {
    try {
      setTypes(Array.from(new Set((products || []).map(p => p.type).filter(Boolean))));
      setSizes(Array.from(new Set((products || []).map(p => p.size).filter(Boolean))));
    } catch (e) {}
  }, [products]);

  useEffect(() => {
    if (!pendingEditId && !pendingEditItem) return;
    const openFor = async () => {
      try {
        if (pendingEditItem && pendingEditItem.product) {
          handleEdit(pendingEditItem.product, pendingEditItem.stockRows || []);
        } else if (pendingEditId) {
          const pid = Number(pendingEditId);
          const found = products.find(p => Number(p.id) === pid || String(p.id) === String(pid));
          if (found) handleEdit(found);
          else { await fetchProducts(); const found2 = products.find(p => Number(p.id) === pid || String(p.id) === String(pid)); if (found2) handleEdit(found2); }
        }
      } catch (e) { console.warn('EditView: openFor pending edit failed', e); }
      finally { try { clearPendingEdit(); } catch (_) {} }
    };
    openFor();
  }, [pendingEditId, pendingEditItem]);

  useEffect(() => { const v = (form.Rozmiar || '').trim().toLowerCase(); if (v.length >= 1) setSizeSuggestions(sizes.filter(s => s.toLowerCase().startsWith(v))); else setSizeSuggestions([]); }, [form.Rozmiar, sizes]);

  const norm = (s) => (s ?? '').toString().toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '');

  const filtered = useMemo(() => {
    return (products || []).filter(p => {
      const name = norm(p.name || p.Nazwa || '');
      const size = norm(p.size || p.Rozmiar || '');
      const type = norm(p.type || p.Typ || '');
      const matchesForm = (!form.Nazwa || name.includes(norm(form.Nazwa))) && (!form.Rozmiar || size.includes(norm(form.Rozmiar))) && (!form.Typ || type === norm(form.Typ));
      return matchesForm;
    });
  }, [products, form.Nazwa, form.Rozmiar, form.Typ]);

  const totalPages = Math.max(1, Math.ceil((filtered.length || 0) / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage);

  const handleEdit = async (product, preloadedStocks = null) => {
    setEditingId(product.id);
    setForm({ Nazwa: product.name || product.Nazwa || '', Rozmiar: product.size || product.Rozmiar || '', Typ: product.type || product.Typ || '' });
    setEditingImageUrl(product.imageThumb || product.imageUrl || null);
    if (Array.isArray(preloadedStocks) && preloadedStocks.length) setStockRows(preloadedStocks);
    else if (Array.isArray(product.rawRows) && product.rawRows.length) setStockRows(product.rawRows.map(s => ({ warehouseId: s.warehouseId || null, warehouseName: s.warehouse || s.Magazyn || '', quantity: Number(s.availableQty ?? s.quantity ?? s.Ilość ?? 0) || 0, id: s.id || null })));
    else if (product.id) {
      try {
        const res = await getProductStocks(product.id);
        const stocks = Array.isArray(res.stocks) ? res.stocks : [];
        setStockRows(stocks.map(s => ({ warehouseId: s.warehouseId || null, warehouseName: s.warehouseName || s.warehouse || s.Magazyn || '', quantity: Number(s.quantity) || 0, id: s.id || null })));
      } catch (e) {
        setStockRows([]);
      }
    } else setStockRows([]);
    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => { setEditingId(null); setForm({ Nazwa: '', Rozmiar: '', Typ: '' }); setStockRows([]); };

  const handleConfirmEdit = async (payloadFromForm) => {
    if (!editingId) return false;
    setLoading(true);
    try {
      const payload = payloadFromForm ?? { name: form.Nazwa, size: form.Rozmiar, type: form.Typ };
      if (stockRows !== null && stockRows !== undefined) payload.stocks = (stockRows || []).map(r => ({ warehouseId: r.warehouseId || null, warehouseName: r.warehouseName || '', quantity: Number(r.quantity) || 0 }));
      const url = `${BASE || ''}/api/products/${editingId}`;
      const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        let body = null;
        try { body = await res.json(); } catch (_) { body = { error: await res.text().catch(() => null) }; }
        const errMsg = (body && body.error) ? body.error : (typeof body === 'string' ? body : `HTTP ${res.status}`);

        if (res.status === 409 || /already exists|już istnieje|produkt już istnieje/i.test(String(errMsg || ''))) {
          showToast(String(errMsg || 'Taki produkt już istnieje w wybranym magazynie'), { type: 'error', timeout: 5000 });
          return false; // keep form open for correction
        }

        throw new Error(errMsg || 'Błąd edycji produktu');
      }
      await fetchProducts();
      try { onRefresh?.(); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('resetProductFilters')); } catch (_) {}
      showToast('Produkt zaktualizowany!', { type: 'info', timeout: 3000 });
      try { window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'productView' } })); } catch (e) {}
      setEditingId(null);
      return true;
    } catch (e) { showToast(e.message || 'Błąd edycji produktu', { type: 'error', timeout: 3000 }); return false; }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-[#f5f6fa] min-h-screen p-4 rounded-xl shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#2a3b6e]">Edytuj produkt</h2>
          <p className="text-sm text-gray-600">Wyszukaj produkt i edytuj jego dane poniżej. Po zapisie wrócisz do widoku produktów.</p>
        </div>
      </div>

      <div id="product-form" className={'mb-4'}>
        {editingId && (
          <ProductForm
            form={form}
            setForm={setForm}
            types={types}
            warehouses={warehouses}
            sizeSuggestions={sizeSuggestions}
            loading={loading}
            onConfirmEdit={handleConfirmEdit}
            onCancelEdit={handleCancelEdit}
            isEditing={!!editingId}
            editingId={editingId}
            canAdd={!!editingId}
            userId={userId}
            imageUrl={editingImageUrl}
            stockRows={stockRows}
            setStockRows={setStockRows}
          />
        )}
      </div>

      <div className="mt-4">
        <div className="flex flex-col gap-2">
          {paginated.map(p => (
            <ListItem key={`${p.id || p.name}-${p.size}`} product={p} mode={'editView'} onEdit={() => handleEdit(p)} onDelete={() => {}} />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Pagination totalPages={totalPages} currentPage={currentPage} onChangePage={(num) => { setCurrentPage(num); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>
    </div>
  );
}
