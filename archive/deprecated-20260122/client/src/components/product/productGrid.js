import React, { useState, useEffect, useRef } from "react";
import ProductCard from "./productCard";
import styles from './product-grid.module.css';

export default function ProductGrid({
  products,
  mode,
  viewMode = 'grid',
  onEdit,
  onDelete,
  onUse,
  selectedIds = [],
  onSelectCheckbox,
  onTypeClick,
  onWarehouseClick,
  transferWarehouse, // <-- added to props
  massQuantities,
  onMassQuantityChange,
  onSingleTransfer, // <-- ADD THIS PROP
  warehouses, // <-- DODANE! lista magazynów
}) {
  const [expandedCardId, setExpandedCardId] = useState(null);
  const gridRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (gridRef.current && !gridRef.current.contains(e.target)) {
        setExpandedCardId(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (!products || products.length === 0) {
    return <p className="text-gray-500">Brak produktów do wyświetlenia</p>;
  }

  return (
    <div
      ref={gridRef}
      className={viewMode === 'grid' ? styles.gridRoot : styles.listRoot}
    >
      {products.map((p, idx) => {
        // include a short image/version fingerprint in the key so React will
        // remount the card when the image (or updatedAt) changes. This forces
        // the component to refresh its internal image state immediately after edits
        // instead of waiting for navigation or a full reload.
        const imageEphemeral = (p.imageThumb || p.imageUrl || p.updatedAt || '')
          .toString()
          .replace(/\s+/g, '-')
          .slice(0, 64);
        const stockKey = `${p.id}-${p.warehouseId ?? idx}-${imageEphemeral}`;
        return (
          <ProductCard
            key={stockKey}
            product={p}
            mode={mode}
            viewMode={viewMode}
            onEdit={onEdit}
            onDelete={onDelete}
            onUse={onUse}
            checked={selectedIds?.includes(stockKey)}
            onSelectCheckbox={onSelectCheckbox}
            onTypeClick={onTypeClick}
            onWarehouseClick={onWarehouseClick}
            isExpanded={expandedCardId === stockKey}
            onToggle={() => setExpandedCardId(expandedCardId === stockKey ? null : stockKey)}
            userId={p.userId}
            transferWarehouse={mode === 'transfer' ? (typeof transferWarehouse !== 'undefined' ? transferWarehouse : null) : null}
            warehouses={warehouses} // <-- DODANE! przekazujemy listę magazynów do ProductCard
            massQuantity={massQuantities?.[stockKey] || 1}
            onMassQuantityChange={onMassQuantityChange}
            availableQty={p.availableQty}
            onSingleTransfer={onSingleTransfer} // <-- PASS PROP
          />
        );
      })}
    </div>
  );
}