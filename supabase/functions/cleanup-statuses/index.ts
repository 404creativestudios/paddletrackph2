import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 72);

    const { data, error } = await supabase
      .from("profiles")
      .update({
        status: "none",
        status_location: null,
        status_link: null,
      })
      .lt("status_updated_at", cutoffTime.toISOString())
      .neq("status", "none")
      .select("id");

    if (error) {
      console.error("Error cleaning up statuses:", error);
      throw error;
    }

    const cleanedCount = data?.length || 0;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${cleanedCount} expired statuses`,
        cleaned_count: cleanedCount,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in cleanup-statuses function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});