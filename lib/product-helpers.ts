import type { ProductVariant } from "@/types";

export function isDefaultVariant(v: Pick<ProductVariant, "size_label">) {
  return v.size_label === "";
}

export function hasRealVariants(p: { variants: Pick<ProductVariant, "size_label">[] }) {
  return p.variants.some((v) => v.size_label !== "");
}
