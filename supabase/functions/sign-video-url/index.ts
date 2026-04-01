import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import * as jwt from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const { module_id } = await req.json();
    if (!module_id) {
      return new Response(
        JSON.stringify({ error: "module_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client (service role to bypass RLS for module lookup)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the module and its video_local_path
    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .select("video_local_path, course_id")
      .eq("id", module_id)
      .single();

    if (moduleError || !module) {
      return new Response(
        JSON.stringify({ error: "Module not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!module.video_local_path) {
      return new Response(
        JSON.stringify({ error: "No video available for this module" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is enrolled in the course (authorization)
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", module.course_id)
      .single();

    if (!enrollment) {
      return new Response(
        JSON.stringify({ error: "Not enrolled in this course" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a short-lived JWT token for the file server
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET");
    if (!jwtSecret) {
      throw new Error("SUPABASE_JWT_SECRET not configured");
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const payload = {
      filePath: module.video_local_path,
      userId: user.id,
      moduleId: module_id,
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours
      iat: Math.floor(Date.now() / 1000),
    };

    const videoToken = await jwt.create(
      { alg: "HS256", typ: "JWT" },
      payload,
      key
    );

    // Return the signed token and file path
    return new Response(
      JSON.stringify({
        token: videoToken,
        filePath: module.video_local_path,
        expiresIn: 7200, // seconds
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
