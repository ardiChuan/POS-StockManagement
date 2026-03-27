import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get("pos_jwt")?.value;
  if (!jwt) redirect("/setup");

  // Decode JWT payload (Railway verifies the signature on every API call)
  let role = "cashier";
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1], "base64url").toString()
    );
    role = payload.role ?? "cashier";
  } catch {
    redirect("/setup");
  }

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <OfflineBanner />
      <main className="flex-1">{children}</main>
      <BottomNav role={role} />
    </div>
  );
}
