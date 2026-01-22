import React from 'react';

export default function ProductSearchBar({ filters = {}, onChangeFilters = () => {}, types = [] }) {
  const onChange = (key) => (e) => {
    onChangeFilters({ [key]: e.target.value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <input value={filters.Nazwa || ''} onChange={onChange('Nazwa')} placeholder="Nazwa" className="p-2 border rounded" />
      <input value={filters.Rozmiar || ''} onChange={onChange('Rozmiar')} placeholder="Rozmiar" className="p-2 border rounded" />
      {types && types.length > 0 ? (
        <select value={filters.Typ || ''} onChange={onChange('Typ')} className="p-2 border rounded">
          <option value="">-- Typ --</option>
          {types.map((t, i) => (
            typeof t === 'string' ? <option key={i} value={t}>{t}</option> : <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
      ) : (
        <input value={filters.Typ || ''} onChange={onChange('Typ')} placeholder="Typ" className="p-2 border rounded" />
      )}
    </div>
  );
}
