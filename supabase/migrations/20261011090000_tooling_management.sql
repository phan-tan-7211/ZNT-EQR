-- Tooling / Jig / Fixture management (M1-M4).
--
-- Design notes
-- * `public.equipment` stays the canonical physical asset identity (management
--   code, QR, files, work orders, PM). A tool is an equipment row in the `TL`
--   equipment group plus one `tooling_details` row (1:1, PK = equipment_id).
-- * Tooling usability (available / quarantined / under repair / ...) is kept
--   separate from generic `equipment.status`.
-- * Product parts, production operations and tool designs are small org-scoped
--   master tables. Tool <-> product <-> operation <-> machine compatibility is
--   relational (one row per combination), never comma-separated ids.
-- * Child tables reference `(id, organization_id)` composite keys so a row can
--   never link records from two organizations. Equipment-typed references
--   (machines) are validated by trigger.
-- * Assignment, usage, verification and event history is append-only for
--   clients: authenticated users only get SELECT; every mutation goes through a
--   SECURITY DEFINER RPC that checks permissions, locks the tool row and writes
--   history in the same transaction.
-- * History tables use NO ACTION foreign keys to the tool, so a tool with
--   recorded history cannot be deleted (retire it instead), while organization
--   deletion still cascades in a single statement.
--
-- Permissions
-- * Read: active organization members.
-- * Master data, tool registration/approval, compatibility approval, limits,
--   usage corrections, dispositions and return-to-service: org owner/admin.
-- * Issue / return / transfer / usage entry / inspection / quarantine: org
--   owner/admin, or team roles granted `equipment.update` on the tool's team
--   (same configurable permission that governs editing the equipment record).

BEGIN;

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------
CREATE TABLE public.tooling_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  design_code text NOT NULL,
  name text NOT NULL,
  tooling_type text NOT NULL,
  drawing_number text,
  current_revision text,
  revision_effective_date date,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tooling_designs_type_check CHECK (tooling_type IN ('jig', 'fixture', 'mold', 'die', 'checking_fixture', 'general_tool')),
  CONSTRAINT tooling_designs_code_not_blank CHECK (length(btrim(design_code)) > 0),
  CONSTRAINT tooling_designs_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT tooling_designs_org_code_key UNIQUE (organization_id, design_code),
  CONSTRAINT tooling_designs_id_org_key UNIQUE (id, organization_id)
);

CREATE TABLE public.product_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  name text NOT NULL,
  customer_name text,
  revision text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_parts_number_not_blank CHECK (length(btrim(part_number)) > 0),
  CONSTRAINT product_parts_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT product_parts_org_number_key UNIQUE (organization_id, part_number),
  CONSTRAINT product_parts_id_org_key UNIQUE (id, organization_id)
);

CREATE TABLE public.production_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  operation_type text NOT NULL DEFAULT 'other',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_operations_type_check CHECK (operation_type IN ('welding', 'pressing', 'assembly', 'inspection', 'machining', 'molding', 'painting', 'other')),
  CONSTRAINT production_operations_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT production_operations_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT production_operations_org_code_key UNIQUE (organization_id, code),
  CONSTRAINT production_operations_id_org_key UNIQUE (id, organization_id)
);

-- ---------------------------------------------------------------------------
-- Tool instance details (1:1 with equipment)
-- ---------------------------------------------------------------------------
CREATE TABLE public.tooling_details (
  equipment_id uuid PRIMARY KEY REFERENCES public.equipment(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tooling_type text NOT NULL,
  design_id uuid,
  ownership_type text NOT NULL DEFAULT 'company',
  owner_name text,
  storage_location text,
  responsible_user_id uuid,
  condition text NOT NULL DEFAULT 'good',
  usability_state text NOT NULL DEFAULT 'available',
  approval_status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  requires_machine boolean NOT NULL DEFAULT true,
  drawing_number text,
  drawing_revision text,
  revision_effective_date date,
  usage_unit text NOT NULL DEFAULT 'cycles',
  warning_limit numeric,
  life_limit numeric,
  maintenance_interval numeric,
  inspection_interval_days integer,
  cumulative_usage numeric NOT NULL DEFAULT 0,
  usage_since_maintenance numeric NOT NULL DEFAULT 0,
  last_maintenance_at timestamptz,
  last_inspection_at timestamptz,
  next_inspection_due date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tooling_details_id_org_key UNIQUE (equipment_id, organization_id),
  CONSTRAINT tooling_details_design_fk FOREIGN KEY (design_id, organization_id)
    REFERENCES public.tooling_designs(id, organization_id),
  CONSTRAINT tooling_details_type_check CHECK (tooling_type IN ('jig', 'fixture', 'mold', 'die', 'checking_fixture', 'general_tool')),
  CONSTRAINT tooling_details_ownership_check CHECK (ownership_type IN ('company', 'customer', 'supplier', 'other')),
  CONSTRAINT tooling_details_condition_check CHECK (condition IN ('new', 'good', 'worn', 'damaged')),
  CONSTRAINT tooling_details_usability_check CHECK (usability_state IN ('available', 'quarantined', 'under_repair', 'pending_inspection', 'blocked', 'retired')),
  CONSTRAINT tooling_details_approval_check CHECK (approval_status IN ('pending', 'approved')),
  CONSTRAINT tooling_details_approval_stamp_check CHECK (approval_status = 'pending' OR approved_at IS NOT NULL),
  CONSTRAINT tooling_details_unit_check CHECK (usage_unit IN ('cycles', 'shots', 'strokes', 'pieces')),
  CONSTRAINT tooling_details_limits_positive CHECK (
    (warning_limit IS NULL OR warning_limit > 0)
    AND (life_limit IS NULL OR life_limit > 0)
    AND (maintenance_interval IS NULL OR maintenance_interval > 0)
    AND (inspection_interval_days IS NULL OR inspection_interval_days > 0)
  ),
  CONSTRAINT tooling_details_warning_le_life CHECK (warning_limit IS NULL OR life_limit IS NULL OR warning_limit <= life_limit),
  CONSTRAINT tooling_details_usage_non_negative CHECK (cumulative_usage >= 0 AND usage_since_maintenance >= 0)
);

CREATE INDEX idx_tooling_details_org_state ON public.tooling_details (organization_id, usability_state);
CREATE INDEX idx_tooling_details_design ON public.tooling_details (design_id) WHERE design_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Compatibility: tool <-> product part <-> operation <-> machine
-- ---------------------------------------------------------------------------
CREATE TABLE public.tooling_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tooling_equipment_id uuid NOT NULL,
  product_part_id uuid NOT NULL,
  operation_id uuid,
  machine_equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
  drawing_revision text,
  effective_from date,
  effective_to date,
  approval_status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tooling_compatibility_id_org_key UNIQUE (id, organization_id),
  CONSTRAINT tooling_compatibility_tool_fk FOREIGN KEY (tooling_equipment_id, organization_id)
    REFERENCES public.tooling_details(equipment_id, organization_id) ON DELETE CASCADE,
  CONSTRAINT tooling_compatibility_product_fk FOREIGN KEY (product_part_id, organization_id)
    REFERENCES public.product_parts(id, organization_id),
  CONSTRAINT tooling_compatibility_operation_fk FOREIGN KEY (operation_id, organization_id)
    REFERENCES public.production_operations(id, organization_id),
  CONSTRAINT tooling_compatibility_approval_check CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT tooling_compatibility_approval_stamp_check CHECK (approval_status = 'pending' OR approved_at IS NOT NULL),
  CONSTRAINT tooling_compatibility_dates_check CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  CONSTRAINT tooling_compatibility_not_self CHECK (machine_equipment_id IS DISTINCT FROM tooling_equipment_id)
);

-- One active rule per (tool, product, operation, machine); NULL operation or
-- machine (manual tooling) participates in the uniqueness check via the
-- all-zero sentinel (portable equivalent of NULLS NOT DISTINCT).
CREATE UNIQUE INDEX tooling_compatibility_active_combo_key
  ON public.tooling_compatibility (
    tooling_equipment_id,
    product_part_id,
    COALESCE(operation_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(machine_equipment_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE is_active;

CREATE INDEX idx_tooling_compatibility_tool ON public.tooling_compatibility (tooling_equipment_id, is_active);
CREATE INDEX idx_tooling_compatibility_product ON public.tooling_compatibility (product_part_id);
CREATE INDEX idx_tooling_compatibility_operation ON public.tooling_compatibility (operation_id) WHERE operation_id IS NOT NULL;
CREATE INDEX idx_tooling_compatibility_machine ON public.tooling_compatibility (machine_equipment_id) WHERE machine_equipment_id IS NOT NULL;
CREATE INDEX idx_tooling_compatibility_org ON public.tooling_compatibility (organization_id);

-- ---------------------------------------------------------------------------
-- Issue / return assignments
-- ---------------------------------------------------------------------------
CREATE TABLE public.tooling_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tooling_equipment_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  issued_to_user_id uuid NOT NULL,
  issued_to_name text,
  issued_by uuid NOT NULL,
  issued_by_name text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  machine_equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL,
  product_part_id uuid,
  operation_id uuid,
  compatibility_id uuid REFERENCES public.tooling_compatibility(id) ON DELETE SET NULL,
  issue_location text,
  condition_at_issue text NOT NULL,
  notes text,
  returned_at timestamptz,
  returned_by uuid,
  returned_by_name text,
  return_location text,
  condition_at_return text,
  usage_at_return numeric,
  return_notes text,
  CONSTRAINT tooling_assignments_tool_fk FOREIGN KEY (tooling_equipment_id, organization_id)
    REFERENCES public.tooling_details(equipment_id, organization_id),
  CONSTRAINT tooling_assignments_product_fk FOREIGN KEY (product_part_id, organization_id)
    REFERENCES public.product_parts(id, organization_id),
  CONSTRAINT tooling_assignments_operation_fk FOREIGN KEY (operation_id, organization_id)
    REFERENCES public.production_operations(id, organization_id),
  CONSTRAINT tooling_assignments_status_check CHECK (status IN ('active', 'returned')),
  CONSTRAINT tooling_assignments_return_shape CHECK (
    (status = 'active' AND returned_at IS NULL)
    OR (status = 'returned' AND returned_at IS NOT NULL AND condition_at_return IS NOT NULL)
  ),
  CONSTRAINT tooling_assignments_condition_check CHECK (
    condition_at_issue IN ('new', 'good', 'worn', 'damaged')
    AND (condition_at_return IS NULL OR condition_at_return IN ('new', 'good', 'worn', 'damaged'))
  )
);

-- Concurrency guard: at most one active checkout per physical tool.
CREATE UNIQUE INDEX tooling_assignments_one_active_key
  ON public.tooling_assignments (tooling_equipment_id)
  WHERE status = 'active';

CREATE INDEX idx_tooling_assignments_tool_issued ON public.tooling_assignments (tooling_equipment_id, issued_at DESC);
CREATE INDEX idx_tooling_assignments_org_status ON public.tooling_assignments (organization_id, status);
CREATE INDEX idx_tooling_assignments_holder ON public.tooling_assignments (issued_to_user_id) WHERE status = 'active';
CREATE INDEX idx_tooling_assignments_machine ON public.tooling_assignments (machine_equipment_id) WHERE machine_equipment_id IS NOT NULL;
CREATE INDEX idx_tooling_assignments_compat ON public.tooling_assignments (compatibility_id) WHERE compatibility_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Usage ledger (cycles / shots / strokes / pieces)
-- ---------------------------------------------------------------------------
CREATE TABLE public.tooling_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tooling_equipment_id uuid NOT NULL,
  entry_type text NOT NULL,
  quantity numeric NOT NULL,
  usage_unit text NOT NULL,
  production_quantity numeric,
  assignment_id uuid REFERENCES public.tooling_assignments(id),
  cumulative_after numeric NOT NULL,
  reason text,
  recorded_by uuid NOT NULL,
  recorded_by_name text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tooling_usage_logs_tool_fk FOREIGN KEY (tooling_equipment_id, organization_id)
    REFERENCES public.tooling_details(equipment_id, organization_id),
  CONSTRAINT tooling_usage_logs_type_check CHECK (entry_type IN ('usage', 'correction')),
  CONSTRAINT tooling_usage_logs_quantity_check CHECK (quantity <> 0 AND (entry_type = 'correction' OR quantity > 0)),
  CONSTRAINT tooling_usage_logs_reason_check CHECK (entry_type = 'usage' OR length(btrim(coalesce(reason, ''))) > 0),
  CONSTRAINT tooling_usage_logs_unit_check CHECK (usage_unit IN ('cycles', 'shots', 'strokes', 'pieces')),
  CONSTRAINT tooling_usage_logs_production_check CHECK (production_quantity IS NULL OR production_quantity >= 0),
  CONSTRAINT tooling_usage_logs_cumulative_check CHECK (cumulative_after >= 0)
);

CREATE INDEX idx_tooling_usage_logs_tool ON public.tooling_usage_logs (tooling_equipment_id, recorded_at DESC);
CREATE INDEX idx_tooling_usage_logs_org ON public.tooling_usage_logs (organization_id);
CREATE INDEX idx_tooling_usage_logs_assignment ON public.tooling_usage_logs (assignment_id) WHERE assignment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Inspections / verifications / return-to-service
-- ---------------------------------------------------------------------------
CREATE TABLE public.tooling_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tooling_equipment_id uuid NOT NULL,
  verification_type text NOT NULL,
  result text NOT NULL,
  findings text,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  maintenance_completed boolean NOT NULL DEFAULT false,
  returned_to_service boolean NOT NULL DEFAULT false,
  usability_before text NOT NULL,
  usability_after text NOT NULL,
  cumulative_usage_at numeric NOT NULL,
  next_due date,
  inspected_by uuid NOT NULL,
  inspected_by_name text,
  inspected_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_by_name text,
  approved_at timestamptz,
  CONSTRAINT tooling_verifications_tool_fk FOREIGN KEY (tooling_equipment_id, organization_id)
    REFERENCES public.tooling_details(equipment_id, organization_id),
  CONSTRAINT tooling_verifications_type_check CHECK (verification_type IN ('periodic', 'post_repair', 'incoming', 'first_article', 'other')),
  CONSTRAINT tooling_verifications_result_check CHECK (result IN ('pass', 'fail', 'conditional')),
  CONSTRAINT tooling_verifications_rts_check CHECK (
    NOT returned_to_service OR (result = 'pass' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE INDEX idx_tooling_verifications_tool ON public.tooling_verifications (tooling_equipment_id, inspected_at DESC);
CREATE INDEX idx_tooling_verifications_org ON public.tooling_verifications (organization_id);
CREATE INDEX idx_tooling_verifications_work_order ON public.tooling_verifications (work_order_id) WHERE work_order_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Lifecycle event ledger (movements, state changes, approvals, dispositions)
-- ---------------------------------------------------------------------------
CREATE TABLE public.tooling_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tooling_equipment_id uuid NOT NULL,
  event_type text NOT NULL,
  from_value text,
  to_value text,
  assignment_id uuid REFERENCES public.tooling_assignments(id),
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tooling_events_tool_fk FOREIGN KEY (tooling_equipment_id, organization_id)
    REFERENCES public.tooling_details(equipment_id, organization_id),
  CONSTRAINT tooling_events_type_check CHECK (event_type IN (
    'registered', 'details_updated', 'approved', 'issued', 'returned', 'transferred',
    'usability_changed', 'limits_changed', 'limit_disposition', 'usage_corrected',
    'inspection_recorded', 'returned_to_service', 'compatibility_changed'
  ))
);

CREATE INDEX idx_tooling_events_tool ON public.tooling_events (tooling_equipment_id, created_at DESC);
CREATE INDEX idx_tooling_events_org ON public.tooling_events (organization_id);
CREATE INDEX idx_tooling_events_assignment ON public.tooling_events (assignment_id) WHERE assignment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.tooling_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_tooling_designs_updated_at BEFORE UPDATE ON public.tooling_designs
  FOR EACH ROW EXECUTE FUNCTION public.tooling_touch_updated_at();
CREATE TRIGGER trg_product_parts_updated_at BEFORE UPDATE ON public.product_parts
  FOR EACH ROW EXECUTE FUNCTION public.tooling_touch_updated_at();
CREATE TRIGGER trg_production_operations_updated_at BEFORE UPDATE ON public.production_operations
  FOR EACH ROW EXECUTE FUNCTION public.tooling_touch_updated_at();
CREATE TRIGGER trg_tooling_details_updated_at BEFORE UPDATE ON public.tooling_details
  FOR EACH ROW EXECUTE FUNCTION public.tooling_touch_updated_at();
CREATE TRIGGER trg_tooling_compatibility_updated_at BEFORE UPDATE ON public.tooling_compatibility
  FOR EACH ROW EXECUTE FUNCTION public.tooling_touch_updated_at();

-- Master codes are normalized so 'p-100 ' and 'P-100' collide on the unique key.
CREATE FUNCTION public.tooling_normalize_master_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'product_parts' THEN
    NEW.part_number := upper(btrim(NEW.part_number));
  ELSIF TG_TABLE_NAME = 'production_operations' THEN
    NEW.code := upper(btrim(NEW.code));
  ELSIF TG_TABLE_NAME = 'tooling_designs' THEN
    NEW.design_code := upper(btrim(NEW.design_code));
  END IF;
  NEW.name := btrim(NEW.name);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_product_parts_normalize BEFORE INSERT OR UPDATE ON public.product_parts
  FOR EACH ROW EXECUTE FUNCTION public.tooling_normalize_master_code();
CREATE TRIGGER trg_production_operations_normalize BEFORE INSERT OR UPDATE ON public.production_operations
  FOR EACH ROW EXECUTE FUNCTION public.tooling_normalize_master_code();
CREATE TRIGGER trg_tooling_designs_normalize BEFORE INSERT OR UPDATE ON public.tooling_designs
  FOR EACH ROW EXECUTE FUNCTION public.tooling_normalize_master_code();

-- Equipment-typed references cannot use a composite FK (equipment has no
-- (id, organization_id) key), so validate them here.
CREATE FUNCTION public.tooling_validate_equipment_refs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_org uuid;
BEGIN
  IF TG_TABLE_NAME = 'tooling_details' THEN
    SELECT e.organization_id INTO v_org FROM public.equipment AS e WHERE e.id = NEW.equipment_id;
    IF v_org IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'TOOLING_CROSS_ORGANIZATION' USING ERRCODE = '23514';
    END IF;
    IF NEW.responsible_user_id IS NOT NULL
       AND NOT public.is_org_member(NEW.responsible_user_id, NEW.organization_id) THEN
      RAISE EXCEPTION 'TOOLING_RESPONSIBLE_NOT_MEMBER' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.machine_equipment_id IS NOT NULL THEN
    SELECT e.organization_id INTO v_org FROM public.equipment AS e WHERE e.id = NEW.machine_equipment_id;
    IF v_org IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'TOOLING_CROSS_ORGANIZATION' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tooling_details AS td WHERE td.equipment_id = NEW.machine_equipment_id) THEN
      RAISE EXCEPTION 'TOOLING_MACHINE_IS_TOOL' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_tooling_details_validate BEFORE INSERT OR UPDATE ON public.tooling_details
  FOR EACH ROW EXECUTE FUNCTION public.tooling_validate_equipment_refs();
CREATE TRIGGER trg_tooling_compatibility_validate BEFORE INSERT OR UPDATE OF machine_equipment_id, organization_id ON public.tooling_compatibility
  FOR EACH ROW EXECUTE FUNCTION public.tooling_validate_equipment_refs();
CREATE TRIGGER trg_tooling_assignments_validate BEFORE INSERT OR UPDATE OF machine_equipment_id, organization_id ON public.tooling_assignments
  FOR EACH ROW EXECUTE FUNCTION public.tooling_validate_equipment_refs();

REVOKE ALL ON FUNCTION public.tooling_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tooling_normalize_master_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tooling_validate_equipment_refs() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.tooling_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooling_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooling_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooling_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooling_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooling_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooling_events ENABLE ROW LEVEL SECURITY;

-- Anonymous clients never see tooling data.
REVOKE ALL ON TABLE
  public.tooling_designs, public.product_parts, public.production_operations,
  public.tooling_details, public.tooling_compatibility, public.tooling_assignments,
  public.tooling_usage_logs, public.tooling_verifications, public.tooling_events
FROM anon;

-- Ledger-style tables are read-only for clients; RPCs are the only writers.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE
  public.tooling_details, public.tooling_compatibility, public.tooling_assignments,
  public.tooling_usage_logs, public.tooling_verifications, public.tooling_events
FROM authenticated;
GRANT SELECT ON TABLE
  public.tooling_details, public.tooling_compatibility, public.tooling_assignments,
  public.tooling_usage_logs, public.tooling_verifications, public.tooling_events
TO authenticated;

-- Master tables: org admins manage directly (same pattern as equipment_groups).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.tooling_designs, public.product_parts, public.production_operations
TO authenticated;

DO $policies$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'tooling_designs', 'product_parts', 'production_operations',
    'tooling_details', 'tooling_compatibility', 'tooling_assignments',
    'tooling_usage_logs', 'tooling_verifications', 'tooling_events'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_org_member((SELECT auth.uid()), organization_id))',
      v_table || '_members_select', v_table
    );
  END LOOP;

  FOREACH v_table IN ARRAY ARRAY['tooling_designs', 'product_parts', 'production_operations']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_org_admin((SELECT auth.uid()), organization_id))',
      v_table || '_admin_insert', v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_org_admin((SELECT auth.uid()), organization_id)) WITH CHECK (public.is_org_admin((SELECT auth.uid()), organization_id))',
      v_table || '_admin_update', v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_org_admin((SELECT auth.uid()), organization_id))',
      v_table || '_admin_delete', v_table
    );
  END LOOP;
END;
$policies$;

-- Master rows cannot move between organizations once created.
CREATE FUNCTION public.tooling_lock_master_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'TOOLING_CROSS_ORGANIZATION' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.tooling_lock_master_org() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_tooling_designs_lock_org BEFORE UPDATE OF organization_id ON public.tooling_designs
  FOR EACH ROW EXECUTE FUNCTION public.tooling_lock_master_org();
CREATE TRIGGER trg_product_parts_lock_org BEFORE UPDATE OF organization_id ON public.product_parts
  FOR EACH ROW EXECUTE FUNCTION public.tooling_lock_master_org();
CREATE TRIGGER trg_production_operations_lock_org BEFORE UPDATE OF organization_id ON public.production_operations
  FOR EACH ROW EXECUTE FUNCTION public.tooling_lock_master_org();

-- ---------------------------------------------------------------------------
-- Read model: one row per tool with derived life / due indicators.
-- security_invoker keeps equipment + tooling RLS in force for the caller.
-- ---------------------------------------------------------------------------
CREATE VIEW public.tooling_overview
WITH (security_invoker = true)
AS
SELECT
  td.equipment_id AS id,
  td.organization_id,
  e.name,
  e.management_code,
  e.manufacturer,
  e.model,
  e.serial_number,
  e.status AS equipment_status,
  e.team_id,
  e.image_url,
  td.tooling_type,
  td.design_id,
  d.design_code,
  d.name AS design_name,
  td.ownership_type,
  td.owner_name,
  td.storage_location,
  td.responsible_user_id,
  rp.name AS responsible_name,
  td.condition,
  td.usability_state,
  td.approval_status,
  td.approved_by,
  td.approved_at,
  td.requires_machine,
  td.drawing_number,
  td.drawing_revision,
  td.revision_effective_date,
  td.usage_unit,
  td.warning_limit,
  td.life_limit,
  td.maintenance_interval,
  td.inspection_interval_days,
  td.cumulative_usage,
  td.usage_since_maintenance,
  td.last_maintenance_at,
  td.last_inspection_at,
  td.next_inspection_due,
  td.notes,
  td.created_at,
  td.updated_at,
  CASE WHEN td.life_limit IS NULL THEN NULL ELSE td.life_limit - td.cumulative_usage END AS remaining_life,
  (td.warning_limit IS NOT NULL AND td.cumulative_usage >= td.warning_limit) AS warning_reached,
  (td.life_limit IS NOT NULL AND td.cumulative_usage >= td.life_limit) AS life_limit_reached,
  (td.maintenance_interval IS NOT NULL AND td.usage_since_maintenance >= td.maintenance_interval) AS maintenance_due,
  (td.next_inspection_due IS NOT NULL AND td.next_inspection_due < CURRENT_DATE) AS inspection_overdue,
  a.id AS active_assignment_id,
  a.issued_to_user_id,
  a.issued_to_name,
  a.issued_at,
  a.machine_equipment_id AS issued_machine_id,
  (a.id IS NOT NULL) AS is_issued,
  (
    a.id IS NULL
    AND td.approval_status = 'approved'
    AND td.usability_state = 'available'
    AND td.condition <> 'damaged'
    AND (td.life_limit IS NULL OR td.cumulative_usage < td.life_limit)
    AND (td.next_inspection_due IS NULL OR td.next_inspection_due >= CURRENT_DATE)
  ) AS is_issuable
FROM public.tooling_details AS td
JOIN public.equipment AS e ON e.id = td.equipment_id
LEFT JOIN public.tooling_designs AS d ON d.id = td.design_id
LEFT JOIN public.profiles AS rp ON rp.id = td.responsible_user_id
LEFT JOIN public.tooling_assignments AS a
  ON a.tooling_equipment_id = td.equipment_id AND a.status = 'active';

REVOKE ALL ON public.tooling_overview FROM anon;
GRANT SELECT ON public.tooling_overview TO authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers (not client-callable)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.tooling_actor_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(
    (SELECT p.name FROM public.profiles AS p WHERE p.id = p_user_id),
    (SELECT u.email FROM auth.users AS u WHERE u.id = p_user_id)
  );
$function$;

-- Locks the tool row (serializes every tooling mutation for one tool) and
-- enforces the caller's permission tier: 'admin' or 'operate'.
CREATE FUNCTION public.tooling_lock_for_actor(p_tooling_id uuid, p_tier text)
RETURNS public.tooling_details
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details;
  v_team uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'TOOLING_NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT td.* INTO v_row
  FROM public.tooling_details AS td
  WHERE td.equipment_id = p_tooling_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.is_org_member(v_uid, v_row.organization_id) THEN
    RAISE EXCEPTION 'TOOLING_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF public.is_org_admin(v_uid, v_row.organization_id) THEN
    RETURN v_row;
  END IF;

  IF p_tier = 'operate' THEN
    SELECT e.team_id INTO v_team FROM public.equipment AS e WHERE e.id = p_tooling_id;
    IF public.has_team_permission(v_uid, v_row.organization_id, v_team, 'equipment.update') THEN
      RETURN v_row;
    END IF;
  END IF;

  RAISE EXCEPTION 'TOOLING_PERMISSION_DENIED' USING ERRCODE = '42501';
END;
$function$;

CREATE FUNCTION public.tooling_log_event(
  p_row public.tooling_details,
  p_event_type text,
  p_from text,
  p_to text,
  p_assignment_id uuid,
  p_reason text,
  p_details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id uuid;
  v_name text;
BEGIN
  INSERT INTO public.tooling_events (
    organization_id, tooling_equipment_id, event_type, from_value, to_value,
    assignment_id, reason, details, actor_id, actor_name
  ) VALUES (
    p_row.organization_id, p_row.equipment_id, p_event_type, p_from, p_to,
    p_assignment_id, NULLIF(btrim(p_reason), ''), COALESCE(p_details, '{}'::jsonb),
    auth.uid(), public.tooling_actor_name(auth.uid())
  )
  RETURNING id INTO v_id;

  SELECT e.name INTO v_name FROM public.equipment AS e WHERE e.id = p_row.equipment_id;
  PERFORM public.log_audit_entry(
    p_row.organization_id, 'equipment', p_row.equipment_id, v_name, 'UPDATE',
    jsonb_build_object('tooling_' || p_event_type, jsonb_build_object('old', p_from, 'new', p_to)),
    jsonb_build_object('source', 'tooling', 'event_id', v_id, 'reason', NULLIF(btrim(p_reason), ''))
  );
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.tooling_actor_name(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tooling_lock_for_actor(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tooling_log_event(public.tooling_details, text, text, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- M1: register / update / approve tooling
-- ---------------------------------------------------------------------------
-- p_payload keys: equipment_id (optional, enrol an existing TL equipment row),
-- name, manufacturer, model, serial_number, team_id, tooling_type, design_id,
-- ownership_type, owner_name, storage_location, responsible_user_id,
-- requires_machine, drawing_number, drawing_revision, revision_effective_date,
-- usage_unit, warning_limit, life_limit, maintenance_interval,
-- inspection_interval_days, notes.
CREATE FUNCTION public.create_tooling(p_organization_id uuid, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_group_id uuid;
  v_equipment_id uuid := NULLIF(p_payload->>'equipment_id', '')::uuid;
  v_existing public.equipment;
  v_location text := NULLIF(btrim(p_payload->>'storage_location'), '');
  v_team uuid := NULLIF(p_payload->>'team_id', '')::uuid;
  v_row public.tooling_details;
BEGIN
  IF v_uid IS NULL OR NOT public.is_org_admin(v_uid, p_organization_id) THEN
    RAISE EXCEPTION 'TOOLING_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  IF v_team IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams AS t WHERE t.id = v_team AND t.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'TOOLING_CROSS_ORGANIZATION' USING ERRCODE = '23514';
  END IF;

  -- Reuse the organization's TL classification; seed it when the org has not
  -- configured one yet so every tool gets a stable TL management code.
  SELECT g.id INTO v_group_id
  FROM public.equipment_groups AS g
  WHERE g.organization_id = p_organization_id AND g.code = 'TL';

  IF v_group_id IS NULL THEN
    INSERT INTO public.equipment_groups (organization_id, code, name, examples, management_focus, description)
    VALUES (p_organization_id, 'TL', 'Tooling / Jig / Fixture', 'Mold, Jig, Fixture, Die, Checking Fixture',
            'Tool life, maintenance, location, condition', 'Production and inspection tooling, molds, jigs and fixtures.')
    RETURNING id INTO v_group_id;
  END IF;

  IF v_equipment_id IS NOT NULL THEN
    SELECT e.* INTO v_existing FROM public.equipment AS e WHERE e.id = v_equipment_id FOR UPDATE;
    IF NOT FOUND OR v_existing.organization_id <> p_organization_id THEN
      RAISE EXCEPTION 'TOOLING_CROSS_ORGANIZATION' USING ERRCODE = '23514';
    END IF;
    IF v_existing.equipment_group_id IS NOT NULL AND v_existing.equipment_group_id <> v_group_id THEN
      RAISE EXCEPTION 'TOOLING_EQUIPMENT_NOT_TL' USING ERRCODE = '23514';
    END IF;
    IF v_existing.equipment_group_id IS NULL THEN
      UPDATE public.equipment SET equipment_group_id = v_group_id WHERE id = v_equipment_id;
    END IF;
    IF EXISTS (SELECT 1 FROM public.tooling_details AS td WHERE td.equipment_id = v_equipment_id) THEN
      RAISE EXCEPTION 'TOOLING_ALREADY_REGISTERED' USING ERRCODE = '23505';
    END IF;
  ELSE
    IF length(btrim(COALESCE(p_payload->>'name', ''))) = 0 THEN
      RAISE EXCEPTION 'TOOLING_NAME_REQUIRED' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.equipment (
      organization_id, name, manufacturer, model, serial_number, status, location,
      installation_date, team_id, equipment_group_id, notes
    ) VALUES (
      p_organization_id,
      btrim(p_payload->>'name'),
      COALESCE(NULLIF(btrim(p_payload->>'manufacturer'), ''), '-'),
      COALESCE(NULLIF(btrim(p_payload->>'model'), ''), '-'),
      NULLIF(btrim(p_payload->>'serial_number'), ''),
      'active',
      COALESCE(v_location, '-'),
      CURRENT_DATE,
      v_team,
      v_group_id,
      NULLIF(btrim(p_payload->>'notes'), '')
    )
    RETURNING id INTO v_equipment_id;
  END IF;

  BEGIN
  INSERT INTO public.tooling_details (
    equipment_id, organization_id, tooling_type, design_id, ownership_type, owner_name,
    storage_location, responsible_user_id, requires_machine, drawing_number,
    drawing_revision, revision_effective_date, usage_unit, warning_limit, life_limit,
    maintenance_interval, inspection_interval_days, next_inspection_due, notes, created_by
  ) VALUES (
    v_equipment_id,
    p_organization_id,
    COALESCE(NULLIF(p_payload->>'tooling_type', ''), 'jig'),
    NULLIF(p_payload->>'design_id', '')::uuid,
    COALESCE(NULLIF(p_payload->>'ownership_type', ''), 'company'),
    NULLIF(btrim(p_payload->>'owner_name'), ''),
    v_location,
    NULLIF(p_payload->>'responsible_user_id', '')::uuid,
    COALESCE((p_payload->>'requires_machine')::boolean, true),
    NULLIF(btrim(p_payload->>'drawing_number'), ''),
    NULLIF(btrim(p_payload->>'drawing_revision'), ''),
    NULLIF(p_payload->>'revision_effective_date', '')::date,
    COALESCE(NULLIF(p_payload->>'usage_unit', ''), 'cycles'),
    NULLIF(p_payload->>'warning_limit', '')::numeric,
    NULLIF(p_payload->>'life_limit', '')::numeric,
    NULLIF(p_payload->>'maintenance_interval', '')::numeric,
    NULLIF(p_payload->>'inspection_interval_days', '')::integer,
    CASE WHEN NULLIF(p_payload->>'inspection_interval_days', '') IS NULL THEN NULL
         ELSE CURRENT_DATE + (p_payload->>'inspection_interval_days')::integer END,
    NULLIF(btrim(p_payload->>'notes'), ''),
    v_uid
  )
  RETURNING * INTO v_row;
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'TOOLING_CROSS_ORGANIZATION' USING ERRCODE = '23514';
  END;

  PERFORM public.tooling_log_event(v_row, 'registered', NULL, v_row.tooling_type, NULL, NULL,
    jsonb_build_object('enrolled_existing', p_payload ? 'equipment_id'));
  RETURN v_equipment_id;
END;
$function$;

-- Editable descriptive fields only. Usability, approval, usage counters,
-- limits and location have dedicated RPCs with their own controls.
CREATE FUNCTION public.update_tooling_details(p_tooling_id uuid, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'admin');
  v_new public.tooling_details;
BEGIN
  BEGIN
  UPDATE public.tooling_details AS td SET
    tooling_type = CASE WHEN p_payload ? 'tooling_type' THEN p_payload->>'tooling_type' ELSE td.tooling_type END,
    design_id = CASE WHEN p_payload ? 'design_id' THEN NULLIF(p_payload->>'design_id', '')::uuid ELSE td.design_id END,
    ownership_type = CASE WHEN p_payload ? 'ownership_type' THEN p_payload->>'ownership_type' ELSE td.ownership_type END,
    owner_name = CASE WHEN p_payload ? 'owner_name' THEN NULLIF(btrim(p_payload->>'owner_name'), '') ELSE td.owner_name END,
    responsible_user_id = CASE WHEN p_payload ? 'responsible_user_id' THEN NULLIF(p_payload->>'responsible_user_id', '')::uuid ELSE td.responsible_user_id END,
    requires_machine = CASE WHEN p_payload ? 'requires_machine' THEN (p_payload->>'requires_machine')::boolean ELSE td.requires_machine END,
    drawing_number = CASE WHEN p_payload ? 'drawing_number' THEN NULLIF(btrim(p_payload->>'drawing_number'), '') ELSE td.drawing_number END,
    drawing_revision = CASE WHEN p_payload ? 'drawing_revision' THEN NULLIF(btrim(p_payload->>'drawing_revision'), '') ELSE td.drawing_revision END,
    revision_effective_date = CASE WHEN p_payload ? 'revision_effective_date' THEN NULLIF(p_payload->>'revision_effective_date', '')::date ELSE td.revision_effective_date END,
    notes = CASE WHEN p_payload ? 'notes' THEN NULLIF(btrim(p_payload->>'notes'), '') ELSE td.notes END
  WHERE td.equipment_id = p_tooling_id
  RETURNING * INTO v_new;
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'TOOLING_CROSS_ORGANIZATION' USING ERRCODE = '23514';
  END;

  PERFORM public.tooling_log_event(v_new, 'details_updated',
    v_row.drawing_revision, v_new.drawing_revision, NULL, NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'tooling_type', CASE WHEN v_row.tooling_type IS DISTINCT FROM v_new.tooling_type THEN jsonb_build_object('old', v_row.tooling_type, 'new', v_new.tooling_type) END,
      'ownership_type', CASE WHEN v_row.ownership_type IS DISTINCT FROM v_new.ownership_type THEN jsonb_build_object('old', v_row.ownership_type, 'new', v_new.ownership_type) END,
      'drawing_number', CASE WHEN v_row.drawing_number IS DISTINCT FROM v_new.drawing_number THEN jsonb_build_object('old', v_row.drawing_number, 'new', v_new.drawing_number) END,
      'drawing_revision', CASE WHEN v_row.drawing_revision IS DISTINCT FROM v_new.drawing_revision THEN jsonb_build_object('old', v_row.drawing_revision, 'new', v_new.drawing_revision) END,
      'responsible_user_id', CASE WHEN v_row.responsible_user_id IS DISTINCT FROM v_new.responsible_user_id THEN jsonb_build_object('old', v_row.responsible_user_id, 'new', v_new.responsible_user_id) END,
      'requires_machine', CASE WHEN v_row.requires_machine IS DISTINCT FROM v_new.requires_machine THEN jsonb_build_object('old', v_row.requires_machine, 'new', v_new.requires_machine) END
    )));
END;
$function$;

CREATE FUNCTION public.approve_tooling(p_tooling_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'admin');
BEGIN
  IF v_row.approval_status = 'approved' THEN
    RETURN;
  END IF;
  IF v_row.usability_state = 'retired' THEN
    RAISE EXCEPTION 'TOOLING_RETIRED' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tooling_details
  SET approval_status = 'approved', approved_by = auth.uid(), approved_at = now()
  WHERE equipment_id = p_tooling_id;

  PERFORM public.tooling_log_event(v_row, 'approved', 'pending', 'approved', NULL, p_note, '{}'::jsonb);
END;
$function$;

-- ---------------------------------------------------------------------------
-- M2: compatibility rules
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.create_tooling_compatibility(
  p_tooling_id uuid,
  p_product_part_id uuid,
  p_operation_id uuid DEFAULT NULL,
  p_machine_equipment_id uuid DEFAULT NULL,
  p_drawing_revision text DEFAULT NULL,
  p_effective_from date DEFAULT NULL,
  p_effective_to date DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'admin');
  v_id uuid;
BEGIN
  BEGIN
    INSERT INTO public.tooling_compatibility (
      organization_id, tooling_equipment_id, product_part_id, operation_id,
      machine_equipment_id, drawing_revision, effective_from, effective_to, notes, created_by
    ) VALUES (
      v_row.organization_id, p_tooling_id, p_product_part_id, p_operation_id,
      p_machine_equipment_id, NULLIF(btrim(p_drawing_revision), ''), p_effective_from,
      p_effective_to, NULLIF(btrim(p_notes), ''), auth.uid()
    )
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'TOOLING_COMPATIBILITY_DUPLICATE' USING ERRCODE = '23505';
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'TOOLING_CROSS_ORGANIZATION' USING ERRCODE = '23514';
  END;

  PERFORM public.tooling_log_event(v_row, 'compatibility_changed', NULL, 'pending', NULL, NULL,
    jsonb_build_object('compatibility_id', v_id, 'action', 'created'));
  RETURN v_id;
END;
$function$;

-- p_action: 'approve' | 'reject' | 'deactivate'
CREATE FUNCTION public.set_tooling_compatibility_status(
  p_compatibility_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_compat public.tooling_compatibility;
  v_row public.tooling_details;
BEGIN
  SELECT c.* INTO v_compat FROM public.tooling_compatibility AS c WHERE c.id = p_compatibility_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOOLING_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  v_row := public.tooling_lock_for_actor(v_compat.tooling_equipment_id, 'admin');

  SELECT c.* INTO v_compat FROM public.tooling_compatibility AS c WHERE c.id = p_compatibility_id FOR UPDATE;

  IF p_action = 'approve' THEN
    IF NOT v_compat.is_active THEN
      RAISE EXCEPTION 'TOOLING_COMPATIBILITY_INACTIVE' USING ERRCODE = '22023';
    END IF;
    UPDATE public.tooling_compatibility
    SET approval_status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = p_compatibility_id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.tooling_compatibility
    SET approval_status = 'rejected', approved_by = auth.uid(), approved_at = now(), is_active = false
    WHERE id = p_compatibility_id;
  ELSIF p_action = 'deactivate' THEN
    UPDATE public.tooling_compatibility SET is_active = false WHERE id = p_compatibility_id;
  ELSE
    RAISE EXCEPTION 'TOOLING_INVALID_ACTION' USING ERRCODE = '22023';
  END IF;

  PERFORM public.tooling_log_event(v_row, 'compatibility_changed', v_compat.approval_status, p_action, NULL, p_note,
    jsonb_build_object('compatibility_id', p_compatibility_id, 'action', p_action));
END;
$function$;

-- ---------------------------------------------------------------------------
-- M3: issue / return / transfer
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.issue_tooling(
  p_tooling_id uuid,
  p_issued_to_user_id uuid,
  p_machine_equipment_id uuid DEFAULT NULL,
  p_product_part_id uuid DEFAULT NULL,
  p_operation_id uuid DEFAULT NULL,
  p_issue_location text DEFAULT NULL,
  p_condition text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'operate');
  v_compat_id uuid;
  v_assignment_id uuid;
  v_condition text := COALESCE(NULLIF(p_condition, ''), v_row.condition);
BEGIN
  IF p_issued_to_user_id IS NULL OR NOT public.is_org_member(p_issued_to_user_id, v_row.organization_id) THEN
    RAISE EXCEPTION 'TOOLING_HOLDER_NOT_MEMBER' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tooling_assignments AS a
    WHERE a.tooling_equipment_id = p_tooling_id AND a.status = 'active'
  ) THEN
    RAISE EXCEPTION 'TOOLING_ALREADY_ISSUED' USING ERRCODE = '23505';
  END IF;

  IF v_row.approval_status <> 'approved' THEN
    RAISE EXCEPTION 'TOOLING_NOT_APPROVED' USING ERRCODE = '22023';
  END IF;
  IF v_row.usability_state <> 'available' THEN
    RAISE EXCEPTION 'TOOLING_NOT_USABLE' USING ERRCODE = '22023', DETAIL = v_row.usability_state;
  END IF;
  IF v_row.condition = 'damaged' OR v_condition = 'damaged' THEN
    RAISE EXCEPTION 'TOOLING_DAMAGED' USING ERRCODE = '22023';
  END IF;
  IF v_row.life_limit IS NOT NULL AND v_row.cumulative_usage >= v_row.life_limit THEN
    RAISE EXCEPTION 'TOOLING_LIFE_LIMIT_REACHED' USING ERRCODE = '22023';
  END IF;
  IF v_row.next_inspection_due IS NOT NULL AND v_row.next_inspection_due < CURRENT_DATE THEN
    RAISE EXCEPTION 'TOOLING_INSPECTION_OVERDUE' USING ERRCODE = '22023';
  END IF;

  -- Validate only the production context that was supplied.
  IF p_machine_equipment_id IS NOT NULL OR p_product_part_id IS NOT NULL OR p_operation_id IS NOT NULL THEN
    SELECT c.id INTO v_compat_id
    FROM public.tooling_compatibility AS c
    WHERE c.tooling_equipment_id = p_tooling_id
      AND c.is_active
      AND c.approval_status = 'approved'
      AND (c.effective_from IS NULL OR c.effective_from <= CURRENT_DATE)
      AND (c.effective_to IS NULL OR c.effective_to >= CURRENT_DATE)
      AND (p_product_part_id IS NULL OR c.product_part_id = p_product_part_id)
      AND (p_operation_id IS NULL OR c.operation_id = p_operation_id)
      AND (p_machine_equipment_id IS NULL OR c.machine_equipment_id = p_machine_equipment_id)
    ORDER BY c.approved_at DESC
    LIMIT 1;

    IF v_compat_id IS NULL THEN
      RAISE EXCEPTION 'TOOLING_INCOMPATIBLE_CONTEXT' USING ERRCODE = '22023';
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.tooling_assignments (
      organization_id, tooling_equipment_id, status, issued_to_user_id, issued_to_name,
      issued_by, issued_by_name, machine_equipment_id, product_part_id, operation_id,
      compatibility_id, issue_location, condition_at_issue, notes
    ) VALUES (
      v_row.organization_id, p_tooling_id, 'active', p_issued_to_user_id,
      public.tooling_actor_name(p_issued_to_user_id), auth.uid(), public.tooling_actor_name(auth.uid()),
      p_machine_equipment_id, p_product_part_id, p_operation_id, v_compat_id,
      NULLIF(btrim(p_issue_location), ''), v_condition, NULLIF(btrim(p_notes), '')
    )
    RETURNING id INTO v_assignment_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'TOOLING_ALREADY_ISSUED' USING ERRCODE = '23505';
  END;

  IF v_condition IS DISTINCT FROM v_row.condition THEN
    UPDATE public.tooling_details SET condition = v_condition WHERE equipment_id = p_tooling_id;
  END IF;

  PERFORM public.tooling_log_event(v_row, 'issued', v_row.storage_location,
    COALESCE(NULLIF(btrim(p_issue_location), ''), public.tooling_actor_name(p_issued_to_user_id)),
    v_assignment_id, p_notes,
    jsonb_strip_nulls(jsonb_build_object(
      'issued_to_user_id', p_issued_to_user_id,
      'machine_equipment_id', p_machine_equipment_id,
      'product_part_id', p_product_part_id,
      'operation_id', p_operation_id,
      'compatibility_id', v_compat_id,
      'condition', v_condition
    )));
  RETURN v_assignment_id;
END;
$function$;

-- Usage recording shared by return_tooling and record_tooling_usage.
CREATE FUNCTION public.tooling_apply_usage(
  p_row public.tooling_details,
  p_quantity numeric,
  p_production_quantity numeric,
  p_assignment_id uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_after numeric;
  v_id uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'TOOLING_INVALID_QUANTITY' USING ERRCODE = '22023';
  END IF;
  IF p_row.usability_state = 'retired' THEN
    RAISE EXCEPTION 'TOOLING_RETIRED' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tooling_details
  SET cumulative_usage = cumulative_usage + p_quantity,
      usage_since_maintenance = usage_since_maintenance + p_quantity
  WHERE equipment_id = p_row.equipment_id
  RETURNING cumulative_usage INTO v_after;

  INSERT INTO public.tooling_usage_logs (
    organization_id, tooling_equipment_id, entry_type, quantity, usage_unit,
    production_quantity, assignment_id, cumulative_after, reason, recorded_by, recorded_by_name
  ) VALUES (
    p_row.organization_id, p_row.equipment_id, 'usage', p_quantity, p_row.usage_unit,
    p_production_quantity, p_assignment_id, v_after, NULLIF(btrim(p_reason), ''),
    auth.uid(), public.tooling_actor_name(auth.uid())
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.tooling_apply_usage(public.tooling_details, numeric, numeric, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.return_tooling(
  p_tooling_id uuid,
  p_condition text,
  p_return_location text DEFAULT NULL,
  p_usage_quantity numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'operate');
  v_assignment public.tooling_assignments;
  v_location text := COALESCE(NULLIF(btrim(p_return_location), ''), v_row.storage_location);
BEGIN
  IF p_condition IS NULL OR p_condition NOT IN ('new', 'good', 'worn', 'damaged') THEN
    RAISE EXCEPTION 'TOOLING_CONDITION_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_usage_quantity IS NOT NULL AND p_usage_quantity < 0 THEN
    RAISE EXCEPTION 'TOOLING_INVALID_QUANTITY' USING ERRCODE = '22023';
  END IF;

  SELECT a.* INTO v_assignment
  FROM public.tooling_assignments AS a
  WHERE a.tooling_equipment_id = p_tooling_id AND a.status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOOLING_NOT_ISSUED' USING ERRCODE = '22023';
  END IF;

  IF p_usage_quantity IS NOT NULL AND p_usage_quantity > 0 THEN
    PERFORM public.tooling_apply_usage(v_row, p_usage_quantity, NULL, v_assignment.id, 'return');
  END IF;

  UPDATE public.tooling_assignments
  SET status = 'returned',
      returned_at = now(),
      returned_by = auth.uid(),
      returned_by_name = public.tooling_actor_name(auth.uid()),
      return_location = v_location,
      condition_at_return = p_condition,
      usage_at_return = NULLIF(p_usage_quantity, 0),
      return_notes = NULLIF(btrim(p_notes), '')
  WHERE id = v_assignment.id;

  -- A tool returned damaged is quarantined until inspected and released.
  UPDATE public.tooling_details
  SET condition = p_condition,
      storage_location = v_location,
      usability_state = CASE WHEN p_condition = 'damaged' AND usability_state = 'available'
                             THEN 'quarantined' ELSE usability_state END
  WHERE equipment_id = p_tooling_id;

  PERFORM public.tooling_log_event(v_row, 'returned', v_assignment.issue_location, v_location,
    v_assignment.id, p_notes,
    jsonb_strip_nulls(jsonb_build_object(
      'condition_at_issue', v_assignment.condition_at_issue,
      'condition_at_return', p_condition,
      'usage_quantity', p_usage_quantity,
      'quarantined', p_condition = 'damaged'
    )));

  IF p_condition = 'damaged' AND v_row.usability_state = 'available' THEN
    PERFORM public.tooling_log_event(v_row, 'usability_changed', 'available', 'quarantined',
      v_assignment.id, 'Returned damaged', '{}'::jsonb);
  END IF;

  RETURN v_assignment.id;
END;
$function$;

CREATE FUNCTION public.transfer_tooling_location(
  p_tooling_id uuid,
  p_to_location text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'operate');
BEGIN
  IF length(btrim(COALESCE(p_to_location, ''))) = 0 THEN
    RAISE EXCEPTION 'TOOLING_LOCATION_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.tooling_assignments AS a
    WHERE a.tooling_equipment_id = p_tooling_id AND a.status = 'active'
  ) THEN
    RAISE EXCEPTION 'TOOLING_ISSUED_RETURN_FIRST' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tooling_details SET storage_location = btrim(p_to_location) WHERE equipment_id = p_tooling_id;
  PERFORM public.tooling_log_event(v_row, 'transferred', v_row.storage_location, btrim(p_to_location), NULL, p_reason, '{}'::jsonb);
END;
$function$;

-- ---------------------------------------------------------------------------
-- M4: usage, limits, dispositions, usability, inspections
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.record_tooling_usage(
  p_tooling_id uuid,
  p_quantity numeric,
  p_production_quantity numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'operate');
  v_assignment uuid;
BEGIN
  IF p_production_quantity IS NOT NULL AND p_production_quantity < 0 THEN
    RAISE EXCEPTION 'TOOLING_INVALID_QUANTITY' USING ERRCODE = '22023';
  END IF;
  SELECT a.id INTO v_assignment
  FROM public.tooling_assignments AS a
  WHERE a.tooling_equipment_id = p_tooling_id AND a.status = 'active';

  -- Actual usage is always recorded, even past the life limit: the counter must
  -- reflect reality. The limit blocks further issue, not the record.
  RETURN public.tooling_apply_usage(v_row, p_quantity, p_production_quantity, v_assignment, p_notes);
END;
$function$;

CREATE FUNCTION public.correct_tooling_usage(
  p_tooling_id uuid,
  p_delta numeric,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'admin');
  v_after numeric;
  v_id uuid;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'TOOLING_INVALID_QUANTITY' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(COALESCE(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'TOOLING_REASON_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_row.cumulative_usage + p_delta < 0 THEN
    RAISE EXCEPTION 'TOOLING_USAGE_NEGATIVE' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tooling_details
  SET cumulative_usage = cumulative_usage + p_delta,
      usage_since_maintenance = GREATEST(usage_since_maintenance + p_delta, 0)
  WHERE equipment_id = p_tooling_id
  RETURNING cumulative_usage INTO v_after;

  INSERT INTO public.tooling_usage_logs (
    organization_id, tooling_equipment_id, entry_type, quantity, usage_unit,
    cumulative_after, reason, recorded_by, recorded_by_name
  ) VALUES (
    v_row.organization_id, p_tooling_id, 'correction', p_delta, v_row.usage_unit,
    v_after, btrim(p_reason), auth.uid(), public.tooling_actor_name(auth.uid())
  )
  RETURNING id INTO v_id;

  PERFORM public.tooling_log_event(v_row, 'usage_corrected', v_row.cumulative_usage::text, v_after::text, NULL, p_reason,
    jsonb_build_object('usage_log_id', v_id, 'delta', p_delta));
  RETURN v_id;
END;
$function$;

CREATE FUNCTION public.set_tooling_life_limits(
  p_tooling_id uuid,
  p_usage_unit text,
  p_warning_limit numeric,
  p_life_limit numeric,
  p_maintenance_interval numeric,
  p_inspection_interval_days integer,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'admin');
BEGIN
  IF p_usage_unit IS DISTINCT FROM v_row.usage_unit AND v_row.cumulative_usage > 0 THEN
    RAISE EXCEPTION 'TOOLING_UNIT_LOCKED' USING ERRCODE = '22023';
  END IF;
  -- Lifting the hard limit of a tool that already reached it is a formal
  -- disposition, not a settings edit.
  IF v_row.life_limit IS NOT NULL
     AND v_row.cumulative_usage >= v_row.life_limit
     AND (p_life_limit IS NULL OR p_life_limit > v_row.life_limit) THEN
    RAISE EXCEPTION 'TOOLING_DISPOSITION_REQUIRED' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tooling_details
  SET usage_unit = COALESCE(p_usage_unit, usage_unit),
      warning_limit = p_warning_limit,
      life_limit = p_life_limit,
      maintenance_interval = p_maintenance_interval,
      inspection_interval_days = p_inspection_interval_days,
      next_inspection_due = CASE
        WHEN p_inspection_interval_days IS NULL THEN NULL
        WHEN p_inspection_interval_days IS DISTINCT FROM v_row.inspection_interval_days
          THEN COALESCE(v_row.last_inspection_at::date, CURRENT_DATE) + p_inspection_interval_days
        ELSE next_inspection_due
      END
  WHERE equipment_id = p_tooling_id;

  PERFORM public.tooling_log_event(v_row, 'limits_changed',
    COALESCE(v_row.life_limit::text, '-'), COALESCE(p_life_limit::text, '-'), NULL, p_reason,
    jsonb_build_object(
      'usage_unit', jsonb_build_object('old', v_row.usage_unit, 'new', COALESCE(p_usage_unit, v_row.usage_unit)),
      'warning_limit', jsonb_build_object('old', v_row.warning_limit, 'new', p_warning_limit),
      'life_limit', jsonb_build_object('old', v_row.life_limit, 'new', p_life_limit),
      'maintenance_interval', jsonb_build_object('old', v_row.maintenance_interval, 'new', p_maintenance_interval),
      'inspection_interval_days', jsonb_build_object('old', v_row.inspection_interval_days, 'new', p_inspection_interval_days)
    ));
END;
$function$;

-- p_disposition: 'extend_life' (requires p_new_life_limit > cumulative usage)
-- or 'retire'. Both require a reason and an org owner/admin.
CREATE FUNCTION public.record_tooling_limit_disposition(
  p_tooling_id uuid,
  p_disposition text,
  p_new_life_limit numeric,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.tooling_details := public.tooling_lock_for_actor(p_tooling_id, 'admin');
BEGIN
  IF length(btrim(COALESCE(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'TOOLING_REASON_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_disposition = 'extend_life' THEN
    IF p_new_life_limit IS NULL OR p_new_life_limit <= v_row.cumulative_usage THEN
      RAISE EXCEPTION 'TOOLING_INVALID_LIFE_LIMIT' USING ERRCODE = '22023';
    END IF;
    UPDATE public.tooling_details
    SET life_limit = p_new_life_limit,
        warning_limit = CASE WHEN warning_limit IS NOT NULL AND warning_limit > p_new_life_limit THEN p_new_life_limit ELSE warning_limit END
    WHERE equipment_id = p_tooling_id;
  ELSIF p_disposition = 'retire' THEN
    IF EXISTS (
      SELECT 1 FROM public.tooling_assignments AS a
      WHERE a.tooling_equipment_id = p_tooling_id AND a.status = 'active'
    ) THEN
      RAISE EXCEPTION 'TOOLING_ISSUED_RETURN_FIRST' USING ERRCODE = '22023';
    END IF;
    UPDATE public.tooling_details SET usability_state = 'retired' WHERE equipment_id = p_tooling_id;
  ELSE
    RAISE EXCEPTION 'TOOLING_INVALID_ACTION' USING ERRCODE = '22023';
  END IF;

  PERFORM public.tooling_log_event(v_row, 'limit_disposition',
    COALESCE(v_row.life_limit::text, '-'),
    CASE WHEN p_disposition = 'retire' THEN 'retired' ELSE p_new_life_limit::text END,
    NULL, p_reason,
    jsonb_build_object('disposition', p_disposition, 'cumulative_usage', v_row.cumulative_usage));
END;
$function$;

-- Moves a tool OUT of service. Returning to 'available' is only possible via
-- record_tooling_verification(... p_return_to_service => true).
CREATE FUNCTION public.set_tooling_usability(
  p_tooling_id uuid,
  p_state text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  -- Anyone allowed to operate the tool may quarantine it (stop-the-line);
  -- every other out-of-service state needs an owner/admin.
  v_row public.tooling_details := public.tooling_lock_for_actor(
    p_tooling_id, CASE WHEN p_state = 'quarantined' THEN 'operate' ELSE 'admin' END);
BEGIN
  IF p_state NOT IN ('quarantined', 'under_repair', 'pending_inspection', 'blocked', 'retired') THEN
    RAISE EXCEPTION 'TOOLING_INVALID_STATE' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(COALESCE(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'TOOLING_REASON_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_row.usability_state = 'retired' THEN
    RAISE EXCEPTION 'TOOLING_RETIRED' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.tooling_assignments AS a
    WHERE a.tooling_equipment_id = p_tooling_id AND a.status = 'active'
  ) THEN
    RAISE EXCEPTION 'TOOLING_ISSUED_RETURN_FIRST' USING ERRCODE = '22023';
  END IF;
  IF v_row.usability_state = p_state THEN
    RETURN;
  END IF;

  UPDATE public.tooling_details SET usability_state = p_state WHERE equipment_id = p_tooling_id;
  PERFORM public.tooling_log_event(v_row, 'usability_changed', v_row.usability_state, p_state, NULL, p_reason, '{}'::jsonb);
END;
$function$;

CREATE FUNCTION public.record_tooling_verification(
  p_tooling_id uuid,
  p_verification_type text,
  p_result text,
  p_findings text DEFAULT NULL,
  p_work_order_id uuid DEFAULT NULL,
  p_maintenance_completed boolean DEFAULT false,
  p_return_to_service boolean DEFAULT false,
  p_next_due date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  -- Inspectors (operate tier) record results; releasing to service is an
  -- owner/admin authorization.
  v_row public.tooling_details := public.tooling_lock_for_actor(
    p_tooling_id, CASE WHEN COALESCE(p_return_to_service, false) THEN 'admin' ELSE 'operate' END);
  v_after text;
  v_next date;
  v_id uuid;
  v_issued boolean;
BEGIN
  IF p_verification_type NOT IN ('periodic', 'post_repair', 'incoming', 'first_article', 'other') THEN
    RAISE EXCEPTION 'TOOLING_INVALID_ACTION' USING ERRCODE = '22023';
  END IF;
  IF p_result NOT IN ('pass', 'fail', 'conditional') THEN
    RAISE EXCEPTION 'TOOLING_INVALID_ACTION' USING ERRCODE = '22023';
  END IF;
  IF v_row.usability_state = 'retired' THEN
    RAISE EXCEPTION 'TOOLING_RETIRED' USING ERRCODE = '22023';
  END IF;

  IF p_work_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.work_orders AS w
    WHERE w.id = p_work_order_id
      AND w.organization_id = v_row.organization_id
      AND w.equipment_id = p_tooling_id
  ) THEN
    RAISE EXCEPTION 'TOOLING_WORK_ORDER_MISMATCH' USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tooling_assignments AS a
    WHERE a.tooling_equipment_id = p_tooling_id AND a.status = 'active'
  ) INTO v_issued;

  v_after := v_row.usability_state;
  IF COALESCE(p_return_to_service, false) THEN
    IF p_result <> 'pass' THEN
      RAISE EXCEPTION 'TOOLING_RTS_REQUIRES_PASS' USING ERRCODE = '22023';
    END IF;
    IF v_row.life_limit IS NOT NULL AND v_row.cumulative_usage >= v_row.life_limit THEN
      RAISE EXCEPTION 'TOOLING_DISPOSITION_REQUIRED' USING ERRCODE = '22023';
    END IF;
    v_after := 'available';
  ELSIF p_result = 'fail' THEN
    IF v_issued THEN
      RAISE EXCEPTION 'TOOLING_ISSUED_RETURN_FIRST' USING ERRCODE = '22023';
    END IF;
    v_after := CASE WHEN v_row.usability_state = 'available' THEN 'quarantined' ELSE v_row.usability_state END;
  END IF;

  v_next := COALESCE(
    p_next_due,
    CASE WHEN v_row.inspection_interval_days IS NOT NULL AND p_result = 'pass'
         THEN CURRENT_DATE + v_row.inspection_interval_days END,
    v_row.next_inspection_due
  );

  INSERT INTO public.tooling_verifications (
    organization_id, tooling_equipment_id, verification_type, result, findings, work_order_id,
    maintenance_completed, returned_to_service, usability_before, usability_after,
    cumulative_usage_at, next_due, inspected_by, inspected_by_name,
    approved_by, approved_by_name, approved_at
  ) VALUES (
    v_row.organization_id, p_tooling_id, p_verification_type, p_result, NULLIF(btrim(p_findings), ''),
    p_work_order_id, COALESCE(p_maintenance_completed, false), COALESCE(p_return_to_service, false),
    v_row.usability_state, v_after, v_row.cumulative_usage, v_next,
    auth.uid(), public.tooling_actor_name(auth.uid()),
    CASE WHEN p_return_to_service THEN auth.uid() END,
    CASE WHEN p_return_to_service THEN public.tooling_actor_name(auth.uid()) END,
    CASE WHEN p_return_to_service THEN now() END
  )
  RETURNING id INTO v_id;

  -- Maintenance resets the since-maintenance counter only; lifetime usage is
  -- never reset by ordinary maintenance.
  UPDATE public.tooling_details
  SET usability_state = v_after,
      last_inspection_at = now(),
      next_inspection_due = v_next,
      usage_since_maintenance = CASE WHEN COALESCE(p_maintenance_completed, false) THEN 0 ELSE usage_since_maintenance END,
      last_maintenance_at = CASE WHEN COALESCE(p_maintenance_completed, false) THEN now() ELSE last_maintenance_at END,
      condition = CASE WHEN COALESCE(p_return_to_service, false) AND condition = 'damaged' THEN 'good' ELSE condition END
  WHERE equipment_id = p_tooling_id;

  PERFORM public.tooling_log_event(v_row, 'inspection_recorded', p_verification_type, p_result, NULL, p_findings,
    jsonb_strip_nulls(jsonb_build_object('verification_id', v_id, 'work_order_id', p_work_order_id,
      'maintenance_completed', COALESCE(p_maintenance_completed, false))));

  IF v_after IS DISTINCT FROM v_row.usability_state THEN
    PERFORM public.tooling_log_event(v_row,
      CASE WHEN COALESCE(p_return_to_service, false) THEN 'returned_to_service' ELSE 'usability_changed' END,
      v_row.usability_state, v_after, NULL, p_findings,
      jsonb_build_object('verification_id', v_id));
  END IF;

  RETURN v_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Grants for client-callable RPCs
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_tooling(uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_tooling_details(uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.approve_tooling(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_tooling_compatibility(uuid, uuid, uuid, uuid, text, date, date, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_tooling_compatibility_status(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.issue_tooling(uuid, uuid, uuid, uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.return_tooling(uuid, text, text, numeric, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.transfer_tooling_location(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_tooling_usage(uuid, numeric, numeric, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.correct_tooling_usage(uuid, numeric, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_tooling_life_limits(uuid, text, numeric, numeric, numeric, integer, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_tooling_limit_disposition(uuid, text, numeric, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_tooling_usability(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_tooling_verification(uuid, text, text, text, uuid, boolean, boolean, date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_tooling(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tooling_details(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_tooling(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tooling_compatibility(uuid, uuid, uuid, uuid, text, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tooling_compatibility_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_tooling(uuid, uuid, uuid, uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_tooling(uuid, text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_tooling_location(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_tooling_usage(uuid, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.correct_tooling_usage(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tooling_life_limits(uuid, text, numeric, numeric, numeric, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_tooling_limit_disposition(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tooling_usability(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_tooling_verification(uuid, text, text, text, uuid, boolean, boolean, date) TO authenticated;
-- rpc-authenticated-grant-allowed: create_tooling, update_tooling_details, approve_tooling
-- rpc-authenticated-grant-allowed: create_tooling_compatibility, set_tooling_compatibility_status
-- rpc-authenticated-grant-allowed: issue_tooling, return_tooling, transfer_tooling_location
-- rpc-authenticated-grant-allowed: record_tooling_usage, correct_tooling_usage, set_tooling_life_limits
-- rpc-authenticated-grant-allowed: record_tooling_limit_disposition, set_tooling_usability, record_tooling_verification

COMMENT ON TABLE public.tooling_details IS 'Tooling-specific attributes for equipment rows in the TL group (1:1). Mutated only through tooling RPCs.';
COMMENT ON TABLE public.tooling_compatibility IS 'Approved tool <-> product part <-> operation <-> machine combinations. NULL machine = manual tooling.';
COMMENT ON TABLE public.tooling_assignments IS 'Durable issue/return history. Partial unique index enforces one active checkout per tool.';
COMMENT ON TABLE public.tooling_usage_logs IS 'Append-only usage ledger (cycles/shots/strokes/pieces) including authorized corrections.';
COMMENT ON TABLE public.tooling_verifications IS 'Inspection / verification records including return-to-service authorization.';
COMMENT ON TABLE public.tooling_events IS 'Append-only tooling lifecycle ledger (movements, state changes, approvals, dispositions).';

COMMIT;
