import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AnniversaryUser {
  id: string;
  email: string;
  full_name: string;
  join_date: string;
  last_notified_month: number;
}

interface Event {
  month_number: number;
  title: string;
  agenda: string;
  zoom_link: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find employees with 30-day anniversaries today
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, join_date, last_notified_month")
      .eq("role", "employee")
      .not("join_date", "is", null);

    if (usersError) throw usersError;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const anniversaryUsers: AnniversaryUser[] = (users || []).filter((user) => {
      if (!user.join_date) return false;
      if (user.join_date === todayStr) return false; // Exclude day 0

      const joinDate = new Date(user.join_date);
      const daysDiff = Math.floor(
        (today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const monthNumber = Math.floor(daysDiff / 30);

      // Check if it's a 30-day multiple AND hasn't been notified for this month
      return (
        daysDiff > 0 &&
        daysDiff % 30 === 0 &&
        (user.last_notified_month || 0) < monthNumber
      );
    });

    console.log(
      `Found ${anniversaryUsers.length} users with anniversaries today`,
    );

    const results = {
      total: anniversaryUsers.length,
      success: 0,
      failure: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each anniversary user
    for (const user of anniversaryUsers) {
      try {
        const joinDate = new Date(user.join_date);
        const daysDiff = Math.floor(
          (today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        const monthNumber = Math.floor(daysDiff / 30);

        console.log(`Processing ${user.email}: Month ${monthNumber}`);

        // Idempotency check - skip if already notified for this month
        if ((user.last_notified_month || 0) >= monthNumber) {
          console.log(
            `⏭ Skipping ${user.email}: Already notified for month ${monthNumber}`,
          );
          results.skipped++;
          continue;
        }

        // Fetch the corresponding event
        const { data: event, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("month_number", monthNumber)
          .single();

        if (eventError || !event) {
          throw new Error(`No event found for month ${monthNumber}`);
        }

        // Prepare email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .month-badge { display: inline-block; background: #667eea; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-bottom: 20px; }
    .agenda { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
    .agenda h3 { margin-top: 0; color: #667eea; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .cta-button:hover { background: #5a67d8; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Month ${monthNumber} Milestone!</h1>
    <p>Your Project 36 Live Sync is Today</p>
  </div>
  
  <div class="content">
    <p>Hi ${user.full_name},</p>
    
    <p>Congratulations on reaching <strong>Month ${monthNumber}</strong> of your learning journey with TanTech! 🚀</p>
    
    <div class="month-badge">Month ${monthNumber} of 36</div>
    
    <p>Your monthly live sync session is scheduled for <strong>today</strong>. This is a great opportunity to:</p>
    <ul>
      <li>Review your progress and celebrate achievements</li>
      <li>Connect with mentors and peers</li>
      <li>Get guidance on upcoming modules</li>
      <li>Ask questions and share learnings</li>
    </ul>
    
    <div class="agenda">
      <h3>📋 Today's Agenda</h3>
      <p><strong>${event.title}</strong></p>
      <p>${event.agenda || "Interactive session with your learning cohort"}</p>
    </div>
    
    <p><strong>Join the session:</strong></p>
    <a href="${event.zoom_link}" class="cta-button">Join Zoom Meeting</a>
    
    <p style="margin-top: 30px;">Looking forward to seeing you there!</p>
    
    <p>Best regards,<br>
    <strong>TanTech Learning Team</strong></p>
  </div>
  
  <div class="footer">
    <p>TanTech Upskill Platform | Project 36</p>
    <p>You're receiving this because it's your ${monthNumber}-month learning anniversary.</p>
  </div>
</body>
</html>
        `;

        // Send email via Resend
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "TanTech Learning <noreply@tantech.com>",
            to: [user.email],
            subject: `Project 36 — Month ${monthNumber} Live Sync is Today!`,
            html: emailHtml,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        // Update last_notified_month for idempotency
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ last_notified_month: monthNumber })
          .eq("id", user.id);

        if (updateError) {
          console.warn(
            `Warning: Failed to update last_notified_month for ${user.email}`,
          );
        }

        // Log success
        await supabase.from("cron_logs").insert({
          job_name: "anniversary-cron",
          user_id: user.id,
          user_email: user.email,
          status: "success",
          month_number: monthNumber,
          metadata: { event_id: event.id, event_title: event.title },
        });

        results.success++;
        console.log(`✓ Email sent to ${user.email}`);
      } catch (err) {
        console.error(`✗ Failed for ${user.email}:`, err);

        // Log failure
        await supabase.from("cron_logs").insert({
          job_name: "anniversary-cron",
          user_id: user.id,
          user_email: user.email,
          status: "failure",
          month_number: null,
          error_message: err.message,
        });

        results.failure++;
        results.errors.push(`${user.email}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.total} anniversary users`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
