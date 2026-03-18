import { Download } from "lucide-react";

interface Result {
  keyword: string;
  position: string;
  url: string;
}

interface ResultsTableProps {
  results: Result[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const exportCSV = () => {
    const headers = "Keyword,Position,URL,Status\n";
    const rows = results
      .map(
        (r) =>
          `"${r.keyword}","${r.position}","${r.url}","${r.position !== "100+" && r.position !== "Error" ? "Found" : "Missing"}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rankings.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatus = (position: string) => {
    if (position === "Error") return { label: "Error", variant: "error" as const };
    if (position === "100+") return { label: "Missing", variant: "missing" as const };
    return { label: "Found", variant: "found" as const };
  };

  const statusStyles = {
    found: "bg-success/10 text-success",
    missing: "bg-muted text-muted-foreground",
    error: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="w-full">
      <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
        <h2 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
          Results · {results.length} keywords
        </h2>
        <button
          onClick={exportCSV}
          className="text-xs font-semibold text-info hover:opacity-80 transition-opacity flex items-center gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs font-medium text-muted-foreground border-b border-border">
              <th className="px-6 py-3.5">Keyword</th>
              <th className="px-6 py-3.5">Position</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {results.map((row, i) => {
              const status = getStatus(row.position);
              const posNum = parseInt(row.position);
              const isTopTen = !isNaN(posNum) && posNum <= 10;

              return (
                <tr
                  key={i}
                  className="hover:bg-secondary/40 transition-colors duration-150"
                >
                  <td className="px-6 py-3.5 text-sm font-medium text-foreground">
                    {row.keyword}
                  </td>
                  <td className="px-6 py-3.5 text-sm tabular-nums">
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
                  <td className="px-6 py-3.5">
                    <span
                      className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold ${statusStyles[status.variant]}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground truncate max-w-[250px]">
                    {row.url}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
