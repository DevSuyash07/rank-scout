import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogIn } from "lucide-react";

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password don't match any account. If you've never signed up here, create an account first.";
  }
  if (m.includes("email not confirmed")) {
    return "This account hasn't been confirmed yet. Check your inbox for the confirmation link, or resend it below.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror")) {
    return "Couldn't reach the authentication server. Check your connection and try again.";
  }
  return message;
}

export default function LoginPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setNeedsConfirmation(false);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(friendlyError(error.message));
      setNeedsConfirmation(error.message.toLowerCase().includes("email not confirmed"));
    }
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Enter your email address first, then resend the confirmation.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    if (error) setError(friendlyError(error.message));
    else setNotice(`Confirmation email sent to ${email}. Open the link, then sign in.`);
    setBusy(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address first, then request a reset link.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) setError(friendlyError(error.message));
    else setNotice(`Password reset link sent to ${email}. Check your inbox and spam folder.`);
    setBusy(false);
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
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="block text-sm font-medium text-muted-foreground">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={busy || loading}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              required
              className="w-full p-2.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border focus:ring-2 focus:ring-info outline-none transition-all text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-[var(--radius-inner)] space-y-2">
              <p>{error}</p>
              {needsConfirmation && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={busy}
                  className="font-medium underline disabled:opacity-50"
                >
                  Resend confirmation email
                </button>
              )}
            </div>
          )}

          {notice && (
            <div className="text-sm text-foreground bg-secondary/60 px-4 py-2.5 rounded-[var(--radius-inner)]">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || busy}
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
