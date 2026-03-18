import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";

interface RankingRecord {
  id: string;
  keyword: string;
  domain: string;
  location: string;
  device: string;
  position: string;
  url: string;
  created_at: string;
}

const HistoryPage = () => {
  const [records, setRecords] = useState<RankingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const params = new URLSearchParams({ limit: "200" });
      if (domainFilter.trim()) {
        params.set("domain", domainFilter.trim());
      }

      const res = await fetch(
        `${supabaseUrl}/functions/v1/ranking-history?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${anonKey}`,
          },
        }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecords(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Ranking History
            </h1>
            <p className="text-muted-foreground text-sm">
              Browse previous keyword ranking checks.
            </p>
          </div>
        </header>

        <section className="bg-card rounded-[var(--radius)] shadow-card p-4">
          <form onSubmit={handleFilter} className="flex gap-3">
            <input
              type="text"
              placeholder="Filter by domain..."
              className="flex-1 p-2.5 rounded-[var(--radius-inner)] bg-secondary/50 ring-1 ring-border focus:ring-2 focus:ring-info outline-none transition-all text-sm"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-[var(--radius-inner)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Filter
            </button>
          </form>
        </section>

        <section className="bg-card rounded-[var(--radius)] shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading history...
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No ranking history found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-medium text-muted-foreground border-b border-border">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Keyword</th>
                    <th className="px-5 py-3.5">Domain</th>
                    <th className="px-5 py-3.5">Position</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Device</th>
                    <th className="px-5 py-3.5">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {records.map((row) => {
                    const posNum = parseInt(row.position);
                    const isTopTen = !isNaN(posNum) && posNum <= 10;
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-secondary/40 transition-colors duration-150"
                      >
                        <td className="px-5 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {new Date(row.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-foreground">
                          {row.keyword}
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {row.domain}
                        </td>
                        <td className="px-5 py-3 text-sm tabular-nums">
                          <span
                            className={
                              isTopTen
                                ? "text-success font-bold"
                                : "text-muted-foreground"
                            }
                          >
                            {row.position}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {row.location}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground capitalize">
                          {row.device}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground truncate max-w-[180px]">
                          {row.url}
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
};

export default HistoryPage;
