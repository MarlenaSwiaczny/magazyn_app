// ProductTable component: renders a simple table for product lists.

function ProductTable({ headers, products }) {
  return (
   <table className="min-w-full border border-gray-300 rounded overflow-hidden">
        <thead className="bg-blue-600 text-white">
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
  {products.map((row, index) => (
    <tr
      key={index}
      className={index % 2 === 0 ? "bg-white" : "bg-gray-100"}
    >
      {headers.map((header, i) => (
        <td key={i} className="py-2 px-4 border-b border-gray-200">
          {row[header] || ""}
        </td>
      ))}
    </tr>
  ))}
</tbody>
      </table>
  );
}

export default ProductTable;