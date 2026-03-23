import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setError(error.message);
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Please sign in instead.");
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card rounded-[var(--radius)] shadow-card p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link to="/login" className="inline-block text-sm text-foreground font-medium hover:underline mt-2">
            Back to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground">Sign up to start tracking rankings</p>
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
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Confirm Password</label>
            <input
              type="password"
              required
              className="w-full p-2.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border focus:ring-2 focus:ring-info outline-none transition-all text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Register
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-foreground font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
