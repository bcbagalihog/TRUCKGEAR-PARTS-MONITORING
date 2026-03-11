import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// REPLACED: VATInvoice and Sales are consolidated into POS
import POS from "./pages/POS";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Purchases from "@/pages/Purchases";
import Customers from "@/pages/Customers";
import Vendors from "@/pages/Vendors";
import Reports from "@/pages/Reports";
import ShopifyPage from "@/pages/Shopify";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import Accounting from "@/pages/accounting";
import UserManagement from "@/pages/UserManagement";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>

      {/* CONSOLIDATED ROUTE: Replacing /sales and /vat-invoice with /pos */}
      <Route path="/pos">
        <ProtectedRoute component={POS} />
      </Route>

      <Route path="/products">
        <ProtectedRoute component={Inventory} />
      </Route>

      <Route path="/purchases">
        <ProtectedRoute component={Purchases} />
      </Route>

      <Route path="/customers">
        <ProtectedRoute component={Customers} />
      </Route>

      <Route path="/vendors">
        <ProtectedRoute component={Vendors} />
      </Route>

      <Route path="/accounting">
        <ProtectedRoute component={Accounting} />
      </Route>

      <Route path="/reports">
        <ProtectedRoute component={Reports} />
      </Route>

      <Route path="/shopify">
        <ProtectedRoute component={ShopifyPage} />
      </Route>

      <Route path="/admin/users">
        <ProtectedRoute component={UserManagement} />
      </Route>

      {/* Legacy Fallbacks: Redirect old paths to new POS to prevent 404s */}
      <Route path="/sales">
        <Redirect to="/pos" />
      </Route>
      <Route path="/vat-invoice">
        <Redirect to="/pos" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
