import { redirect } from "next/navigation";
import { getDeviceFromCookies } from "@/lib/auth";
import { supabase } from "@/lib/supabase/server";
import { ProductForm } from "@/components/products/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const device = await getDeviceFromCookies();
  if (!device || device.role === "cashier") redirect("/products");

  const { id } = await params;
  const { data: product } = await supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*)")
    .eq("id", id)
    .single();

  if (!product) redirect("/products");

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="font-bold text-xl mb-4">Edit Product</h1>
      <ProductForm product={product as Parameters<typeof ProductForm>[0]["product"]} />
    </div>
  );
}
