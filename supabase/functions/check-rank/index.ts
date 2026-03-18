import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOCATION_MAP: Record<string, string> = {
  "United States": "us",
  "United Kingdom": "uk",
  India: "in",
  Canada: "ca",
  Australia: "au",
  Germany: "de",
  France: "fr",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERP_API_KEY = Deno.env.get("SERP_API_KEY");
    if (!SERP_API_KEY) {
      throw new Error("SERP_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { keywords, domain, location, device } = await req.json();

    // Validate inputs
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      throw new Error("Keywords array is required");
    }
    if (!domain || typeof domain !== "string") {
      throw new Error("Domain is required");
    }
    if (keywords.length > 50) {
      throw new Error("Maximum 50 keywords per request");
    }

    // Sanitize domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .toLowerCase()
      .trim();

    const gl = LOCATION_MAP[location] || "us";

    const results = await Promise.all(
      keywords.map(async (kw: string) => {
        const keyword = kw.trim();
        if (!keyword) return null;

        try {
          const params = new URLSearchParams({
            engine: "google",
            q: keyword,
            location: location || "United States",
            gl,
            hl: "en",
            device: device || "desktop",
            num: "100",
            api_key: SERP_API_KEY,
          });

          const response = await fetch(
            `https://serpapi.com/search?${params.toString()}`
          );

          if (!response.ok) {
            console.error(`SerpAPI error for "${keyword}": ${response.status}`);
            return {
              keyword,
              position: "Error",
              url: "API error",
              domain: cleanDomain,
              location: location || "United States",
              device: device || "desktop",
            };
          }

          const data = await response.json();
          const organicResults = data.organic_results || [];

          const match = organicResults.find((res: any) =>
            res.link?.toLowerCase().includes(cleanDomain)
          );

          const result = {
            keyword,
            position: match ? String(match.position) : "100+",
            url: match ? match.link : "Not Found",
            domain: cleanDomain,
            location: location || "United States",
            device: device || "desktop",
          };

          // Save to DB
          await supabase.from("rankings").insert({
            keyword: result.keyword,
            domain: result.domain,
            location: result.location,
            device: result.device,
            position: result.position,
            url: result.url,
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

    return new Response(JSON.stringify(filtered), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
