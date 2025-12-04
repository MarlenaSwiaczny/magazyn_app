import React, { useState, useEffect, useCallback } from "react";
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
  const [view, setView] = useState("actionView"); // default to action view
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
  const handleSetView = (v) => {
    // clear temporary warehouse selection so child views start fresh
    if (tempWarehouse) setTempWarehouse(null);
    setView(v);
    // ensure products list is refreshed to default/current warehouse
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
          {view === "profile" && user && (
            <ProfileView
              user={user}
              onUpdate={updatedUser => setUser(updatedUser)}
              onChangePassword={() => alert("Zmiana hasła - do zaimplementowania")}
            />
          )}
          {view === "archive" && userId && (
            <ArchiveView user={user} userId={userId} />
          )}
          {view === "warehouses" && (
            <WarehouseView onBack={() => handleSetView('productView')} onSelectWarehouse={handleSelectWarehouse} />
          )}
          {view === "login" && null}

          {view === "edit" && user && (user.role === "admin" || user.role === "editor") && (
            <EditView
              products={products}
              onBack={() => handleSetView("productView")}
              onRefresh={refreshProducts}
              pendingEditId={pendingEditId}
              pendingEditItem={pendingEditItem}
              clearPendingEdit={() => { setPendingEditId(null); setPendingEditItem(null); }}
              userId={userId}
              user={user}
              onImportExcel={() => setView("import")}
            />
          )}

          {view === "import" && (
            <ImportExcelView
              onBack={() => handleSetView("productNew")}
              onRefresh={refreshProducts}
            />
          )}

          {/* Clear temporary selection whenever we're not in the former use view; keep behavior */}
          {tempWarehouse && (setTempWarehouse(null))}

          {/* modern view removed: the import and rendering were deleted to fix build */}

          {view === "actionView" && (
            <ActionView
              onBack={() => handleSetView('productView')}
              user={user}
              setView={handleSetView}
              initialFilterWarehouse={pendingSearchWarehouse}
            />
          )}

          {view === 'productView' && (
            <ProductView user={user} setView={handleSetView} />
          )}
          {view === 'productNew' && (
            <ProductNewView
              user={user}
              setView={handleSetView}
              pendingEditId={pendingEditId}
              pendingEditItem={pendingEditItem}
              clearPendingEdit={() => { setPendingEditId(null); setPendingEditItem(null); }}
            />
          )}
          {view === 'typesView' && (
            <TypesView setView={handleSetView} />
          )}

          {view === "adminPanel" && user && user.role === "admin" && (
            <AdminPanel currentUser={user} />
          )}
          {view === "userActions" && user && (user.role === "admin" || user.role === "editor") && (
            <UserActionsView />
          )}
        </div>
        <Toast />
      </div>
    </ToastProvider>
  );
}
