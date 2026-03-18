import { useState } from "react";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import RankForm from "@/components/RankForm";
import ResultsTable from "@/components/ResultsTable";

const Index = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
          <Link
            to="/history"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-[var(--radius-inner)] hover:bg-secondary"
          >
            <History className="h-4 w-4" />
            History
          </Link>
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
