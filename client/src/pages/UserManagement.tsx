import { useState, useEffect, useRef } from "react";
import {
  UserPlus, ShieldCheck, Lock, Unlock, Loader2,
  Building2, ArrowLeft, Pencil, Trash2, X, Upload, ImagePlus, Save, PlusCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EMPTY_COMPANY = { name: "", address: "", phone: "", tin: "", logoUrl: "" };

export default function UserManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"users" | "companies">("users");

  // ── Users State ──
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [newUser, setNewUser] = useState({ username: "", password: "", firstName: "", lastName: "", role: "staff", companyId: 1 });

  const [editUser, setEditUser] = useState<any>(null);
  const [editData, setEditData] = useState({ firstName: "", lastName: "", role: "staff", companyId: 1, newPassword: "" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Company State ──
  const [companyForms, setCompanyForms] = useState<any[]>([]);
  const [savingCompany, setSavingCompany] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<number | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<number | null>(null);
  const [confirmDeleteCompany, setConfirmDeleteCompany] = useState<any>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ ...EMPTY_COMPANY });
  const [isSavingNew, setIsSavingNew] = useState(false);
  const logoInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Fetch on mount
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, companiesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/companies"),
      ]);
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const companiesData = companiesRes.ok ? await companiesRes.json() : [];
      setUsers(usersData);
      setCompanies(companiesData);
      setCompanyForms(companiesData.map((c: any) => ({ ...c })));
    } catch {
      toast({ title: "Error", description: "Could not load data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getCompanyName = (companyId: number) => {
    const c = companies.find(c => c.id === companyId);
    return c?.name || `Company ${companyId}`;
  };

  // ── Create User ──
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
        toast({ title: "Account created!" });
        setNewUser({ username: "", password: "", firstName: "", lastName: "", role: "staff", companyId: companies[0]?.id || 1 });
        fetchAll();
      } else {
        const err = await res.json();
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setIsCreating(false); }
  };

  // ── Toggle Status ──
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentStatus }),
    });
    if (res.ok) { toast({ title: "Access updated" }); fetchAll(); }
  };

  // ── Edit User ──
  const openEdit = (u: any) => {
    setEditUser(u);
    setEditData({ firstName: u.firstName || "", lastName: u.lastName || "", role: u.role, companyId: u.companyId, newPassword: "" });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setIsSavingEdit(true);
    try {
      const payload: any = { firstName: editData.firstName, lastName: editData.lastName, role: editData.role, companyId: editData.companyId };
      if (editData.newPassword.trim()) payload.password = editData.newPassword.trim();
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: "User updated" });
        setEditUser(null);
        fetchAll();
      } else {
        const err = await res.json();
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setIsSavingEdit(false); }
  };

  // ── Delete User ──
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Account deleted" });
        setDeleteTarget(null);
        fetchAll();
      } else {
        const err = await res.json();
        toast({ title: "Cannot delete", description: err.message, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setIsDeleting(false); }
  };

  // ── Company helpers ──
  const updateCompanyForm = (id: number, field: string, value: string) => {
    setCompanyForms(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // ── Save Existing Company ──
  const handleSaveCompany = async (company: any) => {
    setSavingCompany(company.id);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: company.name, address: company.address, phone: company.phone, tin: company.tin, logoUrl: company.logoUrl }),
      });
      if (res.ok) {
        toast({ title: `${company.name || "Company"} saved` });
        fetchAll();
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setSavingCompany(null); }
  };

  // ── Add New Company ──
  const handleAddCompany = async () => {
    if (!newCompany.name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    setIsSavingNew(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany),
      });
      if (res.ok) {
        toast({ title: `${newCompany.name} added!` });
        setNewCompany({ ...EMPTY_COMPANY });
        setIsAddingCompany(false);
        fetchAll();
      } else {
        toast({ title: "Failed to add company", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setIsSavingNew(false); }
  };

  // ── Delete Company ──
  const handleDeleteCompany = async () => {
    if (!confirmDeleteCompany) return;
    setDeletingCompany(confirmDeleteCompany.id);
    try {
      const res = await fetch(`/api/companies/${confirmDeleteCompany.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: `${confirmDeleteCompany.name} removed` });
        setConfirmDeleteCompany(null);
        fetchAll();
      } else {
        const err = await res.json();
        toast({ title: "Cannot delete", description: err.message, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setDeletingCompany(null); }
  };

  // ── Logo Upload ──
  const handleLogoUpload = async (companyId: number, file: File) => {
    setUploadingLogo(companyId);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { imageUrl } = await res.json();
        const updatedForms = companyForms.map(c => c.id === companyId ? { ...c, logoUrl: imageUrl } : c);
        setCompanyForms(updatedForms);
        const updated = updatedForms.find(c => c.id === companyId);
        if (updated) {
          await fetch(`/api/companies/${companyId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });
          toast({ title: "Logo uploaded!" });
          fetchAll();
        }
      } else {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    } catch { toast({ title: "Upload error", variant: "destructive" }); }
    finally { setUploadingLogo(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Manage staff accounts and company profiles.</p>
        </div>
        <a href="/" className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ key: "users", label: "User Accounts", icon: UserPlus }, { key: "companies", label: "Company Settings", icon: Building2 }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all ${activeTab === key ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ══ USERS TAB ══ */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden sticky top-6">
              <div className="bg-muted/50 border-b border-border p-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" /> Add New Employee
                </h2>
              </div>
              <form onSubmit={handleCreateUser} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">First Name</label>
                    <input required type="text" className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Last Name</label>
                    <input required type="text" className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Login Username</label>
                  <input required type="text" className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Temporary Password</label>
                  <input required type="text" className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                    value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Role</label>
                    <select className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary"
                      value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                      <option value="staff">Staff (Limited)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Company</label>
                    <select className="w-full bg-background border border-input rounded-md p-2 text-sm outline-none focus:border-primary"
                      value={newUser.companyId} onChange={(e) => setNewUser({ ...newUser, companyId: Number(e.target.value) })}>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <button disabled={isCreating} type="submit"
                  className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-md transition-colors flex justify-center items-center gap-2">
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </button>
              </form>
            </div>
          </div>

          {/* User Table */}
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
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
                  ) : users.map((u: any) => (
                    <tr key={u.id} className={`hover:bg-muted/50 transition-colors ${!u.isActive ? "opacity-60 bg-muted/30" : ""}`}>
                      <td className="p-4 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {u.firstName?.[0] || "U"}{u.lastName?.[0] || ""}
                          </div>
                          {u.firstName} {u.lastName}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">@{u.username}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`w-max px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-secondary text-secondary-foreground"}`}>
                            {u.role}
                          </span>
                          <span className="flex items-center text-[11px] text-muted-foreground font-medium">
                            <Building2 className="h-3 w-3 mr-1" />{getCompanyName(u.companyId)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                          {u.isActive ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          {u.isActive ? "ACTIVE" : "LOCKED"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(u)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => toggleUserStatus(u.id, u.isActive)} className="text-xs font-medium text-primary hover:text-primary/80 hover:underline">
                            {u.isActive ? "Disable" : "Restore"}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => setDeleteTarget(u)} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 hover:underline">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ COMPANY SETTINGS TAB ══ */}
      {activeTab === "companies" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {companyForms.length} {companyForms.length === 1 ? "company" : "companies"} registered.
              Company names appear in user account dropdowns.
            </p>
            <button onClick={() => { setIsAddingCompany(true); setNewCompany({ ...EMPTY_COMPANY }); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
              <PlusCircle className="h-4 w-4" /> Add Company
            </button>
          </div>

          {/* ── Add Company Form ── */}
          {isAddingCompany && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                <PlusCircle className="h-4 w-4" /> New Company
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Company Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="e.g. Sister Company 3" autoFocus
                    className="w-full border border-blue-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-bold"
                    value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Business Address</label>
                  <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    value={newCompany.address} onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Phone</label>
                  <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    value={newCompany.phone} onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">TIN</label>
                  <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-mono"
                    value={newCompany.tin} onChange={(e) => setNewCompany({ ...newCompany, tin: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setIsAddingCompany(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleAddCompany} disabled={isSavingNew}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors">
                  {isSavingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save New Company
                </button>
              </div>
            </div>
          )}

          {/* ── Existing Company Cards ── */}
          {loading ? (
            <div className="text-center py-12 text-gray-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading companies...</div>
          ) : companyForms.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              No companies yet. Click "Add Company" to create one.
            </div>
          ) : companyForms.map((company) => (
            <div key={company.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-5">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  {company.name || `Company ${company.id}`}
                  {company.id === 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full normal-case tracking-normal">Primary</span>
                  )}
                </h3>
                {company.id !== 1 && (
                  <button onClick={() => setConfirmDeleteCompany(company)}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt="Company Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
                    ref={el => { logoInputRefs.current[company.id] = el; }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(company.id, f); }} />
                  <button type="button" onClick={() => logoInputRefs.current[company.id]?.click()}
                    disabled={uploadingLogo === company.id}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 border rounded-md hover:bg-gray-50 transition-colors text-gray-600">
                    {uploadingLogo === company.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {company.logoUrl ? "Change Logo" : "Upload Logo"}
                  </button>
                  {company.logoUrl && (
                    <button type="button" onClick={() => updateCompanyForm(company.id, "logoUrl", "")}
                      className="text-xs text-red-400 hover:text-red-600">Remove logo</button>
                  )}
                </div>

                {/* Fields */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company Name</label>
                    <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-bold"
                      value={company.name} onChange={(e) => updateCompanyForm(company.id, "name", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Business Address</label>
                    <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      value={company.address || ""} onChange={(e) => updateCompanyForm(company.id, "address", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                    <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      value={company.phone || ""} onChange={(e) => updateCompanyForm(company.id, "phone", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">TIN</label>
                    <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-mono"
                      value={company.tin || ""} onChange={(e) => updateCompanyForm(company.id, "tin", e.target.value)} />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button type="button" onClick={() => handleSaveCompany(company)} disabled={savingCompany === company.id}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors">
                      {savingCompany === company.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ EDIT USER MODAL ══ */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-gray-900">Edit Account — @{editUser.username}</h2>
              <button onClick={() => setEditUser(null)} className="p-1 hover:bg-gray-100 rounded-md"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">First Name</label>
                  <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    value={editData.firstName} onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Last Name</label>
                  <input type="text" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    value={editData.lastName} onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
                  <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })}>
                    <option value="staff">Staff (Limited)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company</label>
                  <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    value={editData.companyId} onChange={(e) => setEditData({ ...editData, companyId: Number(e.target.value) })}>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  New Password <span className="text-gray-400 normal-case font-normal">(leave blank to keep current)</span>
                </label>
                <input type="password" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-mono"
                  placeholder="••••••••" value={editData.newPassword} onChange={(e) => setEditData({ ...editData, newPassword: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSavingEdit}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors">
                {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE USER MODAL ══ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Delete Account?</h2>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 my-4">
              Permanently delete the account for <span className="font-bold">{deleteTarget.firstName} {deleteTarget.lastName}</span> (@{deleteTarget.username})?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDeleteUser} disabled={isDeleting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE COMPANY MODAL ══ */}
      {confirmDeleteCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Remove Company?</h2>
                <p className="text-sm text-gray-500">Users assigned to this company will keep their assignment but the company name will no longer appear.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 bg-orange-50 rounded-lg p-3 my-4 border border-orange-100">
              Remove <span className="font-bold">{confirmDeleteCompany.name}</span> from the company list?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteCompany(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDeleteCompany} disabled={deletingCompany === confirmDeleteCompany.id}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors">
                {deletingCompany === confirmDeleteCompany.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
