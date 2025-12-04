import React from 'react';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';

export default function EditActionButton({ onClick = () => {}, label = 'Edytuj', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ui-action-icon p-2 rounded shadow text-xs font-semibold hover:bg-[#1d294f] transition flex items-center justify-center w-6 h-6 md:w-auto md:h-auto md:px-3 md:py-1 md:rounded-xl bg-[#2a3b6e] text-white ${className}`}
    >
      <EditNoteOutlinedIcon fontSize="small" />
      <span className="hidden md:inline ml-2">{label}</span>
    </button>
  );
}
