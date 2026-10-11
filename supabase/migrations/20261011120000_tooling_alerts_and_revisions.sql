-- Tooling batch 2: life / quarantine notifications and drawing revision history.
--
-- * Notifications: when a tool crosses its warning threshold, reaches its hard
--   life limit, or is quarantined, notify org owners/admins and the tool's
--   responsible person through the existing notifications table (realtime +
--   push delivery are handled by the existing broadcast trigger).
-- * Drawing revisions: an append-only revision register per tool. Releasing a
--   revision supersedes the previous one and updates the tool's current
--   drawing fields in the same transaction.

BEGIN;

-- ---------------------------------------------------------------------------
-- Notification types
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
    'work_order_request', 'work_order_accepted', 'work_order_assigned', 'work_order_completed',
    'work_order_submitted', 'work_order_in_progress', 'work_order_on_hold', 'work_order_cancelled',
    'general', 'ownership_transfer_request', 'ownership_transfer_accepted', 'ownership_transfer_rejected',
    'ownership_transfer_cancelled', 'member_removed', 'workspace_migration', 'workspace_merge_request',
    'workspace_merge_accepted', 'workspace_merge_rejected', 'member_added', 'member_role_changed',
    'team_member_added', 'team_member_role_changed', 'audit_export', 'export_ready',
    'tooling_life_warning', 'tooling_life_limit', 'tooling_quarantined'
  ]::text[]));

CREATE FUNCTION public.tooling_notify_state_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_type text;
  v_title text;
  v_message text;
  v_name text;
  v_code text;
  v_old_limit boolean;
  v_new_limit boolean;
  v_old_warning boolean;
  v_new_warning boolean;
BEGIN
  v_old_limit := OLD.life_limit IS NOT NULL AND OLD.cumulative_usage >= OLD.life_limit;
  v_new_limit := NEW.life_limit IS NOT NULL AND NEW.cumulative_usage >= NEW.life_limit;
  v_old_warning := OLD.warning_limit IS NOT NULL AND OLD.cumulative_usage >= OLD.warning_limit;
  v_new_warning := NEW.warning_limit IS NOT NULL AND NEW.cumulative_usage >= NEW.warning_limit;

  -- Fire only on entering a state, so repeated usage entries do not spam.
  IF v_new_limit AND NOT v_old_limit THEN
    v_type := 'tooling_life_limit';
  ELSIF v_new_warning AND NOT v_old_warning AND NOT v_new_limit THEN
    v_type := 'tooling_life_warning';
  ELSIF NEW.usability_state = 'quarantined' AND OLD.usability_state IS DISTINCT FROM 'quarantined' THEN
    v_type := 'tooling_quarantined';
  ELSE
    RETURN NEW;
  END IF;

  SELECT e.name, e.management_code INTO v_name, v_code FROM public.equipment AS e WHERE e.id = NEW.equipment_id;

  v_title := CASE v_type
    WHEN 'tooling_life_limit' THEN 'Tool life limit reached'
    WHEN 'tooling_life_warning' THEN 'Tool life warning'
    ELSE 'Tool quarantined'
  END;
  v_message := CASE v_type
    WHEN 'tooling_life_limit' THEN format('%s (%s) reached its life limit (%s / %s %s). A disposition is required before it can be issued again.',
      v_name, COALESCE(v_code, '-'), NEW.cumulative_usage, NEW.life_limit, NEW.usage_unit)
    WHEN 'tooling_life_warning' THEN format('%s (%s) reached its warning threshold (%s / %s %s).',
      v_name, COALESCE(v_code, '-'), NEW.cumulative_usage, NEW.warning_limit, NEW.usage_unit)
    ELSE format('%s (%s) was quarantined and cannot be issued until it is inspected and released.',
      v_name, COALESCE(v_code, '-'))
  END;

  INSERT INTO public.notifications (organization_id, user_id, type, title, message, data)
  SELECT NEW.organization_id, recipients.user_id, v_type, v_title, v_message,
         jsonb_build_object(
           'tooling_id', NEW.equipment_id,
           'equipment_id', NEW.equipment_id,
           'management_code', v_code,
           'tool_name', v_name,
           'cumulative_usage', NEW.cumulative_usage,
           'warning_limit', NEW.warning_limit,
           'life_limit', NEW.life_limit,
           'usage_unit', NEW.usage_unit
         )
  FROM (
    SELECT om.user_id
    FROM public.organization_members AS om
    WHERE om.organization_id = NEW.organization_id
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
    UNION
    SELECT NEW.responsible_user_id
    WHERE NEW.responsible_user_id IS NOT NULL
      AND public.is_org_member(NEW.responsible_user_id, NEW.organization_id)
  ) AS recipients;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Notifications are best-effort; never block the tooling transaction.
  RAISE WARNING 'tooling_notify_state_changes failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.tooling_notify_state_changes() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_tooling_notify_state_changes
  AFTER UPDATE OF cumulative_usage, usability_state, life_limit, warning_limit ON public.tooling_details
  FOR EACH ROW EXECUTE FUNCTION public.tooling_notify_state_changes();

-- ---------------------------------------------------------------------------
-- Drawing revision register
-- ---------------------------------------------------------------------------
CREATE TABLE public.tooling_drawing_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tooling_equipment_id uuid NOT NULL,
  drawing_number text,
  revision text NOT NULL,
  effective_date date,
  change_description text NOT NULL,
  status text NOT NULL DEFAULT 'released',
  released_by uuid NOT NULL,
  released_by_name text,
  released_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  CONSTRAINT tooling_drawing_revisions_tool_fk FOREIGN KEY (tooling_equipment_id, organization_id)
    REFERENCES public.tooling_details(equipment_id, organization_id),
  CONSTRAINT tooling_drawing_revisions_status_check CHECK (status IN ('released', 'superseded')),
  CONSTRAINT tooling_drawing_revisions_revision_not_blank CHECK (length(btrim(revision)) > 0),
  CONSTRAINT tooling_drawing_revisions_description_not_blank CHECK (length(btrim(change_description)) > 0),
  CONSTRAINT tooling_drawing_revisions_superseded_shape CHECK ((status = 'superseded') = (superseded_at IS NOT NULL))
);

CREATE UNIQUE INDEX tooling_drawing_revisions_tool_revision_key
  ON public.tooling_drawing_revisions (tooling_equipment_id, upper(btrim(revision)));
CREATE UNIQUE INDEX tooling_drawing_revisions_one_released_key
  ON public.tooling_drawing_revisions (tooling_equipment_id)
  WHERE status = 'released';
CREATE INDEX idx_tooling_drawing_revisions_tool ON public.tooling_drawing_revisions (tooling_equipment_id, released_at DESC);
CREATE INDEX idx_tooling_drawing_revisions_org ON public.tooling_drawing_revisions (organization_id);

ALTER TABLE public.tooling_drawing_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tooling_drawing_revisions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.tooling_drawing_revisions FROM authenticated;
GRANT SELECT ON TABLE public.tooling_drawing_revisions TO authenticated;

CREATE POLICY tooling_drawing_revisions_members_select ON public.tooling_drawing_revisions
  FOR SELECT TO authenticated
  USING (public.is_org_member((SELECT auth.uid()), organization_id));

COMMENT ON TABLE public.tooling_drawing_revisions IS 'Append-only drawing revision register per tool. Written only by release_tooling_drawing_revision.';

ALTER TABLE public.tooling_events DROP CONSTRAINT tooling_events_type_check;
ALTER TABLE public.tooling_events
  ADD CONSTRAINT tooling_events_type_check CHECK (event_type IN (
    'registered', 'details_updated', 'approved', 'issued', 'returned', 'transferred',
    'usability_changed', 'limits_changed', 'limit_disposition', 'usage_corrected',
    'inspection_recorded', 'returned_to_service', 'compatibility_changed',
    'drawing_revision_released'
  ));

CREATE FUNCTION public.release_tooling_drawing_revision(
  p_tooling_id uuid,
  p_revision text,
  p_change_description text,
  p_drawing_number text DEFAULT NULL,
  p_effective_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'admin');
  v_id uuid;
  v_drawing text := COALESCE(NULLIF(btrim(p_drawing_number), ''), v_row.drawing_number);
  v_effective date := COALESCE(p_effective_date, CURRENT_DATE);
BEGIN
  IF length(btrim(COALESCE(p_revision, ''))) = 0 THEN
    RAISE EXCEPTION 'TOOLING_REVISION_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(COALESCE(p_change_description, ''))) = 0 THEN
    RAISE EXCEPTION 'TOOLING_REASON_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_row.usability_state = 'retired' THEN
    RAISE EXCEPTION 'TOOLING_RETIRED' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tooling_drawing_revisions
  SET status = 'superseded', superseded_at = now()
  WHERE tooling_equipment_id = p_tooling_id AND status = 'released';

  BEGIN
    INSERT INTO public.tooling_drawing_revisions (
      organization_id, tooling_equipment_id, drawing_number, revision, effective_date,
      change_description, released_by, released_by_name
    ) VALUES (
      v_row.organization_id, p_tooling_id, v_drawing, btrim(p_revision), v_effective,
      btrim(p_change_description), auth.uid(), public.tooling_actor_name(auth.uid())
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'TOOLING_REVISION_DUPLICATE' USING ERRCODE = '23505';
  END;

  UPDATE public.tooling_details
  SET drawing_number = v_drawing,
      drawing_revision = btrim(p_revision),
      revision_effective_date = v_effective
  WHERE equipment_id = p_tooling_id;

  PERFORM public.tooling_log_event(v_row, 'drawing_revision_released',
    v_row.drawing_revision, btrim(p_revision), NULL, p_change_description,
    jsonb_build_object('revision_id', v_id, 'drawing_number', v_drawing, 'effective_date', v_effective));
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.release_tooling_drawing_revision(uuid, text, text, text, date) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_tooling_drawing_revision(uuid, text, text, text, date) TO authenticated;
-- rpc-authenticated-grant-allowed: release_tooling_drawing_revision

COMMIT;
