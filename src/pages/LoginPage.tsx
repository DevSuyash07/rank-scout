import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-[var(--radius)] shadow-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Email</label>
            <input
              type="email"
              required
              className="w-full p-2.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border focus:ring-2 focus:ring-info outline-none transition-all text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Password</label>
            <input
              type="password"
              required
              className="w-full p-2.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border focus:ring-2 focus:ring-info outline-none transition-all text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-[var(--radius-inner)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-medium py-2.5 rounded-[var(--radius-inner)] hover:opacity-90 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="text-foreground font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
