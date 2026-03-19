import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

export default function RankForm({ onResults, loading, setLoading }: RankFormProps) {
  const [formData, setFormData] = useState({
    keywords: "",
    domain: "",
    location: "United States",
    device: "desktop",
  });
  const [error, setError] = useState("");

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
        throw new Error(data.error || "Failed to check rankings");
      }

      onResults(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        disabled={loading}
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
