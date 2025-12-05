import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import EditView from "./views/editView";
import { ToastProvider } from './common/ToastContext';
import Toast from './common/Toast';
import ImportExcelView from "./views/Import/importExcelView";
import Header from "./layout/header";
import ProfileView from "./views/profileView";
import ArchiveView from "./views/archiveView";
import AdminPanel from "./admin/AdminPanel";
import UserActionsView from "./views/userActionsView";
import ActionView from "./views/actionView";
import ProductView from "./views/productView";
import ProductNewView from "./views/productNew";
import TypesView from "./views/typesView";
import { BASE, getAuthHeaders, getWarehouses, getProductsDb } from "../services/api";
import WarehouseView from "./views/warehouseView";

export default function MainApp({ userId: propUserId = null, onLogout } = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setViewState] = useState("actionView"); // internal view state (kept for compatibility)
  const [warehouses, setWarehouses] = useState([]);
  const [currentWarehouseId, setCurrentWarehouseId] = useState(null);
  const [tempWarehouse, setTempWarehouse] = useState(null); // temporary selection from WarehouseView
  const [products, setProducts] = useState([]);
  const [selectedWarehouseName, setSelectedWarehouseName] = useState(null);
  const [pendingSearchWarehouse, setPendingSearchWarehouse] = useState(null);
  const [pendingEditId, setPendingEditId] = useState(null);
  const [pendingEditItem, setPendingEditItem] = useState(null);
  // userId z sesji/localStorage - prefer prop if provided
  const [userId, setUserId] = useState(() => propUserId || localStorage.getItem("userId") || null);
  const [user, setUser] = useState(null);

  const handleSelectWarehouse = (warehouse) => {
    // temporary selection: remember the warehouse and open actionView prefiltered with it
    setTempWarehouse(warehouse);
    setSelectedWarehouseName(warehouse?.name ?? null);
    if (typeof openSearchWithWarehouse === 'function') openSearchWithWarehouse(warehouse?.name ?? null);
  };

  // Wrapper for changing view: clear temp selections and refresh full product list
  const viewToPath = (v) => {
    switch (v) {
      case 'actionView': return '/app/action';
      case 'productView': return '/app/products';
      case 'productNew': return '/app/products/new';
      case 'edit': return '/app/edit';
      case 'import': return '/app/import';
      case 'profile': return '/app/profile';
      case 'archive': return '/app/archive';
      case 'warehouses': return '/app/warehouses';
      case 'typesView': return '/app/types';
      case 'adminPanel': return '/app/admin';
      case 'userActions': return '/app/user-actions';
      default: return '/app/products';
    }
  };

  const pathToView = (path) => {
    if (!path) return 'actionView';
    if (path.startsWith('/app/action')) return 'actionView';
    if (path.startsWith('/app/products')) return 'productView';
    if (path.startsWith('/app/import')) return 'import';
    if (path.startsWith('/app/profile')) return 'profile';
    if (path.startsWith('/app/archive')) return 'archive';
    if (path.startsWith('/app/warehouses')) return 'warehouses';
    if (path.startsWith('/app/types')) return 'typesView';
    if (path.startsWith('/app/admin')) return 'adminPanel';
    if (path.startsWith('/app/user-actions')) return 'userActions';
    if (path.startsWith('/app/edit')) return 'edit';
    return 'productView';
  };

  const handleSetView = (v) => {
    if (tempWarehouse) setTempWarehouse(null);
    setViewState(v);
    const p = viewToPath(v);
    try { navigate(p); } catch (e) {}
    refreshProducts();
  };

  // Open actionView with a preselected warehouse name
  const openSearchWithWarehouse = (warehouseName) => {
    setPendingSearchWarehouse(warehouseName || null);
    // set view directly so handleSetView doesn't clear the pending value
    setView('actionView');
  };

  // Fetch user data after login or profile update
  // keep internal userId in sync when parent prop changes
  useEffect(() => {
    if (propUserId && propUserId !== userId) {
      setUserId(propUserId);
    }
  }, [propUserId, userId]);

  useEffect(() => {
    if (userId) {
      // user id present
      // attach Authorization header so server can validate JWT; server now requires token for get-user
      const authHeaders = getAuthHeaders();
      fetch(`${BASE}/api/auth/get-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ id: userId })
      })
        .then(res => res.json())
        .then(data => {
          // handle invalid/expired session gracefully
          if (data && data.success) {
            setUser(data.user);
          } else {
            console.warn('[MainApp] invalid user session, clearing local state');
            try { localStorage.removeItem('userId'); } catch (e) {}
            setUser(null);
            setUserId(null);
            if (typeof onLogout === 'function') onLogout();
          }
        })
        .catch(err => {
          console.error('[MainApp] get-user fetch error', err);
          // don't block UI; clear user to force login flow if needed
          setUser(null);
        });
    } else {
        setUser(null);
      }
  }, [userId, onLogout]);

  const refreshProducts = useCallback(async () => {
    // Pobierz wszystkie produkty niezależnie od widoku (use service API so auth headers are included)
    try {
      const data = await getProductsDb(currentWarehouseId);
      setProducts(data.products || []);
    } catch (err) {
      console.error('[MainApp] refreshProducts error', err);
      setProducts([]);
    }
  }, [currentWarehouseId]);

  useEffect(() => {
    refreshProducts();
  }, [view, refreshProducts]);

  // sync view with URL on location change
  useEffect(() => {
    const current = pathToView(location.pathname);
    if (current !== view) setViewState(current);
  }, [location.pathname]);

  // Listen for global edit requests coming from nested components (e.g., ProductDetailsModal)
  // Global requests now open the new product edit view (`productNew`) so editing flows land there.
  useEffect(() => {
    const handler = (e) => {
      const pid = e?.detail?.productId ?? null;
      const listItem = e?.detail?.listItem ?? null;
      const stockRows = e?.detail?.stockRows ?? null;
      if (listItem) {
        // store the whole listItem payload and open the productNew edit view
        setPendingEditItem({ product: listItem, stockRows });
        setPendingEditId(listItem?.id ?? pid ?? null);
        setView('productNew');
        return;
      }
      if (pid) {
        setPendingEditId(pid);
        setView('productNew');
      }
    };
    const navHandler = (e) => {
      const v = e?.detail?.view;
      if (v === 'edit') {
        // if pendingEditId or pendingEditItem in localStorage, pick them up
        try {
          const stored = localStorage.getItem('pendingEditId');
          if (stored) setPendingEditId(stored);
          const storedItem = localStorage.getItem('pendingEditItem');
          if (storedItem) {
            try { setPendingEditItem(JSON.parse(storedItem)); } catch (_) { /* ignore */ }
          }
        } catch (err) {}
        // Preserve legacy behavior: when explicit navigation to 'edit' occurs,
        // open the legacy EditView. Direct edit requests coming from components
        // that dispatch `open-edit-view` will still open `productNew` (handler above).
        setView('edit');
      }
    };
    window.addEventListener('open-edit-view', handler);
    window.addEventListener('navigate', navHandler);
    return () => {
      window.removeEventListener('open-edit-view', handler);
      window.removeEventListener('navigate', navHandler);
    };
  }, []);

  // Fetch warehouses once
  useEffect(() => {
    getWarehouses()
      .then(d => setWarehouses(d))
      .catch(() => { /* intentionally ignore fetch errors here */ });
  }, []);

  // Periodic server-health check: if server becomes unreachable, treat as logout
  useEffect(() => {
    let stopped = false;
    const checkServer = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${BASE}/api/warehouses`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('Server returned non-OK');
        // server reachable
      } catch (err) {
        if (stopped) return;
        console.warn('[MainApp] server unreachable, forcing logout', err);
        try { localStorage.removeItem('userId'); localStorage.removeItem('token'); } catch (e) {}
        setUserId(null);
        setUser(null);
        if (typeof onLogout === 'function') {
          try { onLogout(); } catch (e) { console.warn('[MainApp] onLogout handler threw', e); }
        }
      }
    };

    // initial check + interval
    checkServer();
    const iv = setInterval(checkServer, 15000);
    return () => { stopped = true; clearInterval(iv); };
  }, [onLogout]);

  // If user has an assigned warehouse, set it as current once warehouses are loaded
  useEffect(() => {
    if (user && user.userWarehouse && warehouses && warehouses.length && !currentWarehouseId) {
      const found = warehouses.find(w => w.name === user.userWarehouse);
      if (found) {
        setCurrentWarehouseId(found.id);
        setSelectedWarehouseName(found.name);
      }
    }
  }, [user, warehouses, currentWarehouseId]);

  // Logout logic
  const handleLogout = () => {
    try { localStorage.removeItem("userId"); localStorage.removeItem("token"); } catch (e) {}
    setUserId(null);
    setUser(null);
    // notify parent app if provided so it can switch to login view without hard reload
    if (typeof onLogout === 'function') {
      try { onLogout(); } catch (e) { console.warn('[MainApp] onLogout handler threw', e); }
    } else {
      // fallback: navigate to product view and let login form elsewhere handle access
      setView('productView');
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f5f6fa]">
        {/* Wrap app in ToastProvider so all views can use global toasts */}
        {/* ToastProvider imported lazily to avoid circular imports */}
  <Header view={view} setView={handleSetView} user={user} onLogout={handleLogout} selectedWarehouseName={selectedWarehouseName} onOpenSearchWithWarehouse={openSearchWithWarehouse} />
        <div className="p-4">
          <Routes>
            <Route path="/app/profile" element={user ? <ProfileView user={user} onUpdate={updatedUser => setUser(updatedUser)} onChangePassword={() => alert('Zmiana hasła - do zaimplementowania')} /> : null} />
            <Route path="/app/archive" element={userId ? <ArchiveView user={user} userId={userId} /> : null} />
            <Route path="/app/warehouses" element={<WarehouseView onBack={() => handleSetView('productView')} onSelectWarehouse={handleSelectWarehouse} />} />
            <Route path="/app/edit" element={(user && (user.role === 'admin' || user.role === 'editor')) ? <EditView products={products} onBack={() => handleSetView('productView')} onRefresh={refreshProducts} pendingEditId={pendingEditId} pendingEditItem={pendingEditItem} clearPendingEdit={() => { setPendingEditId(null); setPendingEditItem(null); }} userId={userId} user={user} onImportExcel={() => handleSetView('import')} /> : null} />
            <Route path="/app/import" element={<ImportExcelView onBack={() => handleSetView('productNew')} onRefresh={refreshProducts} />} />
            <Route path="/app/action" element={<ActionView onBack={() => handleSetView('productView')} user={user} setView={handleSetView} initialFilterWarehouse={pendingSearchWarehouse} />} />
            <Route path="/app/products/new" element={<ProductNewView user={user} setView={handleSetView} pendingEditId={pendingEditId} pendingEditItem={pendingEditItem} clearPendingEdit={() => { setPendingEditId(null); setPendingEditItem(null); }} />} />
            <Route path="/app/products/*" element={<ProductView user={user} setView={handleSetView} />} />
            <Route path="/app/types" element={<TypesView setView={handleSetView} />} />
            <Route path="/app/admin" element={user && user.role === 'admin' ? <AdminPanel currentUser={user} /> : null} />
            <Route path="/app/user-actions" element={user && (user.role === 'admin' || user.role === 'editor') ? <UserActionsView /> : null} />
            <Route path="/app" element={<ActionView onBack={() => handleSetView('productView')} user={user} setView={handleSetView} initialFilterWarehouse={pendingSearchWarehouse} />} />
          </Routes>
          {/* Clear temporary selection whenever we're not in the former use view; keep behavior */}
          {tempWarehouse && (setTempWarehouse(null))}
        </div>
        <Toast />
      </div>
    </ToastProvider>
  );
}
