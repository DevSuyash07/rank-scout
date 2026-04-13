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

async function dataforseoFetch(url: string, auth: string, method = "GET", body?: string) {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = body;
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataForSEO ${res.status}: ${text.substring(0, 300)}`);
  }
  return res.json();
}

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
    const validKeywords = keywords.map((k: string) => k.trim()).filter(Boolean);

    // Step 1: Post tasks to DataForSEO (returns immediately)
    const postData = validKeywords.map((keyword: string, idx: number) => ({
      keyword,
      location_code: locationInfo.code,
      language_code: "en",
      device: device === "mobile" ? "mobile" : "desktop",
      os: device === "mobile" ? "android" : "windows",
      depth: 100,
      tag: `kw_${idx}`,
    }));

    console.log(`Posting ${postData.length} tasks to DataForSEO...`);
    const postResult = await dataforseoFetch(
      "https://api.dataforseo.com/v3/serp/google/organic/task_post",
      DATAFORSEO_AUTH,
      "POST",
      JSON.stringify(postData)
    );

    const taskIds: string[] = [];
    for (const task of postResult.tasks || []) {
      if (task.status_code === 20100 && task.id) {
        taskIds.push(task.id);
      } else {
        console.error(`Task post failed: ${task.status_message}`);
      }
    }

    console.log(`Posted ${taskIds.length} tasks. Polling for results...`);

    // Step 2: Poll tasks_ready then fetch results
    const maxPolls = 20;
    const pollInterval = 3000; // 3 seconds
    const completedResults: Map<string, any> = new Map();
    const pendingIds = new Set(taskIds);

    for (let poll = 0; poll < maxPolls && pendingIds.size > 0; poll++) {
      await new Promise((r) => setTimeout(r, pollInterval));

      try {
        const readyData = await dataforseoFetch(
          "https://api.dataforseo.com/v3/serp/google/organic/tasks_ready",
          DATAFORSEO_AUTH
        );

        const readyIds = new Set<string>();
        for (const task of readyData.tasks || []) {
          for (const result of task.result || []) {
            if (pendingIds.has(result.id)) {
              readyIds.add(result.id);
            }
          }
        }

        if (readyIds.size === 0) {
          console.log(`Poll ${poll + 1}: no tasks ready yet...`);
          continue;
        }

        console.log(`Poll ${poll + 1}: ${readyIds.size} tasks ready, fetching...`);

        // Fetch results for ready tasks
        for (const taskId of readyIds) {
          try {
            const taskResult = await dataforseoFetch(
              `https://api.dataforseo.com/v3/serp/google/organic/task_get/regular/${taskId}`,
              DATAFORSEO_AUTH
            );

            for (const task of taskResult.tasks || []) {
              if (task.status_code === 20000 && task.result && task.result.length > 0) {
                const resultData = task.result[0];
                const kw = resultData.keyword;
                completedResults.set(taskId, { keyword: kw, items: resultData.items || [] });
              }
            }
            pendingIds.delete(taskId);
          } catch (err) {
            console.error(`Error fetching task ${taskId}:`, err);
          }
        }
      } catch (err) {
        console.error(`Poll ${poll + 1} error:`, err);
      }
    }

    // Step 3: Build results
    const results = validKeywords.map((keyword: string, idx: number) => {
      // Find the matching completed result
      let matchRank: number | null = null;
      let matchLink: string | null = null;

      for (const [, completed] of completedResults) {
        if (completed.keyword === keyword) {
          for (const item of completed.items) {
            if (item.type !== "organic") continue;
            const itemUrl = (item.url || "").toLowerCase();
            const itemDomain = (item.domain || "").toLowerCase();
            if (itemUrl.includes(cleanDomain) || itemDomain.includes(cleanDomain)) {
              matchRank = item.rank_absolute || item.rank_group;
              matchLink = item.url;
              break;
            }
          }
          break;
        }
      }

      return {
        keyword,
        position: matchRank ? String(matchRank) : "100+",
        url: matchLink || "Not Found",
        domain: cleanDomain,
        location: location || "United States",
        device: device || "desktop",
      };
    });

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
      JSON.stringify({ results, usage: { used: currentUsage + keywordCount, limit: userLimit } }),
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
