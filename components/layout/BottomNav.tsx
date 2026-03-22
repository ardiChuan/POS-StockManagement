"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DeviceRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: DeviceRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "⬛", roles: ["owner", "admin"] },
  { href: "/pos", label: "POS", icon: "🛒", roles: ["owner", "admin", "cashier"] },
  { href: "/fish", label: "Fish", icon: "🐟", roles: ["owner", "admin", "cashier"] },
  { href: "/products", label: "Products", icon: "📦", roles: ["owner", "admin", "cashier"] },
  { href: "/stock", label: "Stock", icon: "📋", roles: ["owner", "admin"] },
  { href: "/expenses", label: "Expenses", icon: "💸", roles: ["owner", "admin", "cashier"] },
  { href: "/eod", label: "Cash EOD", icon: "💰", roles: ["owner", "admin", "cashier"] },
  { href: "/reports", label: "Reports", icon: "📊", roles: ["owner", "admin"] },
  { href: "/admin", label: "Admin", icon: "⚙️", roles: ["owner", "admin"] },
];

export function BottomNav({ role }: { role: DeviceRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t safe-area-inset-bottom">
      <div className="flex overflow-x-auto scrollbar-hide">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] py-2 px-1 text-xs gap-0.5 flex-shrink-0",
                active ? "text-zinc-900 font-semibold" : "text-zinc-400"
              )}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
