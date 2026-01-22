import React from 'react';
import UnarchiveIcon from '@mui/icons-material/Unarchive';

export default function HistoryRow({
  date,
  userName,
  action,
  warehouse,
  quantity,
  note,
  showRestore,
  onRestore,
  canRestore,
}) {
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '160px 1fr 64px',
    gap: '8px',
    alignItems: 'start',
  };

  return (
    <div className="py-2">
      <div style={rowStyle} className="text-gray-800">
        <div className="text-xs text-gray-500">
          {date ? new Date(date).toLocaleString() : ''}
          <br />
          <span className="truncate" title={userName || ''}>{userName || ''}</span>
        </div>

        <div className="text-sm">
          <div className="font-medium">{action}</div>
          <div className="text-sm text-gray-700 truncate">{warehouse || '—'}</div>
        </div>

        <div className="text-sm font-semibold text-right">{quantity}</div>
      </div>

      {note && (
        <div style={{ gridColumn: '2 / span 2' }} className="text-sm text-gray-700 mt-1 text-left whitespace-pre-wrap">{note}</div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div style={{ flex: 1 }} />
        <div className="w-full" style={{ maxWidth: 280 }}>
          <div className="flex justify-end items-center gap-2">
            {showRestore && onRestore ? (
              <button
                className={`inline-flex items-center gap-2 text-sm px-3 py-1 rounded-md ${canRestore ? 'bg-[#2a3b6e] text-white' : 'bg-gray-200 text-gray-600'}`}
                onClick={onRestore}
                disabled={!canRestore}
                title={canRestore ? 'Przywróć' : 'Nie można przywrócić'}
              >
                <UnarchiveIcon fontSize="small" />
                Przywróć
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t mt-2 pt-2" />
    </div>
  );
}
