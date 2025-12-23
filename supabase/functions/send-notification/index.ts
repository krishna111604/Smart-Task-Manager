import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "task_assigned" | "due_date_reminder";
  taskId: string;
  recipientEmail: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: string;
  assignedBy?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, taskId, recipientEmail, taskTitle, taskDescription, dueDate, assignedBy }: NotificationRequest = await req.json();

    console.log(`Processing notification: type=${type}, taskId=${taskId}, recipient=${recipientEmail}`);

    if (!recipientEmail || !taskTitle) {
      console.error("Missing required fields: recipientEmail or taskTitle");
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipientEmail and taskTitle are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let subject: string;
    let htmlContent: string;

    if (type === "task_assigned") {
      subject = `You've been assigned a new task: ${taskTitle}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .task-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .task-title { font-size: 18px; font-weight: 600; color: #111; margin-bottom: 10px; }
            .task-description { color: #666; margin-bottom: 15px; }
            .due-date { display: inline-block; background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
            .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📋 New Task Assigned</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You've been assigned a new task${assignedBy ? ` by ${assignedBy}` : ''}.</p>
              
              <div class="task-card">
                <div class="task-title">${taskTitle}</div>
                ${taskDescription ? `<div class="task-description">${taskDescription}</div>` : ''}
                ${dueDate ? `<div class="due-date">📅 Due: ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
              </div>
              
              <p>Please log in to the Smart Task Manager to view and manage this task.</p>
              
              <div class="footer">
                <p>Smart Task Manager - Intelligent Task Classification</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "due_date_reminder") {
      subject = `⏰ Reminder: Task "${taskTitle}" is due soon`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .task-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #ef4444; }
            .task-title { font-size: 18px; font-weight: 600; color: #111; margin-bottom: 10px; }
            .task-description { color: #666; margin-bottom: 15px; }
            .due-date { display: inline-block; background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
            .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⏰ Task Due Date Reminder</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>This is a friendly reminder that the following task is due soon:</p>
              
              <div class="task-card">
                <div class="task-title">${taskTitle}</div>
                ${taskDescription ? `<div class="task-description">${taskDescription}</div>` : ''}
                ${dueDate ? `<div class="due-date">📅 Due: ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
              </div>
              
              <p>Please log in to the Smart Task Manager to complete this task before the deadline.</p>
              
              <div class="footer">
                <p>Smart Task Manager - Intelligent Task Classification</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      console.error("Invalid notification type:", type);
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending email to ${recipientEmail} with subject: ${subject}`);

    const emailResponse = await resend.emails.send({
      from: "Smart Task Manager <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
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
