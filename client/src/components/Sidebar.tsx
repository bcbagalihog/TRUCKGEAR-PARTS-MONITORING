import { Link, useLocation } from "wouter";
import logoImg from "@assets/Ben_Anthony_Bagalihog_A_simple,_minimalist_logo_featuring_a_bl_1770796859768.png";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Store,
  LogOut,
  BarChart3,
  Calculator,
  ChevronRight,
  ShieldCheck,
  LayoutGrid, // New icon for the POS Terminal
} from "lucide-react";
import { SiShopify } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Check if the current user is an admin or Ben
  const isAdmin = user?.role === "admin" || user?.username === "TTPS";

  // Grouped Menu Structure - REPLACED Sales & VAT with POS
  const menuGroups = [
    {
      group: "Operations",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/" },
        { icon: Package, label: "Inventory", href: "/products" },
        { icon: Truck, label: "Purchases", href: "/purchases" },
      ],
    },
    {
      group: "Sales & Revenue",
      items: [
        { icon: LayoutGrid, label: "Point of Sale (POS)", href: "/pos" },
        { icon: SiShopify, label: "Shopify Sync", href: "/shopify" },
      ],
    },
    {
      group: "Finance & Accounting",
      restricted: true,
      items: [
        { icon: Calculator, label: "Accounting", href: "/accounting" },
        { icon: BarChart3, label: "Business Reports", href: "/reports" },
      ],
    },
    {
      group: "Directory",
      items: [
        { icon: Users, label: "Customers", href: "/customers" },
        { icon: Store, label: "Vendors", href: "/vendors" },
      ],
    },
    {
      group: "Administration",
      restricted: true,
      items: [
        { icon: ShieldCheck, label: "User Management", href: "/admin/users" },
      ],
    },
  ];

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "U"
    );
  };

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
    : "User";

  return (
    <div className="print:hidden h-screen w-64 bg-card border-r border-border flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <a
          href="/"
          className="flex items-center gap-3 cursor-pointer group no-underline"
        >
          <img
            src={logoImg}
            alt="TruckGear Logo"
            className="h-8 w-8 rounded-md object-cover transition-transform group-hover:scale-110"
          />
          <h1 className="font-display font-bold tracking-tight text-primary leading-tight">
            <span className="text-xl">Truckgear</span><br/>
            <span className="text-xs font-semibold text-yellow-500 tracking-wide">Truck Parts Store</span>
          </h1>
        </a>
      </div>

      <nav className="flex-1 px-4 overflow-y-auto space-y-6 pb-6">
        {menuGroups.map((group) => {
          if (group.restricted && !isAdmin) return null;

          return (
            <div key={group.group}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 group ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${
                          isActive
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="h-3 w-3" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-9 w-9 border border-border ring-2 ring-primary/5">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-none mb-1">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate italic leading-none">
              @{user?.username}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
