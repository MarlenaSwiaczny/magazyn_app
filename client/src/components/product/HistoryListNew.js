import React, { useEffect, useState } from 'react';
import { getProductHistory, getProductLastHistory, getAuthHeaders } from '../../services/api';

export default function HistoryList({ productId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let mounted = true;

    const fetchLatest = async () => {
      // determine whether auth header will be sent

      setLoading(true);
      const maxAttempts = 3;
      let attempt = 0;
      const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          const data = await getProductLastHistory(productId);
          const h = Array.isArray(data.history) ? data.history : [];
          if (!mounted) return;
          if (h.length > 0) {
            setRows(h);
            setExpanded(false);
            break;
          }

          // if no history and no auth header, stop retrying
          try {
            const auth = getAuthHeaders();
            if (!auth.Authorization && attempt < maxAttempts) {
              // eslint-disable-next-line no-await-in-loop
              await sleep(200 * attempt);
              continue;
            }
          } catch (e) {
            // ignore
          }

          setRows([]);
          setExpanded(false);
          break;
        } catch (err) {
          if (attempt < maxAttempts) {
            // eslint-disable-next-line no-await-in-loop
            await sleep(200 * attempt);
            continue;
          }
          // eslint-disable-next-line no-console
          console.warn('[HistoryList] getProductLastHistory failed after attempts', err && err.message ? err.message : err);
          if (!mounted) return;
          setRows([]);
          setExpanded(false);
        }
      }

      if (mounted) setLoading(false);
    };

    fetchLatest();
    return () => { mounted = false; };
  }, [productId]);

  const loadFull = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      // determine whether auth header will be sent for full history

      const data = await getProductHistory(productId);
      const h = Array.isArray(data.history) ? data.history : [];
      setRows(h);
      setExpanded(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[HistoryList] loadFull error', err && err.message ? err.message : err);
    } finally {
      setLoading(false);
    }
  };

  const actionLabel = (r) => {
    if (!r) return '';
    const a = r.action || r.Action || '';
    const qty = typeof r.quantity === 'number' ? r.quantity : (r.quantity ? String(r.quantity) : '');
    const wh = r.warehouseName || (r.warehouse && r.warehouse.name) || r.Warehouse || '';
    return { a, qty, wh };
  };

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '160px 1fr 64px',
    gap: '8px',
    alignItems: 'start',
  };

  return (
    <>
      <div className="mt-4 mb-4">
        {loading && <div className="text-sm text-gray-500">Ładowanie historii...</div>}

        {!loading && rows.length === 0 && (
          <div>
            <div className="text-sm text-gray-500">Brak historii</div>
            <div className="mt-2">
              <button className="text-sm text-indigo-600 hover:underline" onClick={loadFull}>Pokaż historię</button>
            </div>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div>
            {!expanded && (
              <div className="space-y-2">
                {rows.slice(0, 6).map((r, idx) => {
                  const { a, qty, wh } = actionLabel(r);
                  return (
                    <div key={idx} style={rowStyle} className="text-gray-800">
                      <div className="text-xs text-gray-500">{new Date(r.createdAt || r.date || Date.now()).toLocaleString()}<br/>{r.userName || r.user || ''}</div>
                      <div className="text-sm">
                        <div className="font-medium">{a}</div>
                        <div className="text-sm text-gray-700 truncate">{wh}</div>
                      </div>
                      <div className="text-sm font-semibold text-right">{qty}</div>
                      {r.note && (
                        <div style={{ gridColumn: '2 / span 2' }} className="text-sm text-gray-700 mt-1">{r.note}</div>
                      )}
                      <div style={{ gridColumn: '1 / span 3' }} className="border-t mt-2 pt-2" />
                    </div>
                  );
                })}

                <div className="mt-2">
                  <button className="text-sm text-indigo-600 hover:underline" onClick={loadFull}>Pokaż pełną historię</button>
                </div>
              </div>
            )}

            {expanded && (
              <div className="space-y-2">
                {rows.map((r, idx) => {
                  const { a, qty, wh } = actionLabel(r);
                  return (
                    <div key={idx} style={rowStyle} className="text-gray-800">
                      <div className="text-xs text-gray-500">{new Date(r.createdAt || r.date || Date.now()).toLocaleString()}<br/>{r.userName || r.user || ''}</div>
                      <div className="text-sm">
                        <div className="font-medium">{a}</div>
                        <div className="text-sm text-gray-700 truncate">{wh}</div>
                      </div>
                      <div className="text-sm font-semibold text-right">{qty}</div>
                      {r.note && (
                        <div style={{ gridColumn: '2 / span 2' }} className="text-sm text-gray-700 mt-1">{r.note}</div>
                      )}
                      <div style={{ gridColumn: '1 / span 3' }} className="border-t mt-2 pt-2" />
                    </div>
                  );
                })}

                <div className="mt-2 mb-6">
                  <button className="text-sm text-indigo-600 hover:underline" onClick={() => setExpanded(false)}>zamknij historię zmian</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
