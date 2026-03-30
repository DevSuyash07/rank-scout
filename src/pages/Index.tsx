import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { History, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import RankForm from "@/components/RankForm";
import ResultsTable from "@/components/ResultsTable";

const Index = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    }
  }, [user]);

  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-start justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Index
            </h1>
            <p className="text-muted-foreground text-sm">
              Professional keyword position tracking. Check where your domain ranks on Google.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[160px]">
              {user?.email}
            </span>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-[var(--radius-inner)] hover:bg-primary/10"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            <Link
              to="/history"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-[var(--radius-inner)] hover:bg-secondary"
            >
              <History className="h-4 w-4" />
              History
            </Link>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-[var(--radius-inner)] hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <section className="bg-card rounded-[var(--radius)] shadow-card p-6">
          <RankForm onResults={setResults} loading={loading} setLoading={setLoading} />
        </section>

        {results.length > 0 && (
          <section className="bg-card rounded-[var(--radius)] shadow-card overflow-hidden">
            <ResultsTable results={results} />
          </section>
        )}
      </div>
    </main>
  );
};

export default Index;
