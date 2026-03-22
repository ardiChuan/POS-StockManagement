import { redirect } from "next/navigation";
import { getDeviceFromCookies } from "@/lib/auth";
import { ProductForm } from "@/components/products/ProductForm";

export default async function NewProductPage() {
  const device = await getDeviceFromCookies();
  if (!device || device.role === "cashier") redirect("/products");
  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="font-bold text-xl mb-4">Add Product</h1>
      <ProductForm />
    </div>
  );
}
