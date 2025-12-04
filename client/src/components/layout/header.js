import React from "react";
import UserProfileMenu from "./userProfileMenu";

export default function Header({ view, setView, user, onLogout, selectedWarehouseName, onOpenSearchWithWarehouse }) {
  return (
    <div className="bg-gradient-to-r from-[#2a3b6e] to-[#e5e7eb] shadow flex items-center justify-between px-4 md:px-8 py-5 mb-6 rounded-b-xl relative">
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-4 cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label="Otwórz panel akcji"
          onClick={() => { setView('actionView'); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setView('actionView'); }}
        >
          <div className="bg-white rounded-full flex items-center justify-center w-13 h-13">
            <img src="/MagazynLogo.png" alt="Magazyn App" className="w-10 h-10" />
          </div>
          <span className="inline text-l md:text-2xl font-bold text-white tracking-wide">Magazyn app</span>
        </div>
</div>
      <div>
      {/* Prawa sekcja: awatar użytkownika */}
          <div className="flex items-center ml-2 md:ml-6 gap-3">
        <UserProfileMenu user={user} onSelect={key => {
          if (key === 'profile') setView('profile');
          if (key === 'archive') setView('archive');
          if (key === 'adminPanel') setView('adminPanel');
          if (key === 'userActions') setView('userActions');
          if (key === 'warehouses') setView('warehouses');
          if (key === 'types') setView('typesView');
          if (key === 'products') setView('productNew');
          if (key === 'edit') setView('edit');
          if (key === 'logout') onLogout();
        }} />
      </div>
    </div>
    </div>
  );
}