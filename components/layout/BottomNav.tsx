"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/products", label: "Stocks", icon: Package },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/eod", label: "Cash EOD", icon: Banknote },
  { href: "/reports", label: "Reports", icon: BarChart2 },
];

export function BottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-inset-bottom">
      <div className="flex overflow-x-auto scrollbar-hide px-1 py-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-w-[50px] py-1.5 px-1 text-[10px] gap-0.5 rounded-xl transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
