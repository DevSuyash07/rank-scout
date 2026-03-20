import { useState, useEffect } from "react";
import { Loader2, Search, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface RankFormProps {
  onResults: (results: any[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const LOCATIONS = [
  "United States",
  "United Kingdom",
  "India",
  "Canada",
  "Australia",
  "Germany",
  "France",
];

const MONTHLY_LIMIT = 1000;

export default function RankForm({ onResults, loading, setLoading }: RankFormProps) {
  const [formData, setFormData] = useState({
    keywords: "",
    domain: "",
    location: "United States",
    device: "desktop",
  });
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data } = await supabase
        .from("user_usage")
        .select("searches_used")
        .eq("user_id", session.user.id)
        .eq("month", currentMonth)
        .maybeSingle();

      setUsage({ used: data?.searches_used ?? 0, limit: MONTHLY_LIMIT });
    } catch {
      // silently fail
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const keywordArray = formData.keywords
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywordArray.length === 0) {
      setError("Please enter at least one keyword.");
      setLoading(false);
      return;
    }

    if (keywordArray.length > 50) {
      setError("Maximum 50 keywords per request.");
      setLoading(false);
      return;
    }

    if (!formData.domain.trim()) {
      setError("Please enter a domain.");
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/check-rank`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ...formData,
            keywords: keywordArray,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (data.usage) setUsage(data.usage);
        throw new Error(data.error || "Failed to check rankings");
      }

      if (data.usage) setUsage(data.usage);
      onResults(data.results || data);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const usagePercent = usage ? Math.min((usage.used / usage.limit) * 100, 100) : 0;
  const limitReached = usage ? usage.used >= usage.limit : false;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Usage display */}
      {usage && (
        <div className="md:col-span-2 flex flex-col gap-2 p-4 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <BarChart3 className="h-4 w-4" />
              Monthly Usage
            </span>
            <span className={`font-semibold tabular-nums ${limitReached ? "text-destructive" : "text-foreground"}`}>
              {usage.used} / {usage.limit} searches
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          {limitReached && (
            <p className="text-xs text-destructive font-medium">
              You have reached your monthly limit. Usage resets next month.
            </p>
          )}
        </div>
      )}

      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-2 text-muted-foreground">
          Keywords <span className="text-muted-foreground/60">(one per line, max 50)</span>
        </label>
        <textarea
          required
          className="w-full h-32 p-3 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border focus:ring-2 focus:ring-info outline-none transition-all text-sm resize-none"
          placeholder={"seo tools\nkeyword ranker\nbest seo software"}
          value={formData.keywords}
          onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-muted-foreground">
          Target Domain
        </label>
        <input
          required
          type="text"
          className="w-full p-2.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border focus:ring-2 focus:ring-info outline-none transition-all text-sm"
          placeholder="example.com"
          value={formData.domain}
          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">
            Location
          </label>
          <select
            className="w-full p-2.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border outline-none text-sm"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          >
            {LOCATIONS.map((loc) => (
              <option key={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">
            Device
          </label>
          <select
            className="w-full p-2.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border outline-none text-sm"
            value={formData.device}
            onChange={(e) => setFormData({ ...formData, device: e.target.value })}
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="md:col-span-2 text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-[var(--radius-inner)]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || limitReached}
        className="md:col-span-2 w-full bg-primary text-primary-foreground font-medium py-3 rounded-[var(--radius-inner)] hover:opacity-90 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing SERPs...
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            Check Rankings
          </>
        )}
      </button>
    </form>
  );
}
