"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DeviceRole } from "@/types";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  Banknote,
  BarChart2,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: DeviceRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "admin"] },
  { href: "/pos", label: "POS", icon: ShoppingCart, roles: ["owner", "admin", "cashier"] },
  { href: "/products", label: "Stocks", icon: Package, roles: ["owner", "admin", "cashier"] },
  { href: "/expenses", label: "Expenses", icon: Wallet, roles: ["owner", "admin", "cashier"] },
  { href: "/eod", label: "Cash EOD", icon: Banknote, roles: ["owner", "admin", "cashier"] },
  { href: "/reports", label: "Reports", icon: BarChart2, roles: ["owner", "admin"] },
];

export function BottomNav({ role }: { role: DeviceRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-1px_4px_rgba(0,0,0,0.08)] safe-area-inset-bottom">
      <div className="flex overflow-x-auto scrollbar-hide">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] py-2 px-1 text-xs gap-1 flex-shrink-0 relative",
                active ? "text-red-700" : "text-zinc-400"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-red-700 rounded-full" />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="leading-none font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
