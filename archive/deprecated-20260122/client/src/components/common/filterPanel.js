
import SearchInput from "./searchInput";
import TypeSelector from "./typeSelector";
import WarehouseSelector from "./locationSelector";

export default function FilterPanel({
  search,
  setSearch,
  types,
  selectedType,
  setSelectedType,
  warehouses,
  selectedWarehouse,
  setSelectedWarehouse,
  categories = [],
  selectedCategory,
  setSelectedCategory,
  activeTab,
  setActiveTab,
  resetFilters
}) {
  return (
    <div className="flex flex-col gap-4 flex-wrap mb-4">
      {/* Tabs (opcjonalnie) */}
      {activeTab && setActiveTab && (
        <div className="flex gap-2 mb-2">
          <button
            className={`px-3 py-1 rounded ${activeTab === "search" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => { setActiveTab("search"); resetFilters?.(); }}
          >Szukaj</button>
          <button
            className={`px-3 py-1 rounded ${activeTab === "categories" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => { setActiveTab("categories"); resetFilters?.(); }}
          >Kategorie</button>
        </div>
      )}

      {/* Search panel */}
      {(!activeTab || activeTab === "search") && (
        <SearchInput value={search} onChange={setSearch} />
      )}

      {/* Category panel */}
      {activeTab === "categories" && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {categories.map(cat => (
            <button
              key={cat}
              className={`px-3 py-1 rounded ${selectedCategory === cat ? "bg-green-500 text-white" : "bg-gray-200"}`}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >{cat}</button>
          ))}
        </div>
      )}

      {/* Pozostałe filtry */}
      <div className="flex gap-4 flex-wrap">
        {types && (
          <TypeSelector
            types={types}
            selectedType={selectedType}
            onSelectType={setSelectedType}
          />
        )}
        {warehouses && (
          <WarehouseSelector
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouse}
            onSelectWarehouse={setSelectedWarehouse}
          />
        )}
      </div>
    </div>
  );
}