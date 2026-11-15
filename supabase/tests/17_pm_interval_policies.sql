-- pgTAP: PM interval policies (structure, resolver precedence, RLS).
-- Self-contained fixtures so the file passes on `supabase db reset --no-seed`.
BEGIN;
SELECT plan(24);

SELECT has_table('public', 'pm_interval_policies', 'pm_interval_policies table exists');
SELECT has_column('public', 'pm_interval_policies', 'organization_id', 'organization_id exists');
SELECT has_column('public', 'pm_interval_policies', 'scope_type', 'scope_type exists');
SELECT has_column('public', 'pm_interval_policies', 'schedule_mode', 'schedule_mode exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pm_interval_policies'::regclass),
  'RLS enabled on pm_interval_policies'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_interval_policies'),
  4,
  'pm_interval_policies has four RLS policies'
);

SELECT has_function(
  'public',
  'resolve_effective_pm_interval_policy',
  ARRAY['uuid'],
  'resolve_effective_pm_interval_policy exists'
);

SELECT has_function(
  'public',
  'get_equipment_pm_status',
  ARRAY['uuid'],
  'get_equipment_pm_status exists'
);

SELECT has_function(
  'public',
  'get_effective_pm_interval_policy_for_equipment',
  ARRAY['uuid'],
  'get_effective_pm_interval_policy_for_equipment exists'
);

-- ============================================
-- Fixtures
--   17000000-...-0001 owner of org A
--   17000000-...-0002 plain member of org A
--   org A: team 1 (equipment's team), team 2 (unused)
--   org B: team 3 (cross-org target)
-- ============================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  (
    '17000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'pgtap-pm-interval-owner@znteqr.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "pgTAP PM Interval Owner"}'::jsonb,
    false, 'authenticated', 'authenticated', '', '', '', ''
  ),
  (
    '17000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'pgtap-pm-interval-member@znteqr.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "pgTAP PM Interval Member"}'::jsonb,
    false, 'authenticated', 'authenticated', '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name)
VALUES
  ('17000000-aaaa-0000-0000-000000000001'::uuid, 'pgTAP PM Interval Org A'),
  ('17000000-aaaa-0000-0000-000000000002'::uuid, 'pgTAP PM Interval Org B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES
  ('17000000-aaaa-0000-0000-000000000001'::uuid, '17000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active'),
  ('17000000-aaaa-0000-0000-000000000001'::uuid, '17000000-0000-0000-0000-000000000002'::uuid, 'member', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (id, organization_id, name)
VALUES
  ('17000000-bbbb-0000-0000-000000000001'::uuid, '17000000-aaaa-0000-0000-000000000001'::uuid, 'pgTAP PM Team 1'),
  ('17000000-bbbb-0000-0000-000000000002'::uuid, '17000000-aaaa-0000-0000-000000000001'::uuid, 'pgTAP PM Team 2'),
  ('17000000-bbbb-0000-0000-000000000003'::uuid, '17000000-aaaa-0000-0000-000000000002'::uuid, 'pgTAP PM Team Other Org');

INSERT INTO public.pm_checklist_templates (
  id, organization_id, name, template_data, interval_value, interval_type, created_by
) VALUES (
  '17000000-cccc-0000-0000-000000000001'::uuid,
  '17000000-aaaa-0000-0000-000000000001'::uuid,
  'pgTAP 250h Service',
  $$[{"label":"Check oil","required":true}]$$::jsonb,
  30,
  'days',
  '17000000-0000-0000-0000-000000000001'::uuid
);

INSERT INTO public.equipment (
  id, organization_id, team_id, default_pm_template_id,
  name, manufacturer, model, serial_number, status, location, installation_date
) VALUES (
  '17000000-dddd-0000-0000-000000000001'::uuid,
  '17000000-aaaa-0000-0000-000000000001'::uuid,
  '17000000-bbbb-0000-0000-000000000001'::uuid,
  '17000000-cccc-0000-0000-000000000001'::uuid,
  'pgTAP Bobcat', 'Bobcat', 'S650', 'SN-PGTAP-17', 'active', 'Yard 17', CURRENT_DATE
);

-- ============================================
-- Resolver precedence (runs as test owner)
-- ============================================

SELECT is(
  (
    SELECT r.source
    FROM public.resolve_effective_pm_interval_policy('17000000-dddd-0000-0000-000000000001'::uuid) r
    LIMIT 1
  ),
  'template_default',
  'Equipment without policies resolves template_default interval'
);

INSERT INTO public.pm_interval_policies (
  organization_id, scope_type, team_id, policy_slot, schedule_mode,
  interval_value, interval_type, created_by, updated_by
) VALUES (
  '17000000-aaaa-0000-0000-000000000001'::uuid,
  'team',
  '17000000-bbbb-0000-0000-000000000001'::uuid,
  'default',
  'custom',
  45,
  'days',
  '17000000-0000-0000-0000-000000000001'::uuid,
  '17000000-0000-0000-0000-000000000001'::uuid
);

SELECT is(
  (
    SELECT r.interval_value
    FROM public.resolve_effective_pm_interval_policy('17000000-dddd-0000-0000-000000000001'::uuid) r
    LIMIT 1
  ),
  45,
  'Team policy overrides template default for inherited equipment'
);

SELECT is(
  (
    SELECT r.source
    FROM public.resolve_effective_pm_interval_policy('17000000-dddd-0000-0000-000000000001'::uuid) r
    LIMIT 1
  ),
  'team_policy',
  'Resolver reports team_policy source'
);

-- Equipment none suppresses recurring schedule
INSERT INTO public.pm_interval_policies (
  organization_id, scope_type, equipment_id, policy_slot, schedule_mode,
  interval_value, interval_type, created_by, updated_by
) VALUES (
  '17000000-aaaa-0000-0000-000000000001'::uuid,
  'equipment',
  '17000000-dddd-0000-0000-000000000001'::uuid,
  'default',
  'none',
  NULL,
  NULL,
  '17000000-0000-0000-0000-000000000001'::uuid,
  '17000000-0000-0000-0000-000000000001'::uuid
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.resolve_effective_pm_interval_policy('17000000-dddd-0000-0000-000000000001'::uuid)
  ),
  0,
  'Equipment none policy suppresses recurring schedule'
);

-- ============================================
-- RLS: members can read, only org admins can mutate
-- ============================================

CREATE TEMP TABLE pm_interval_rls_rowcounts (
  label text PRIMARY KEY,
  affected int NOT NULL
);

GRANT INSERT, SELECT ON TABLE pm_interval_rls_rowcounts TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '17000000-0000-0000-0000-000000000002', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '17000000-0000-0000-0000-000000000002')::text,
  true
);

SELECT is(
  (SELECT count(*)::int
   FROM public.pm_interval_policies
   WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid),
  2,
  'Org member can select PM interval policies'
);

SELECT throws_ok($$
  INSERT INTO public.pm_interval_policies (
    organization_id, scope_type, team_id, policy_slot, schedule_mode,
    interval_value, interval_type, created_by, updated_by
  ) VALUES (
    '17000000-aaaa-0000-0000-000000000001'::uuid,
    'team',
    '17000000-bbbb-0000-0000-000000000002'::uuid,
    'default',
    'custom',
    30,
    'days',
    '17000000-0000-0000-0000-000000000002'::uuid,
    '17000000-0000-0000-0000-000000000002'::uuid
  );
$$, '42501', NULL, 'Non-admin org member cannot insert PM interval policies');

SELECT is(
  (SELECT count(*)::int
   FROM public.pm_interval_policies
   WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid
     AND team_id = '17000000-bbbb-0000-0000-000000000002'::uuid),
  0,
  'Rejected member insert leaves no PM interval policy row'
);

-- UPDATE/DELETE policies filter rows silently for non-admins (no 42501).
WITH u AS (
  UPDATE public.pm_interval_policies
  SET interval_value = 99
  WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid
    AND team_id = '17000000-bbbb-0000-0000-000000000001'::uuid
  RETURNING 1
)
INSERT INTO pm_interval_rls_rowcounts (label, affected)
SELECT 'member_update', count(*)::int FROM u;

SELECT is(
  (SELECT affected FROM pm_interval_rls_rowcounts WHERE label = 'member_update'),
  0,
  'Non-admin org member cannot update PM interval policies'
);

SELECT is(
  (SELECT interval_value
   FROM public.pm_interval_policies
   WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid
     AND team_id = '17000000-bbbb-0000-0000-000000000001'::uuid),
  45,
  'Team policy interval is unchanged after non-admin update attempt'
);

WITH d AS (
  DELETE FROM public.pm_interval_policies
  WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid
    AND equipment_id = '17000000-dddd-0000-0000-000000000001'::uuid
  RETURNING 1
)
INSERT INTO pm_interval_rls_rowcounts (label, affected)
SELECT 'member_delete', count(*)::int FROM d;

SELECT is(
  (SELECT affected FROM pm_interval_rls_rowcounts WHERE label = 'member_delete'),
  0,
  'Non-admin org member cannot delete PM interval policies'
);

SELECT is(
  (SELECT count(*)::int
   FROM public.pm_interval_policies
   WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid
     AND equipment_id = '17000000-dddd-0000-0000-000000000001'::uuid),
  1,
  'Equipment PM interval policy row remains after non-admin delete attempt'
);

SELECT set_config('request.jwt.claim.sub', '17000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '17000000-0000-0000-0000-000000000001')::text,
  true
);

SELECT lives_ok($$
  INSERT INTO public.pm_interval_policies (
    organization_id, scope_type, team_id, policy_slot, schedule_mode,
    interval_value, interval_type, created_by, updated_by
  ) VALUES (
    '17000000-aaaa-0000-0000-000000000001'::uuid,
    'team',
    '17000000-bbbb-0000-0000-000000000002'::uuid,
    'default',
    'custom',
    30,
    'days',
    '17000000-0000-0000-0000-000000000001'::uuid,
    '17000000-0000-0000-0000-000000000001'::uuid
  );
$$, 'Org admin can insert PM interval policies');

SELECT throws_ok($$
  INSERT INTO public.pm_interval_policies (
    organization_id, scope_type, team_id, policy_slot, schedule_mode,
    interval_value, interval_type, created_by, updated_by
  ) VALUES (
    '17000000-aaaa-0000-0000-000000000001'::uuid,
    'team',
    '17000000-bbbb-0000-0000-000000000003'::uuid,
    'default',
    'custom',
    30,
    'days',
    '17000000-0000-0000-0000-000000000001'::uuid,
    '17000000-0000-0000-0000-000000000001'::uuid
  );
$$, '42501', NULL, 'Org admin cannot attach a team from another organization');

UPDATE public.pm_interval_policies
SET interval_value = 60
WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid
  AND team_id = '17000000-bbbb-0000-0000-000000000001'::uuid;

SELECT is(
  (SELECT interval_value
   FROM public.pm_interval_policies
   WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid
     AND team_id = '17000000-bbbb-0000-0000-000000000001'::uuid),
  60,
  'Org admin can update PM interval policies'
);

DELETE FROM public.pm_interval_policies
WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid
  AND equipment_id = '17000000-dddd-0000-0000-000000000001'::uuid;

SELECT is(
  (SELECT count(*)::int
   FROM public.pm_interval_policies
   WHERE organization_id = '17000000-aaaa-0000-0000-000000000001'::uuid
     AND equipment_id = '17000000-dddd-0000-0000-000000000001'::uuid),
  0,
  'Org admin can delete PM interval policies'
);

SELECT * FROM finish();
ROLLBACK;
