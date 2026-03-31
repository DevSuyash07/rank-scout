import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Shield, Ban, CheckCircle, Save, Pencil, X, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  role: string;
  credits_limit: number;
  is_blocked: boolean;
  searches_used: number;
}

export default function AdminPage() {
  const { user, signOut } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState<Record<string, string>>({});
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load users");
        return;
      }
      setUsers(data);
      const credits: Record<string, string> = {};
      data.forEach((u: AdminUser) => {
        credits[u.id] = String(u.credits_limit);
      });
      setEditCredits(credits);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: { credits_limit?: number; is_blocked?: boolean; email?: string; password?: string }) => {
    setSaving(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Update failed");
        return;
      }
      toast.success("User updated successfully");
      setEditingUser(null);
      setEditEmail("");
      setEditPassword("");
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  };

  const toggleBlock = (u: AdminUser) => {
    updateUser(u.id, { is_blocked: !u.is_blocked });
  };

  const saveCredits = (userId: string) => {
    const val = parseInt(editCredits[userId]);
    if (isNaN(val) || val < 0) return;
    updateUser(userId, { credits_limit: val });
  };

  const startEditing = (u: AdminUser) => {
    setEditingUser(u.id);
    setEditEmail(u.email);
    setEditPassword("");
    setShowPassword(false);
  };

  const saveUserDetails = (userId: string) => {
    const updates: any = {};
    const currentUser = users.find(u => u.id === userId);
    if (editEmail && editEmail !== currentUser?.email) updates.email = editEmail;
    if (editPassword.trim()) updates.password = editPassword;
    if (Object.keys(updates).length === 0) {
      setEditingUser(null);
      return;
    }
    updateUser(userId, updates);
  };

  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage users, credits, and access control.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[160px]">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="text-sm font-medium text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-[var(--radius-inner)] hover:bg-destructive/10"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-[var(--radius-inner)]">
            {error}
          </div>
        )}

        <section className="bg-card rounded-[var(--radius)] shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-medium text-muted-foreground border-b border-border">
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Usage</th>
                    <th className="px-5 py-3.5">Credits Limit</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Joined</th>
                    <th className="px-5 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((u) => {
                    const usagePercent = u.credits_limit > 0 ? Math.min((u.searches_used / u.credits_limit) * 100, 100) : 0;
                    const isEditing = editingUser === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-secondary/40 transition-colors duration-150">
                        <td className="px-5 py-3 text-sm font-medium text-foreground">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="email"
                                className="w-full p-1.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border text-sm"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="Email"
                              />
                              <div className="relative">
                                <input
                                  type={showPassword ? "text" : "password"}
                                  className="w-full p-1.5 pr-8 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border text-sm"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  placeholder="New password (optional)"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                >
                                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          ) : (
                            u.email
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold ${
                            u.role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 min-w-[140px]">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {u.searches_used} / {u.credits_limit}
                            </span>
                            <Progress value={usagePercent} className="h-1.5" />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              className="w-20 p-1.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border text-sm text-center tabular-nums"
                              value={editCredits[u.id] || ""}
                              onChange={(e) =>
                                setEditCredits({ ...editCredits, [u.id]: e.target.value })
                              }
                            />
                            <button
                              onClick={() => saveCredits(u.id)}
                              disabled={saving === u.id}
                              className="p-1.5 rounded-[var(--radius-inner)] hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                              title="Save credits"
                            >
                              {saving === u.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold ${
                            u.is_blocked ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"
                          }`}>
                            {u.is_blocked ? "Blocked" : "Active"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveUserDetails(u.id)}
                                  disabled={saving === u.id}
                                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[var(--radius-inner)] text-primary hover:bg-primary/10 transition-colors"
                                >
                                  {saving === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                  Save
                                </button>
                                <button
                                  onClick={() => { setEditingUser(null); setEditPassword(""); }}
                                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[var(--radius-inner)] text-muted-foreground hover:bg-secondary transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(u)}
                                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[var(--radius-inner)] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                  title="Edit user"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                {u.role !== "admin" && (
                                  <button
                                    onClick={() => toggleBlock(u)}
                                    disabled={saving === u.id}
                                    className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[var(--radius-inner)] transition-colors ${
                                      u.is_blocked
                                        ? "text-green-600 hover:bg-green-500/10"
                                        : "text-destructive hover:bg-destructive/10"
                                    }`}
                                  >
                                    {u.is_blocked ? (
                                      <>
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        Unblock
                                      </>
                                    ) : (
                                      <>
                                        <Ban className="h-3.5 w-3.5" />
                                        Block
                                      </>
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
