import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { BASE, getAuthHeaders } from './services/api';
import LoginForm from "./components/forms/loginForm";
import RegisterForm from "./components/forms/registerForm";
import MainApp from "./components/mainApp";
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  // On startup we DO NOT trust localStorage blindly
  const [userId, setUserId] = useState(null);
  const [view, setView] = useState("login");
  const [restoring, setRestoring] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // ---- Restore session from storage safely ----
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (!storedId) {
      setRestoring(false);
      return;
    }

    let cancelled = false;

    async function restoreSession() {
      try {
        const headers = {
          "Content-Type": "application/json",
          ...getAuthHeaders(),   // may be invalid if cache is old → safe try/catch below
        };

        const res = await fetch(`${BASE}/api/auth/get-user`, {
          method: "POST",
          headers,
          body: JSON.stringify({ id: storedId })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (cancelled) return;

        if (data?.success) {
          setUserId(storedId);
          setView("main");
        } else {
          clearSession();
        }
      } catch (err) {
        if (cancelled) return;

        console.warn("[restoreSession] error:", err);
        setSessionError(err.message || "Nieznany błąd sesji");
        clearSession(false); // clear storage but keep showing login later
      } finally {
        if (!cancelled) setRestoring(false);
      }
    }

    restoreSession();

    return () => { cancelled = true; };
  }, []);

  // ---- Fallback 2: safety timeout (in case fetch never resolves) ----
  useEffect(() => {
    const t = setTimeout(() => setRestoring(false), 2500);
    return () => clearTimeout(t);
  }, []);

  function clearSession(switchToLogin = true) {
    try {
      localStorage.removeItem("userId");
      localStorage.removeItem("token");
    } catch (e) {}

    setUserId(null);
    if (switchToLogin) setView("login");
  }

  // ---- Login / Logout handlers ----
  const handleLogin = (id) => {
    try {
      localStorage.setItem("userId", id);
    } catch (e) {}
    setUserId(id);
    setView("main");
    // navigate to main products view
    try { navigate('/app/products', { replace: true }); } catch (e) {}
  };

  const handleLogout = () => {
    clearSession(true);
  };

  // ---- Render (route-based) ----
  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin border-4 border-t-transparent border-gray-300 rounded-full w-12 h-12 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-[#2a3b6e] mb-2">Przywracanie sesji...</div>
          <div className="text-sm text-gray-600 mb-4">Sprawdzam zapisane logowanie…</div>

          {sessionError && (
            <div className="text-red-600 text-sm mt-2">
              Błąd sesji: {sessionError}
              <div className="flex gap-3 justify-center mt-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 bg-[#2a3b6e] text-white rounded"
                >
                  Spróbuj ponownie
                </button>
                <button
                  onClick={() => clearSession(true)}
                  className="px-3 py-1 border rounded"
                >
                  Wyczyść dane
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginForm onLogin={handleLogin} onSwitchToRegister={() => { navigate('/register'); }} />} />
      <Route path="/register" element={<RegisterForm onRegister={handleLogin} onSwitchToLogin={() => { navigate('/login'); }} />} />

      <Route path="/app/*" element={userId ? <ErrorBoundary><MainApp userId={userId} onLogout={handleLogout} /></ErrorBoundary> : <Navigate to="/login" replace />} />

      <Route path="/" element={userId ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
