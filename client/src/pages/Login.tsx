import { Button } from "@/components/ui/button";

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-border p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold text-primary mb-2">AUTOPARTS<span className="text-accent">.IO</span></h1>
          <p className="text-muted-foreground">Inventory Management System</p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-slate-600 mb-6">Sign in to manage inventory, orders, and sales.</p>
          <Button 
            className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all"
            onClick={() => window.location.href = '/api/login'}
          >
            Log in with Replit
          </Button>
        </div>
      </div>
    </div>
  );
}
