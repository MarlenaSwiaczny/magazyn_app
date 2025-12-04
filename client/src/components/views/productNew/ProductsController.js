import { useState, useEffect, useMemo } from 'react';
import { getProductsDb, getWarehouses, getTypes } from '../../../services/api';
import aggregateProducts from '../../common/aggregateProducts';

export default function ProductsController({ children }) {
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ Nazwa: '', Rozmiar: '', Typ: '' });
  const [viewMode, setViewMode] = useState('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [availability, setAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('type');
  const [warehouses, setWarehouses] = useState([]);
  const [types, setTypes] = useState([]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProductsDb();
      setRawProducts(data.products || []);
    } catch (e) {
      console.warn('[ProductsController] fetch failed', e);
      setRawProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Check for a pending filter set by other views (eg. TypesView). If present apply it once and clear.
  useEffect(() => {
    try {
      const pending = localStorage.getItem('pendingFilterType');
      if (pending) {
        setFilters(prev => ({ ...prev, Typ: pending }));
        try { localStorage.removeItem('pendingFilterType'); } catch (_) {}
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // track filter changes silently
  useEffect(() => {}, [filters]);

  useEffect(() => {
    // fetch warehouses and types in parallel
    let mounted = true;
    (async () => {
      try {
        const [ws, ts] = await Promise.all([getWarehouses().catch(() => []), getTypes().catch(() => [])]);
        if (!mounted) return;
        setWarehouses(ws || []);
        // getTypes may return array of objects { id, name } or strings; normalize to array of names (strings)
        if (Array.isArray(ts)) {
          const names = ts.map(t => (typeof t === 'string' ? t : (t && (t.name ?? (t.id ?? String(t)))))).map(String);
          setTypes(names);
        } else {
          setTypes([]);
        }
      } catch (e) {
        console.warn('[ProductsController] fetch meta failed', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const products = useMemo(() => aggregateProducts(rawProducts), [rawProducts]);

  const norm = (s) => (s ?? '').toString().toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '');

  const filtered = useMemo(() => {
    let list = products || [];
    const nameFilter = (filters.Nazwa || '').toString().trim();
    const filterType = (filters.Typ || '').toString().trim();
    const filterSize = (filters.Rozmiar || '').toString().trim();

    // Apply filters as an AND across fields: name (tokens must appear in product name), type (partial), and size.
    // Name: substring match similar to EditView
    if (nameFilter) {
      const q = norm(nameFilter);
      list = list.filter(p => (norm(p.name || p.Nazwa || '')).includes(q));
    }

    // Type: match exactly (normalized) as EditView does
    if (filterType) {
      const qt = norm(filterType);
      list = list.filter(p => norm(p.type ?? '') === qt);
    }

    // Size: match either the explicit size field or the product name (some items store size in name)
    if (filterSize) {
      const qs = norm(filterSize);
      list = list.filter(p => {
        const sizeField = norm(p.size || p.Rozmiar || '');
        const nameField = norm(p.name || p.Nazwa || '');
        return (sizeField && sizeField.includes(qs)) || (nameField && nameField.includes(qs));
      });
    }
    if (availability === 'available') {
      list = list.filter(p => (p.rawRows || []).some(r => Boolean(r.warehouseId || r.warehouse || r.Magazyn)));
    }
    if (availability === 'unavailable') {
      list = list.filter(p => !(p.rawRows || []).some(r => Boolean(r.warehouseId || r.warehouse || r.Magazyn)));
    }
    const isAvailable = (p) => (p.rawRows || []).some(r => Boolean(r.warehouseId || r.warehouse || r.Magazyn));
    list = [...list].sort((a, b) => {
      if (availability === 'all') {
        const avA = isAvailable(a);
        const avB = isAvailable(b);
        if (avA !== avB) return avA ? -1 : 1;
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
  }, [products, filters, availability, sortBy]);

  const totalPages = Math.max(1, Math.ceil((filtered.length || 0) / itemsPerPage));
  const items = filtered.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage);

  const refresh = () => fetchProducts();
  const setFilter = (f) => { setFilters(prev => ({ ...prev, ...f })); setCurrentPage(1); };
  const setPage = (p) => setCurrentPage(p);
  const toggleViewMode = () => setViewMode(v => (v === 'list' ? 'card' : 'list'));
  const setViewModeDirect = (v) => setViewMode(v);

  return children({
    items,
    totalCount: filtered.length || 0,
    totalPages,
    currentPage,
    setPage,
    viewMode,
    toggleViewMode,
    setViewMode: setViewModeDirect,
    sortBy,
    setSortBy,
    availability,
    setAvailability,
    setFilter,
    filters,
    refresh,
    loading
    , warehouses, types
  });
}
