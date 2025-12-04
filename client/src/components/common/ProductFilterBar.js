import React from "react";

export default function ProductFilterBar({
  search,
  setSearch,
  filterType,
  setFilterType,
  filterWarehouse,
  setFilterWarehouse,
  types,
  warehouses,
  showWarehouse = true,
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4 w-full">
      {showWarehouse && (
        <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)} className="w-full md:flex-1 px-3 py-2 rounded-lg border shadow text-[#2a3b6e] font-semibold">
          <option value="">Magazyn (wszystkie)</option>
          {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      )}
      <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full md:flex-1 px-2 py-1.5 rounded-lg border shadow text-[#2a3b6e] text-sm">
        <option value="">Typ (wszystkie)</option>
        {types.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <input
        type="text"
        placeholder="Szukaj po nazwie lub rozmiarze..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="px-2 py-1.5 rounded-lg border shadow flex-1 md:flex-[2] text-[#2a3b6e] text-sm min-w-[120px]"
      />
    </div>
  );
}
