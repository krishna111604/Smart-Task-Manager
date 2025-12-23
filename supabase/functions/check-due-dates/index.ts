import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  assigned_to: string | null;
  created_by: string | null;
  status: string;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting due date check job...");

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the time window: tasks due within 24-25 hours from now
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log(`Checking for tasks due between ${in24Hours.toISOString()} and ${in25Hours.toISOString()}`);

    // Fetch tasks that are due within the next 24-25 hours and not completed
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, description, due_date, assigned_to, created_by, status")
      .gte("due_date", in24Hours.toISOString())
      .lt("due_date", in25Hours.toISOString())
      .neq("status", "completed");

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      console.log("No tasks due in the next 24 hours");
      return new Response(
        JSON.stringify({ message: "No tasks due in the next 24 hours", count: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${tasks.length} tasks due in the next 24 hours`);

    // Get unique user IDs (both assigned_to and created_by)
    const userIds = new Set<string>();
    tasks.forEach((task: Task) => {
      if (task.assigned_to) userIds.add(task.assigned_to);
      if (task.created_by) userIds.add(task.created_by);
    });

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", Array.from(userIds));

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const profileMap = new Map<string, Profile>();
    profiles?.forEach((profile: Profile) => {
      profileMap.set(profile.id, profile);
    });

    let emailsSent = 0;
    const errors: string[] = [];

    // Send reminder emails for each task
    for (const task of tasks) {
      // Determine who to notify - prefer assigned_to, fall back to created_by
      const notifyUserId = task.assigned_to || task.created_by;
      
      if (!notifyUserId) {
        console.log(`Task ${task.id} has no assigned user or creator, skipping`);
        continue;
      }

      const profile = profileMap.get(notifyUserId);
      
      if (!profile?.email) {
        console.log(`No email found for user ${notifyUserId}, skipping task ${task.id}`);
        continue;
      }

      const dueDate = new Date(task.due_date);
      const formattedDueDate = dueDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      console.log(`Sending reminder for task "${task.title}" to ${profile.email}`);

      try {
        const emailResponse = await resend.emails.send({
          from: "Smart Task Manager <onboarding@resend.dev>",
          to: [profile.email],
          subject: `⏰ Reminder: "${task.title}" is due in 24 hours`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
                .task-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #f59e0b; }
                .task-title { font-size: 20px; font-weight: 600; color: #111; margin-bottom: 10px; }
                .task-description { color: #666; margin-bottom: 15px; font-size: 14px; }
                .due-date { display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }
                .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
                .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-top: 20px; }
                .warning-text { color: #92400e; font-size: 14px; margin: 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">⏰ Task Due Soon!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">This task is due in approximately 24 hours</p>
                </div>
                <div class="content">
                  <p>Hi${profile.full_name ? ` ${profile.full_name}` : ''},</p>
                  <p>This is a friendly reminder that you have a task due soon:</p>
                  
                  <div class="task-card">
                    <div class="task-title">${task.title}</div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    <div class="due-date">📅 Due: ${formattedDueDate}</div>
                  </div>
                  
                  <div class="warning">
                    <p class="warning-text">⚡ <strong>Action Required:</strong> Please complete this task before the deadline to keep your workflow on track.</p>
                  </div>
                  
                  <p style="margin-top: 25px;">Log in to the Smart Task Manager to view and complete this task.</p>
                  
                  <div class="footer">
                    <p>Smart Task Manager - Intelligent Task Classification</p>
                    <p style="color: #d1d5db; font-size: 11px;">You received this email because you have a task due soon.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log(`Email sent successfully for task ${task.id}:`, emailResponse);
        emailsSent++;
      } catch (emailError: any) {
        console.error(`Failed to send email for task ${task.id}:`, emailError);
        errors.push(`Task ${task.id}: ${emailError.message}`);
      }
    }

    console.log(`Due date check completed. Sent ${emailsSent} reminder emails.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${emailsSent} reminder emails`,
        tasksChecked: tasks.length,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-due-dates function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
