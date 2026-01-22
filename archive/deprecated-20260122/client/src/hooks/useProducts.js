import { useState, useEffect } from "react";
import googleSheetsService from "../services/googleSheetsService";

export default function useProducts() {
  const [products, setProducts] = useState([]);
  const [searchName, setSearchName] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await googleSheetsService.fetchProducts();
      setProducts(data);
    };
    fetchProducts();
  }, []);

  const handleAdd = (newProduct) => {
    // Dodaj produkt do local state i zapisz do Google Sheets
  };

  const handleRemove = (id) => {
    // Usuń produkt z local state i z Google Sheets
  };

  return {
    products,
    searchName,
    setSearchName,
    handleAdd,
    handleRemove,
  };
}
