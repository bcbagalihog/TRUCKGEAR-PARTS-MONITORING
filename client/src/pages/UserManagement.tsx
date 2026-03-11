import { useState, useEffect } from "react";
import {
  UserPlus,
  ShieldCheck,
  Lock,
  Unlock,
  Loader2,
  Building2,
  ArrowLeft, // Added for the back button
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "staff",
    companyId: 1,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Employee account created!" });
        setNewUser({
          username: "",
          password: "",
          firstName: "",
          lastName: "",
          role: "staff",
          companyId: 1,
        });
        fetchUsers();
      } else {
        const error = await res.json();
        toast({
          title: "Failed",
          description: error.message || "Could not create user",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        toast({ title: "Status Updated", description: "User access changed." });
        fetchUsers();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not update status.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Create staff accounts, assign roles, and manage system access for
            your operations.
          </p>
        </div>

        {/* ADDED: Return to Dashboard button */}
        <a
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden sticky top-6">
            <div className="bg-muted/50 border-b border-border p-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Add New Employee
              </h2>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    First Name
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    value={newUser.firstName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, firstName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    value={newUser.lastName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Login Username
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Temporary Password
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Role
                  </label>
                  <select
                    className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary"
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                  >
                    <option value="staff">Staff (Limited)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Company
                  </label>
                  <select
                    className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary"
                    value={newUser.companyId}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        companyId: Number(e.target.value),
                      })
                    }
                  >
                    <option value={1}>Truckgear</option>
                    <option value={2}>Sister Co.</option>
                  </select>
                </div>
              </div>

              <button
                disabled={isCreating}
                type="submit"
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-md transition-colors flex justify-center items-center"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Role & Company</th>
                  <th className="p-4 text-center">Access</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Loading directory...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-muted/50 transition-colors ${!u.isActive ? "opacity-60 bg-muted/30" : ""}`}
                    >
                      <td className="p-4 font-medium text-foreground flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {u.firstName?.[0] || "U"}
                          {u.lastName?.[0] || ""}
                        </div>
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">
                        @{u.username}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`w-max px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-secondary text-secondary-foreground"}`}
                          >
                            {u.role}
                          </span>
                          <span className="flex items-center text-[11px] text-muted-foreground font-medium">
                            <Building2 className="h-3 w-3 mr-1" />
                            {u.companyId === 1 ? "Truckgear" : "Sister Co."}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${u.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}
                        >
                          {u.isActive ? (
                            <Unlock className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          {u.isActive ? "ACTIVE" : "LOCKED"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => toggleUserStatus(u.id, u.isActive)}
                          className="text-xs font-medium text-primary hover:text-primary/80 hover:underline"
                        >
                          {u.isActive ? "Disable Access" : "Restore Access"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
