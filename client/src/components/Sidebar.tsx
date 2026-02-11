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
  Settings,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Package, label: "Inventory", href: "/products" },
    { icon: ShoppingCart, label: "Sales Orders", href: "/sales" },
    { icon: Truck, label: "Purchases", href: "/purchases" },
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: Store, label: "Vendors", href: "/vendors" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
  ];

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  };

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'User';

  return (
    <div className="h-screen w-64 bg-card border-r border-border flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="TruckGear Logo" className="h-8 w-8 rounded-md object-cover" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-primary">
            TRUCKGEAR<span className="text-yellow-400">.IO</span>
          </h1>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? "sidebar-link-active" : "sidebar-link-inactive"}`}>
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
