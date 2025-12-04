import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import ProductForm from '../forms/ProductForm';
import { DeleteButton, SaveButton, CancelButton } from '../buttons/button';
import { BASE, getAuthHeaders } from '../../services/api';

export default function EditProductModal({ product, open = false, onClose = () => {}, onSaved = () => {} }) {
  const [form, setForm] = useState({ Nazwa: '', Rozmiar: '', Typ: '', Magazyn: '', Ilość: 1 });
  const [stockRows, setStockRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) return;
    // initialize form and stocks
    setForm({
      Nazwa: product.name || product.Nazwa || '',
      Rozmiar: product.size || product.Rozmiar || '',
      Typ: product.type || product.Typ || '',
      Magazyn: product.warehouse || product.Magazyn || '',
      Ilość: product.quantity ?? product.availableQty ?? 1,
      imageUrl: product.imageUrl || null,
      imageThumb: product.imageThumb || null,
    });
    // copy stocks if present
    const rows = (product.stocks || product.stockRows || []).map(s => ({
      warehouseId: s.warehouseId || null,
      warehouseName: s.warehouseName || (s.warehouse && s.warehouse.name) || '',
      quantity: Number(s.quantity) || 0,
      id: s.id || null,
    }));
    setStockRows(rows.length ? rows : []);
  }, [product]);

  useEffect(() => {
    // load warehouses list for selects
    const fetchWarehouses = async () => {
      try {
        const headers = { Accept: 'application/json', ...getAuthHeaders() };
        const r = await fetch(`${BASE}/api/warehouses`, { headers });
        if (!r.ok) return;
        const data = await r.json();
        setWarehouses(data || []);
      } catch (e) {
        // ignore
      }
    };
    fetchWarehouses();
  }, []);

  const addStockRow = () => {
    setStockRows(prev => [...prev, { warehouseId: null, warehouseName: '', quantity: 0 }]);
  };

  const updateStockRow = (idx, changes) => {
    setStockRows(prev => prev.map((r, i) => i === idx ? { ...r, ...changes } : r));
  };

  const removeStockRow = (idx) => {
    setStockRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!product || !product.id) return;
    setLoading(true);
    try {
      // Build payload with product fields and stocks array so backend can atomically
      // replace stocks for this product. Quantities default to minimum 1 when applicable.
      const productPayload = {
        name: form.Nazwa,
        size: form.Rozmiar,
        type: form.Typ,
        imageUrl: form.imageUrl || null,
        imageThumb: form.imageThumb || null,
        stocks: (stockRows || []).map(r => ({ warehouseId: r.warehouseId || null, warehouseName: r.warehouseName || '', quantity: Math.max(1, Number(r.quantity) || 1) }))
      };

      await fetch(`${BASE}/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(productPayload),
      });

      try { window.dispatchEvent(new CustomEvent('resetProductFilters')); } catch (_) {}
      onSaved();
      onClose();
    } catch (e) {
      console.error('EditProductModal save error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} contentClassName="max-w-2xl w-full relative pb-6" contentStyle={{ maxHeight: '90vh', overflow: 'auto' }}>
      <div className="p-4">
        <ProductForm
          form={form}
          setForm={setForm}
          types={[]}
          warehouses={warehouses}
          sizeSuggestions={[]}
          loading={loading}
          onAddProduct={() => {}}
          onConfirmEdit={async (payload) => { /* leave to handleSave below */ }}
          onCancelEdit={onClose}
          isEditing={true}
          editingId={product?.id}
          canAdd={true}
          userId={undefined}
          imageUrl={form.imageUrl}
        />

        <div className="mt-4">
          <div className="space-y-2">
            {stockRows.map((r, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select className="border p-2 rounded flex-1" value={r.warehouseId || r.warehouseName || ''} onChange={e => {
                  const raw = e.target.value;
                  // if selecting id
                  const maybeId = Number(raw);
                  if (!Number.isNaN(maybeId) && maybeId > 0) {
                    const found = warehouses.find(w => String(w.id) === String(maybeId));
                    updateStockRow(idx, { warehouseId: maybeId, warehouseName: found ? found.name : raw });
                  } else {
                    updateStockRow(idx, { warehouseId: null, warehouseName: raw });
                  }
                }}>
                  <option value="">-- wybierz magazyn --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <input className="w-24 border p-2 rounded" type="number" value={r.quantity} onChange={e => updateStockRow(idx, { quantity: Number(e.target.value || 0) })} />
                <DeleteButton onClick={() => removeStockRow(idx)} className="flex-shrink-0" />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded" onClick={addStockRow}>Dodaj magazyn</button>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <CancelButton onClick={onClose} disabled={loading}>Anuluj</CancelButton>
          <SaveButton onClick={handleSave} disabled={loading}>{loading ? 'Zapis...' : 'Zapisz zmiany'}</SaveButton>
        </div>
      </div>
    </Modal>
  );
}
