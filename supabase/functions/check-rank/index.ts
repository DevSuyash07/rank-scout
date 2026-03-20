import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_TO_GL: Record<string, string> = {
  "United States": "us",
  "United Kingdom": "gb",
  India: "in",
  Canada: "ca",
  Australia: "au",
  Germany: "de",
  France: "fr",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SEARLO_API_KEY = Deno.env.get("SEARLO_API_KEY");
    if (!SEARLO_API_KEY) {
      throw new Error("SEARLO_API_KEY is not configured");
    }

    const authHeader = req.headers.get("authorization") || "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { keywords, domain, location, device } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      throw new Error("Keywords array is required");
    }
    if (!domain || typeof domain !== "string") {
      throw new Error("Domain is required");
    }
    if (keywords.length > 50) {
      throw new Error("Maximum 50 keywords per request");
    }

    const keywordCount = keywords.filter((k: string) => k.trim()).length;

    // --- Usage limit check ---
    const currentMonth = new Date().toISOString().slice(0, 7);

    const { data: usageRow, error: usageError } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .maybeSingle();

    if (usageError) throw usageError;

    const currentUsage = usageRow?.searches_used ?? 0;

    if (currentUsage + keywordCount > 1000) {
      return new Response(
        JSON.stringify({
          error: "Monthly limit reached",
          usage: { used: currentUsage, limit: 1000 },
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .toLowerCase()
      .trim();

    const gl = LOCATION_TO_GL[location] || "us";

    const results = await Promise.all(
      keywords.map(async (kw: string) => {
        const keyword = kw.trim();
        if (!keyword) return null;

        try {
          // Searlo uses /search/web with x-api-key header
          // We paginate through up to 10 pages (100 results) to find domain
          let matchRank: number | null = null;
          let matchLink: string | null = null;

          for (let page = 1; page <= 10; page++) {
            const params = new URLSearchParams({
              q: keyword,
              limit: "10",
              page: String(page),
              gl,
            });

            const response = await fetch(
              `https://api.searlo.tech/api/v1/search/web?${params.toString()}`,
              {
                method: "GET",
                headers: {
                  "x-api-key": SEARLO_API_KEY,
                },
              }
            );

            if (!response.ok) {
              console.error(`Searlo API error for "${keyword}" page ${page}: ${response.status}`);
              break;
            }

            const data = await response.json();
            const items = data.items || [];

            const found = items.find((item: any) =>
              item.link?.toLowerCase().includes(cleanDomain)
            );

            if (found) {
              matchRank = found.rank;
              matchLink = found.link;
              break;
            }

            // Stop if no more pages
            if (!data.searchInformation?.hasNextPage || items.length === 0) {
              break;
            }
          }

          const result = {
            keyword,
            position: matchRank ? String(matchRank) : "100+",
            url: matchLink || "Not Found",
            domain: cleanDomain,
            location: location || "United States",
            device: device || "desktop",
          };

          await supabase.from("rankings").insert({
            keyword: result.keyword,
            domain: result.domain,
            location: result.location,
            device: result.device,
            position: result.position,
            url: result.url,
            user_id: user.id,
          });

          return result;
        } catch (err) {
          console.error(`Error processing keyword "${keyword}":`, err);
          return {
            keyword,
            position: "Error",
            url: "Processing error",
            domain: cleanDomain,
            location: location || "United States",
            device: device || "desktop",
          };
        }
      })
    );

    const filtered = results.filter(Boolean);

    // --- Update usage ---
    if (usageRow) {
      await supabase
        .from("user_usage")
        .update({ searches_used: currentUsage + keywordCount })
        .eq("id", usageRow.id);
    } else {
      await supabase.from("user_usage").insert({
        user_id: user.id,
        month: currentMonth,
        searches_used: keywordCount,
      });
    }

    return new Response(
      JSON.stringify({ results: filtered, usage: { used: currentUsage + keywordCount, limit: 1000 } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
