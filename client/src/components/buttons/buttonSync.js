import React from "react";

function ButtonSync({ onSync, disabled }) {
  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`px-4 py-2 rounded text-white ${
        disabled ? "bg-gray-400 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-600"
      }`}
    >
      {disabled ? "Synchronizuję..." : "Synchronizuj z arkuszem"}
    </button>
  );
}
export default ButtonSync;