import React from 'react';
import TabsPills from './TabsPills';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import MoveDownIcon from '@mui/icons-material/MoveDown';
import CategoryIcon from '@mui/icons-material/Category';

// HeaderSection: thin wrapper around TabsPills for top-level section switching
// Props:
// - activeKey: 'warehouses' | 'products'
// - onChange(key)
export default function HeaderSection({ activeKey = 'products', onChange = () => {}, className = '' }) {
  const tabs = [
    { key: 'warehouses', label: 'Magazyny', icon: <WarehouseIcon fontSize="small" /> },
    { key: 'actions', label: 'Akcje', icon: <MoveDownIcon fontSize="small" /> },
    { key: 'products', label: 'Produkty', icon: <CategoryIcon fontSize="small" /> },
  ];

  return (
    <div className={`mb-4 ${className}`}>
      <TabsPills tabs={tabs} activeKey={activeKey} onChange={onChange} />
    </div>
  );
}
