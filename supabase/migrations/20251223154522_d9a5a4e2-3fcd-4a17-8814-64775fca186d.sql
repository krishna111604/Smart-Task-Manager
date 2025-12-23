-- Drop the existing foreign key constraint
ALTER TABLE public.task_history 
DROP CONSTRAINT IF EXISTS task_history_task_id_fkey;

-- Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.task_history
ADD CONSTRAINT task_history_task_id_fkey 
FOREIGN KEY (task_id) 
REFERENCES public.tasks(id) 
ON DELETE CASCADE;

-- Also need to update the trigger to not try to insert on delete
-- since the cascade will handle the cleanup
DROP TRIGGER IF EXISTS task_changes_trigger ON public.tasks;

-- Recreate the trigger function to handle deletes properly
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
  action_type task_action;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    INSERT INTO public.task_history (task_id, action, new_value, changed_by)
    VALUES (NEW.id, action_type, to_jsonb(NEW), NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'completed' THEN
        action_type := 'completed';
      ELSE
        action_type := 'status_changed';
      END IF;
    ELSE
      action_type := 'updated';
    END IF;
    INSERT INTO public.task_history (task_id, action, old_value, new_value, changed_by)
    VALUES (NEW.id, action_type, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Don't log deletes since cascade will clean up task_history anyway
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger for INSERT and UPDATE only (not DELETE)
CREATE TRIGGER task_changes_trigger
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_changes();