-- Migration: rename_legacy_brand_identifiers
-- Purpose: Finish the product rename inside the database.
--
--   1. The transaction-local setting that lets replace_historical_work_order_timeline()
--      suppress the status-history trigger is renamed to
--      znteqr.skip_work_order_status_log. The function that sets it and the
--      trigger function that reads it are replaced together in this one
--      transaction, so they can never disagree.
--   2. Object comments that still named the previous product or its old domain
--      are rewritten.
--
-- No table, column, policy, grant or data changes. CREATE OR REPLACE keeps the
-- existing owner and EXECUTE privileges of both functions.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Functions that share the renamed setting
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."log_work_order_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  changed_by_user uuid;
BEGIN
  IF current_setting('znteqr.skip_work_order_status_log', true) = 'true' THEN
    RETURN NEW;
  END IF;

  changed_by_user := auth.uid();

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.work_order_status_history
      WHERE work_order_id = NEW.id
        AND old_status IS NULL
        AND new_status = NEW.status
    ) THEN
      INSERT INTO public.work_order_status_history (
        work_order_id, old_status, new_status, changed_by, reason
      ) VALUES (
        NEW.id, OLD.status, NEW.status, changed_by_user, 'Status updated'
      );
    END IF;

    PERFORM public.create_work_order_notifications(NEW.id, NEW.status::text, changed_by_user);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."replace_historical_work_order_timeline"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_work_order public.work_orders%ROWTYPE;
  v_event jsonb;
  v_event_count integer;
  v_index integer;
  v_previous_status public.work_order_status;
  v_old_status public.work_order_status;
  v_new_status public.work_order_status;
  v_changed_at timestamptz;
  v_reason text;
  v_assignee_id uuid;
  v_allowed public.work_order_status[];
  v_last_changed_at timestamptz;
  v_acceptance_date timestamptz;
  v_completed_date timestamptz;
  v_assignee public.work_orders.assignee_id%TYPE;
  v_metadata jsonb;
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is required');
  END IF;

  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT *
  INTO v_work_order
  FROM public.work_orders
  WHERE id = p_work_order_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;

  IF NOT v_work_order.is_historical THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeline editing is only allowed for historical work orders');
  END IF;

  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' OR jsonb_array_length(p_events) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeline events are required');
  END IF;

  v_event_count := jsonb_array_length(p_events);
  v_previous_status := NULL;
  v_last_changed_at := NULL;
  v_acceptance_date := NULL;
  v_completed_date := NULL;
  v_assignee := NULL;

  FOR v_index IN 0..(v_event_count - 1) LOOP
    v_event := p_events -> v_index;
    v_old_status := NULLIF(v_event ->> 'old_status', '')::public.work_order_status;
    v_new_status := NULLIF(v_event ->> 'new_status', '')::public.work_order_status;
    v_changed_at := NULLIF(v_event ->> 'changed_at', '')::timestamptz;
    v_reason := NULLIF(v_event ->> 'reason', '');
    v_assignee_id := NULLIF(v_event ->> 'assignee_id', '')::uuid;

    IF v_new_status IS NULL OR v_changed_at IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Each timeline event requires new_status and changed_at');
    END IF;

    IF v_index = 0 AND v_new_status <> 'submitted' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Timeline must begin with submitted');
    END IF;

    IF v_old_status IS DISTINCT FROM v_previous_status THEN
      RETURN jsonb_build_object('success', false, 'error', 'Timeline event chain is inconsistent');
    END IF;

    IF v_previous_status IS NULL THEN
      IF v_old_status IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'First timeline event must start from created state');
      END IF;
    ELSE
      v_allowed := public.historical_timeline_allowed_next_statuses(v_previous_status);
      IF NOT (v_new_status = ANY (v_allowed)) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Invalid transition from %s to %s', v_previous_status, v_new_status)
        );
      END IF;
    END IF;

    IF v_new_status = 'assigned' AND v_assignee_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Assigned events require an assignee');
    END IF;

    IF v_assignee_id IS NOT NULL
       AND NOT public.is_valid_work_order_assignee(
         v_work_order.equipment_id,
         v_work_order.organization_id,
         v_assignee_id
       ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Assignee is not valid for this work order');
    END IF;

    IF v_last_changed_at IS NOT NULL AND v_changed_at < v_last_changed_at THEN
      RETURN jsonb_build_object('success', false, 'error', 'Timeline events must be in chronological order');
    END IF;

    IF v_new_status = 'accepted'
       OR (v_new_status IN ('assigned', 'in_progress') AND v_assignee_id IS NOT NULL) THEN
      v_acceptance_date := COALESCE(v_acceptance_date, v_changed_at);
    END IF;

    IF v_new_status = 'assigned' AND v_assignee_id IS NOT NULL THEN
      v_assignee := v_assignee_id;
    END IF;

    IF v_new_status = 'completed' THEN
      v_completed_date := v_changed_at;
    ELSIF v_new_status IN ('submitted', 'accepted', 'assigned', 'in_progress', 'on_hold') THEN
      v_completed_date := NULL;
    END IF;

    v_previous_status := v_new_status;
    v_last_changed_at := v_changed_at;
  END LOOP;

  DELETE FROM public.work_order_status_history
  WHERE work_order_id = p_work_order_id;

  v_previous_status := NULL;

  FOR v_index IN 0..(v_event_count - 1) LOOP
    v_event := p_events -> v_index;
    v_old_status := NULLIF(v_event ->> 'old_status', '')::public.work_order_status;
    v_new_status := NULLIF(v_event ->> 'new_status', '')::public.work_order_status;
    v_changed_at := NULLIF(v_event ->> 'changed_at', '')::timestamptz;
    v_reason := COALESCE(NULLIF(v_event ->> 'reason', ''), 'Historical status recorded');
    v_assignee_id := NULLIF(v_event ->> 'assignee_id', '')::uuid;

    v_metadata := '{}'::jsonb;
    IF v_new_status = 'assigned' AND v_assignee_id IS NOT NULL THEN
      v_metadata := jsonb_build_object('assignee_id', v_assignee_id);
    END IF;

    INSERT INTO public.work_order_status_history (
      work_order_id,
      old_status,
      new_status,
      changed_by,
      changed_at,
      reason,
      metadata,
      is_historical_creation
    ) VALUES (
      p_work_order_id,
      v_old_status,
      v_new_status,
      auth.uid(),
      v_changed_at,
      v_reason,
      v_metadata,
      true
    );

    v_previous_status := v_new_status;
  END LOOP;

  PERFORM set_config('znteqr.skip_work_order_status_log', 'true', true);

  UPDATE public.work_orders
  SET
    status = v_previous_status,
    assignee_id = v_assignee,
    created_date = (p_events -> 0 ->> 'changed_at')::timestamptz,
    historical_start_date = (p_events -> 0 ->> 'changed_at')::timestamptz,
    acceptance_date = v_acceptance_date,
    completed_date = v_completed_date,
    updated_at = NOW()
  WHERE id = p_work_order_id;

  PERFORM set_config('znteqr.skip_work_order_status_log', 'false', true);

  IF NOT p_skip_audit THEN
    PERFORM public.log_audit_entry(
      v_work_order.organization_id,
      'work_order',
      p_work_order_id,
      v_work_order.title,
      'UPDATE',
      jsonb_build_object(
        'timeline', jsonb_build_object(
          'old', NULL,
          'new', jsonb_build_object('event_count', v_event_count)
        )
      ),
      jsonb_build_object(
        'timeline_replaced', true,
        'event_count', v_event_count,
        'source', 'historical_timeline_editor'
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'work_order_id', p_work_order_id,
    'event_count', v_event_count,
    'status', v_previous_status
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('znteqr.skip_work_order_status_log', 'false', true);
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to replace historical timeline: ' || SQLERRM
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Comments
-- ---------------------------------------------------------------------------

COMMENT ON SCHEMA "public" IS 'ZNTEQR application schema. SECURITY DEFINER EXECUTE grants follow docs/ops/security-definer-rpc-policy.md (issues #762, #1310).';

COMMENT ON TABLE "public"."external_customer_contacts" IS 'External contacts for a customer account — people who do not have ZNTEQR logins (site managers, billing contacts, dispatchers, etc.).';

COMMENT ON COLUMN "public"."external_customer_contacts"."source" IS 'Origin of this contact row: "manual" (entered in ZNTEQR) or "quickbooks" (synced from QBO Customer).';

COMMENT ON FUNCTION "public"."list_active_stripe_subscriptions"() IS 'Returns active/trialing/past-due Stripe subscriptions joined to their customers. Reads from the materialized view public.org_active_stripe_subscriptions (refreshed every 15 minutes by the refresh-stripe-mvs cron job). The stripe.* foreign tables are private; this SECURITY DEFINER function is GRANTed only to service_role until ZNTEQR reintroduces an org → Stripe customer mapping. Server-side Edge Functions invoke it with the service role key and apply any tenant filtering themselves. Returns empty when the FDW pilot has not yet been provisioned (Section B of the Change Record on issue #722).';

COMMENT ON COLUMN "public"."customers"."quickbooks_tax_status_synced_at" IS 'Timestamp when ZNTEQR last confirmed QuickBooks Customer.Taxable for is_tax_exempt cache freshness.';

COMMENT ON COLUMN "public"."quickbooks_oauth_sessions"."origin_url" IS 'The origin URL (e.g., http://localhost:5173 or https://eqr.zinitek.com) to redirect back to after OAuth completes.';

COMMENT ON TABLE "public"."quickbooks_team_customers" IS 'Maps ZNTEQR teams to QuickBooks Online customers. Used for invoice export to associate work orders with the correct QuickBooks customer.';

COMMIT;
