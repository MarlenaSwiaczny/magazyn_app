import React, { useEffect, useMemo, useState } from 'react';
import { getProductsDb, getTypes, BASE, getAuthHeaders } from '../../services/api';
import aggregateProducts from '../common/aggregateProducts';
import { useToast } from '../common/ToastContext';
import { buildSearchFilter, normalizeString } from '../common/searchHelpers';
import ProductFilterBar from '../common/ProductFilterBar';
import ProductOptionsBar from '../common/ProductOptionsBar';
import ItemGrid from '../product/ItemGrid';
import Pagination from './pagination';
import AppButton from '../buttons/button';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function ProductView({ user, onBack, setView }) {
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typesList, setTypesList] = useState([]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [availability, setAvailability] = useState('all'); // all | available | unavailable
  const [sortBy, setSortBy] = useState('type');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('viewMode') || 'list');
  const [currentPage, setCurrentPage] = useState(1);

  // Delete modal state (hooks must be declared unconditionally)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showToast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [resp, t] = await Promise.all([getProductsDb(), getTypes()]);
        if (!mounted) return;
        setRawProducts((resp && resp.products) || []);
        setTypesList(t || []);
      } catch (err) {
        console.error('[ProductView] getProductsDb error', err);
        setRawProducts([]);
        setTypesList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Apply pending filter type when navigated from TypesView
  useEffect(() => {
    try {
      const pending = localStorage.getItem('pendingFilterType');
      if (pending) {
        setFilterType(pending);
        localStorage.removeItem('pendingFilterType');
      }
    } catch (e) {}
  }, []);

  // Aggregate rows into unique product entries
  const products = useMemo(() => aggregateProducts(rawProducts), [rawProducts]);

  const types = useMemo(() => (typesList || []).map(t => t.name), [typesList]);

  const filtered = useMemo(() => {
    let list = products || [];
    if ((search || '').trim()) {
      const predicate = buildSearchFilter(search);
      list = list.filter(predicate);
    }
    if (filterType) list = list.filter(p => normalizeString(p.type ?? '') === normalizeString(filterType));
    // Availability: consider a product "available" when it has any connections to warehouses
    // (rows with warehouse/warehouseId). If a product exists only in products table without
    // any warehouse links, treat it as unavailable.
    if (availability === 'available') {
      list = list.filter(p => (p.rawRows || []).some(r => Boolean(r.warehouseId || r.warehouse || r.Magazyn)));
    }
    if (availability === 'unavailable') {
      list = list.filter(p => !(p.rawRows || []).some(r => Boolean(r.warehouseId || r.warehouse || r.Magazyn)));
    }

    // If availability is 'all', prefer available products first.
    const isAvailable = (p) => (p.rawRows || []).some(r => Boolean(r.warehouseId || r.warehouse || r.Magazyn));
    list = [...list].sort((a, b) => {
      if (availability === 'all') {
        const avA = isAvailable(a);
        const avB = isAvailable(b);
        if (avA !== avB) return avA ? -1 : 1; // available first
      }
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'size') {
        const numa = Number((a.size || '').replace(/[^0-9]/g, '')) || 0;
        const numb = Number((b.size || '').replace(/[^0-9]/g, '')) || 0;
        return numa - numb;
      }
      return 0;
    });

    return list;
  }, [products, search, filterType, availability, sortBy]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.max(1, Math.ceil((filtered.length || 0) / itemsPerPage));

  // Ensure currentPage is valid when filters change
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  if (loading) return <div className="p-4">Ładowanie produktów...</div>;

  const openDelete = (product) => { setDeleteTarget(product); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${BASE || ''}/api/products/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ productId: deleteTarget.id })
      });
      const text = await res.text().catch(() => '');
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || text || res.statusText || 'Błąd serwera';
        console.error('[ProductView] delete failed', msg);
        showToast && showToast(`Usuwanie nie powiodło się: ${msg}`, { type: 'error', timeout: 6000 });
        setShowDeleteModal(false);
        setDeleteTarget(null);
        setDeleteLoading(false);
        return;
      }
      showToast && showToast('Produkt usunięto pomyślnie', { type: 'success' });
      // Refresh products list after deletion
      try {
        const resp = await getProductsDb();
        setRawProducts((resp && resp.products) || []);
      } catch (err) {
        console.warn('[ProductView] refresh after delete failed', err);
      }
    } catch (err) {
      console.error('[ProductView] confirmDelete error', err);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-[#2a3b6e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z"/></svg>
          <h2 className="text-2xl font-bold text-[#2a3b6e]">Produkty</h2>
        </div>
        <p className="text-sm text-gray-600 mt-2">Przegląd wszystkich produktów w bazie.</p>
      </div>

      {/* Availability select next to filters on larger screens (kept local to this view) */}
      <div className="mb-4 w-full">
        <div className="flex flex-col md:flex-row md:items-start md:gap-4">
          <div className="mb-3 md:mb-0 md:flex-shrink-0 md:mr-2 md:w-auto">
            <select value={availability} onChange={(e) => { setAvailability(e.target.value); setCurrentPage(1); }} className="w-full md:w-48 px-2 py-1.5 rounded-lg border shadow text-[#2a3b6e] text-sm">
              <option value="all">Dostępność (wszystkie)</option>
              <option value="available">Dostępne</option>
              <option value="unavailable">Niedostępne</option>
            </select>
          </div>

          <div className="flex-1">
            <ProductFilterBar
              search={search}
              setSearch={(v) => { setSearch(v); setCurrentPage(1); }}
              filterType={filterType}
              setFilterType={(v) => { setFilterType(v); setCurrentPage(1); }}
              filterWarehouse={null}
              setFilterWarehouse={() => {}}
              types={types}
              warehouses={[]}
              showWarehouse={false}
            />
          </div>
        </div>
      </div>

      <ProductOptionsBar
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOptions={[{ value: 'type', label: 'Typ' }, { value: 'name', label: 'Nazwa' }, { value: 'size', label: 'Rozmiar' }]}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Add / Import buttons above pagination */}
      <div className="mt-3 mb-3">
        <div className="flex flex-wrap gap-2">
          <AppButton icon={<AddIcon fontSize="small" />} variant="primary" onClick={() => {
            try {
              localStorage.removeItem('pendingEditId');
              localStorage.removeItem('pendingEditItem');
              localStorage.setItem('pendingOpenAdd', '1');
            } catch (e) {}
            setView('edit');
          }}>Dodaj produkt</AppButton>

          <AppButton icon={<UploadFileIcon fontSize="small" />} variant="primary" onClick={() => setView('import')}>Importuj z pliku</AppButton>
        </div>
      </div>

      {/* Top pagination + found-count */}
      <div className="mt-2 mb-3 flex items-center justify-between">
        <div className="text-xs text-gray-500">Znaleziono {filtered.length} produktów.</div>
        <div className="flex-shrink-0">
          <Pagination totalPages={totalPages} currentPage={currentPage} onChangePage={(n) => { setCurrentPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="bg-white rounded shadow p-4">
          <ItemGrid products={paginated} viewMode={viewMode} mode={null} onDelete={openDelete} />
        </div>
      ) : (
        <div className="space-y-3">
          <ItemGrid products={paginated} viewMode={viewMode} mode={null} onDelete={openDelete} />
        </div>
      )}

      {/* Bottom pagination */}
      <div className="mt-4 mb-6 flex items-center justify-center">
        <Pagination totalPages={totalPages} currentPage={currentPage} onChangePage={(n) => { setCurrentPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-[#e5e7eb] bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 min-w-[320px] flex flex-col items-center border border-[#d1d5db]" style={{maxWidth: 420}}>
            <h2 className="text-lg font-bold mb-2 text-[#2a3b6e]">Potwierdź usunięcie</h2>
            <div className="mb-4 text-[#2a3b6e] font-semibold text-center">
              {(() => {
                const label = deleteTarget ? `${deleteTarget.name || deleteTarget.Nazwa || ''} ${deleteTarget.size || deleteTarget.Rozmiar || ''}`.trim() : '';
                return `Czy na pewno usunąć produkt ${label} i wszystkie jego stany magazynowe?`;
              })()}
            </div>
            <div className="flex gap-2 mt-2">
              <button className="bg-[#2a3b6e] text-white px-4 py-1 rounded-xl shadow font-semibold hover:bg-[#1d294f] transition" onClick={confirmDelete} disabled={deleteLoading}>Potwierdź</button>
              <button className="bg-[#e5e7eb] text-[#2a3b6e] px-4 py-1 rounded-xl shadow font-semibold border border-[#d1d5db] hover:bg-[#d1d5db] transition" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} disabled={deleteLoading}>Anuluj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
