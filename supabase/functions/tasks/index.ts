import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Classification keywords for auto-categorization
const categoryKeywords: Record<string, string[]> = {
  scheduling: ['meeting', 'schedule', 'calendar', 'appointment', 'call', 'deadline', 'today', 'tomorrow', 'weekly', 'daily'],
  finance: ['budget', 'invoice', 'payment', 'expense', 'cost', 'price', 'money', 'financial', 'revenue', 'profit'],
  technical: ['bug', 'fix', 'deploy', 'code', 'server', 'database', 'api', 'error', 'update', 'software'],
  safety: ['safety', 'hazard', 'compliance', 'inspection', 'ppe', 'emergency', 'risk', 'incident', 'audit'],
};

const priorityKeywords: Record<string, string[]> = {
  high: ['urgent', 'critical', 'asap', 'immediately', 'emergency', 'priority', 'important', 'crucial'],
  medium: ['soon', 'moderate', 'normal', 'standard'],
  low: ['whenever', 'eventually', 'low priority', 'minor', 'optional'],
};

function classifyTask(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  
  // Classify category
  let category = 'general';
  let maxScore = 0;
  
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      category = cat;
    }
  }
  
  // Classify priority
  let priority = 'medium';
  for (const [pri, keywords] of Object.entries(priorityKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      priority = pri;
      break;
    }
  }
  
  // Extract entities
  const extracted_entities = {
    people: text.match(/(?:contact|call|meet|email)\s+([a-z]+(?:\s+[a-z]+)?)/gi) || [],
    dates: text.match(/(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)/gi) || [],
  };
  
  // Suggested actions based on category
  const suggestedActionsMap: Record<string, string[]> = {
    scheduling: ['Add to calendar', 'Send invite', 'Set reminder'],
    finance: ['Review budget', 'Send invoice', 'Approve payment'],
    technical: ['Create ticket', 'Code review', 'Deploy fix'],
    safety: ['File report', 'Schedule inspection', 'Update documentation'],
    general: ['Add notes', 'Set deadline', 'Assign team member'],
  };
  
  return {
    category,
    priority,
    extracted_entities,
    suggested_actions: suggestedActionsMap[category] || suggestedActionsMap.general,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const taskId = url.searchParams.get('id');

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET': {
        if (taskId) {
          // Get single task with history
          const { data: task, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { data: history } = await supabase
            .from('task_history')
            .select('*')
            .eq('task_id', taskId)
            .order('changed_at', { ascending: false });

          return new Response(
            JSON.stringify({ task, history }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Get all tasks with filters
          const status = url.searchParams.get('status');
          const category = url.searchParams.get('category');
          const priority = url.searchParams.get('priority');
          const search = url.searchParams.get('search');

          let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });

          if (status) query = query.eq('status', status);
          if (category) query = query.eq('category', category);
          if (priority) query = query.eq('priority', priority);
          if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

          const { data: tasks, error } = await query;

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ tasks }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'POST': {
        const body = await req.json();
        const { title, description, category, priority, assigned_to, due_date } = body;

        if (!title || !description) {
          return new Response(
            JSON.stringify({ error: 'Title and description are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const classification = classifyTask(title, description);

        const taskData = {
          title,
          description,
          category: category || classification.category,
          priority: priority || classification.priority,
          status: 'pending',
          assigned_to: assigned_to || null,
          due_date: due_date || null,
          extracted_entities: classification.extracted_entities,
          suggested_actions: classification.suggested_actions,
          created_by: user.id,
        };

        const { data: task, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (error) {
          console.error('Error creating task:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Task created:', task.id);
        return new Response(
          JSON.stringify({ task }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'PATCH': {
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: 'Task ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        
        const { data: task, error } = await supabase
          .from('tasks')
          .update(body)
          .eq('id', taskId)
          .select()
          .single();

        if (error) {
          console.error('Error updating task:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Task updated:', task.id);
        return new Response(
          JSON.stringify({ task }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'DELETE': {
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: 'Task ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);

        if (error) {
          console.error('Error deleting task:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Task deleted:', taskId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
