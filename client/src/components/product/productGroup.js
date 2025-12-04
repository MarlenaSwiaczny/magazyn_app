import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProductVariant from "./productVariant";

export default function ProductGroup({ name, variants, onAddToCart }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-xl shadow-md bg-white">
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-100 rounded-t-xl"
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-lg font-bold">{name}</h3>
        <span className="text-gray-600">{open ? "▲" : "▼"}</span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 pb-4 space-y-3"
          >
            {variants.map((variant) => (
              <ProductVariant
                key={variant.ID}
                variant={variant}
                onAddToCart={onAddToCart}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}