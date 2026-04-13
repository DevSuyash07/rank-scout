import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_MAP: Record<string, { code: number; name: string }> = {
  "United States": { code: 2840, name: "United States" },
  "United Kingdom": { code: 2826, name: "United Kingdom" },
  India: { code: 2356, name: "India" },
  Canada: { code: 2124, name: "Canada" },
  Australia: { code: 2036, name: "Australia" },
  Germany: { code: 2276, name: "Germany" },
  France: { code: 2250, name: "France" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const DATAFORSEO_AUTH = Deno.env.get("DATAFORSEO_AUTH");
    if (!DATAFORSEO_AUTH) {
      throw new Error("DATAFORSEO_AUTH is not configured");
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

    const { data: userRoleData } = await supabase
      .from("user_roles")
      .select("credits_limit, is_blocked")
      .eq("user_id", user.id)
      .maybeSingle();

    const userLimit = userRoleData?.credits_limit ?? 10;
    const isBlocked = userRoleData?.is_blocked ?? false;

    if (isBlocked) {
      return new Response(
        JSON.stringify({ error: "Your account has been blocked. Contact admin." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (currentUsage + keywordCount > userLimit) {
      return new Response(
        JSON.stringify({
          error: "Monthly limit reached",
          usage: { used: currentUsage, limit: userLimit },
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

    const locationInfo = LOCATION_MAP[location] || LOCATION_MAP["United States"];

    // Build all keyword tasks into a single DataForSEO batch request
    const validKeywords = keywords.map((k: string) => k.trim()).filter(Boolean);
    const postData = validKeywords.map((keyword: string) => ({
      keyword,
      location_code: locationInfo.code,
      language_code: "en",
      device: device === "mobile" ? "mobile" : "desktop",
      os: device === "mobile" ? "android" : "windows",
      depth: 100,
    }));

    let results: any[] = [];

    try {
      console.log(`Sending ${postData.length} keywords to DataForSEO...`);
      const response = await fetch(
        "https://api.dataforseo.com/v3/serp/google/organic/live/regular",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${DATAFORSEO_AUTH}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(`DataForSEO API error: ${response.status} - ${errText.substring(0, 300)}`);
        results = validKeywords.map((keyword: string) => ({
          keyword,
          position: "Error",
          url: "API temporarily unavailable",
          domain: cleanDomain,
          location: location || "United States",
          device: device || "desktop",
        }));
      } else {
        const data = await response.json();
        console.log(`DataForSEO response: status_code=${data.status_code}, tasks=${data.tasks?.length}`);

        const tasks = data.tasks || [];
        results = tasks.map((task: any, idx: number) => {
          const kw = validKeywords[idx] || `keyword_${idx}`;
          let matchRank: number | null = null;
          let matchLink: string | null = null;

          if (task.status_code === 20000 && task.result && task.result.length > 0) {
            const items = task.result[0].items || [];
            for (const item of items) {
              if (item.type !== "organic") continue;
              const itemUrl = (item.url || "").toLowerCase();
              const itemDomain = (item.domain || "").toLowerCase();
              if (itemUrl.includes(cleanDomain) || itemDomain.includes(cleanDomain)) {
                matchRank = item.rank_absolute || item.rank_group;
                matchLink = item.url;
                break;
              }
            }
          } else {
            console.error(`Task error for "${kw}": ${task.status_message}`);
          }

          return {
            keyword: kw,
            position: matchRank ? String(matchRank) : "100+",
            url: matchLink || "Not Found",
            domain: cleanDomain,
            location: location || "United States",
            device: device || "desktop",
          };
        });
      }
    } catch (err) {
      console.error("DataForSEO batch request failed:", err);
      results = validKeywords.map((keyword: string) => ({
        keyword,
        position: "Error",
        url: "Processing error",
        domain: cleanDomain,
        location: location || "United States",
        device: device || "desktop",
      }));
    }

    // Save all results to DB
    for (const result of results) {
      await supabase.from("rankings").insert({
        keyword: result.keyword,
        domain: result.domain,
        location: result.location,
        device: result.device,
        position: result.position,
        url: result.url,
        user_id: user.id,
      });
    }

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
      JSON.stringify({ results: filtered, usage: { used: currentUsage + keywordCount, limit: userLimit } }),
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
