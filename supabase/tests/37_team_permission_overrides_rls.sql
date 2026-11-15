BEGIN;
SELECT plan(39);

-- ============================================================================
-- Equipment and work order write permissions are enforced by RLS per role,
-- with owner-configurable team-role overrides (has_team_permission).
-- Blocked UPDATE/DELETE under RLS affect 0 rows, so those are asserted with
-- row counts via test37_exec; blocked INSERTs raise 42501.
-- ============================================================================

CREATE FUNCTION public.test37_exec(p_sql text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows integer;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;
GRANT EXECUTE ON FUNCTION public.test37_exec(text) TO authenticated;

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
SELECT u.id, '00000000-0000-0000-0000-000000000000'::uuid, u.email, extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('name', u.email),
  false, 'authenticated', 'authenticated', '', '', '', ''
FROM (VALUES
  ('37000000-0000-0000-0000-000000000001'::uuid, 'perm-owner@znteqr.test'),
  ('37000000-0000-0000-0000-000000000002'::uuid, 'perm-admin@znteqr.test'),
  ('37000000-0000-0000-0000-000000000003'::uuid, 'perm-manager@znteqr.test'),
  ('37000000-0000-0000-0000-000000000004'::uuid, 'perm-tech@znteqr.test'),
  ('37000000-0000-0000-0000-000000000005'::uuid, 'perm-requestor@znteqr.test'),
  ('37000000-0000-0000-0000-000000000006'::uuid, 'perm-viewer@znteqr.test'),
  ('37000000-0000-0000-0000-000000000007'::uuid, 'perm-plain@znteqr.test'),
  ('37000000-0000-0000-0000-000000000008'::uuid, 'perm-outsider@znteqr.test')
) AS u(id, email)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, plan, member_count, max_members)
VALUES
  ('37000000-aaaa-0000-0000-000000000001'::uuid, 'Permission Lock Org', 'free', 7, 20),
  ('37000000-aaaa-0000-0000-000000000002'::uuid, 'Outsider Org', 'free', 1, 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_date)
VALUES
  ('37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000002'::uuid, 'admin', 'active', NOW()),
  ('37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000003'::uuid, 'member', 'active', NOW()),
  ('37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000004'::uuid, 'member', 'active', NOW()),
  ('37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000005'::uuid, 'requestor', 'active', NOW()),
  ('37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000006'::uuid, 'viewer', 'active', NOW()),
  ('37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000007'::uuid, 'member', 'active', NOW()),
  ('37000000-aaaa-0000-0000-000000000002'::uuid, '37000000-0000-0000-0000-000000000008'::uuid, 'owner', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (id, organization_id, name)
VALUES ('37000000-bbbb-0000-0000-000000000001'::uuid, '37000000-aaaa-0000-0000-000000000001'::uuid, 'Permission Lock Team')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (team_id, user_id, role)
VALUES
  ('37000000-bbbb-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000003'::uuid, 'manager'),
  ('37000000-bbbb-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000004'::uuid, 'technician'),
  ('37000000-bbbb-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000005'::uuid, 'requestor'),
  ('37000000-bbbb-0000-0000-000000000001'::uuid, '37000000-0000-0000-0000-000000000006'::uuid, 'viewer')
ON CONFLICT DO NOTHING;

-- E1 team equipment, E2 unassigned, E3/E4 disposable team equipment.
INSERT INTO public.equipment (id, organization_id, name, manufacturer, model, serial_number, status, location, installation_date, team_id)
VALUES
  ('37000000-cccc-0000-0000-000000000001'::uuid, '37000000-aaaa-0000-0000-000000000001'::uuid, 'Lock Press', 'Acme', 'P1', 'SN-37-1', 'active', 'A', CURRENT_DATE, '37000000-bbbb-0000-0000-000000000001'::uuid),
  ('37000000-cccc-0000-0000-000000000002'::uuid, '37000000-aaaa-0000-0000-000000000001'::uuid, 'Lock Unassigned', 'Acme', 'P2', 'SN-37-2', 'active', 'A', CURRENT_DATE, NULL),
  ('37000000-cccc-0000-0000-000000000003'::uuid, '37000000-aaaa-0000-0000-000000000001'::uuid, 'Lock Spare 3', 'Acme', 'P3', 'SN-37-3', 'active', 'A', CURRENT_DATE, '37000000-bbbb-0000-0000-000000000001'::uuid),
  ('37000000-cccc-0000-0000-000000000004'::uuid, '37000000-aaaa-0000-0000-000000000001'::uuid, 'Lock Spare 4', 'Acme', 'P4', 'SN-37-4', 'active', 'A', CURRENT_DATE, '37000000-bbbb-0000-0000-000000000001'::uuid);

-- W1 created by the owner (not the requestor), W2 and W3 disposable.
INSERT INTO public.work_orders (id, organization_id, equipment_id, title, description, created_by, status, priority)
VALUES
  ('37000000-dddd-0000-0000-000000000001'::uuid, '37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-cccc-0000-0000-000000000001'::uuid, 'Owner WO', 'x', '37000000-0000-0000-0000-000000000001'::uuid, 'submitted', 'medium'),
  ('37000000-dddd-0000-0000-000000000002'::uuid, '37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-cccc-0000-0000-000000000001'::uuid, 'Owner WO 2', 'x', '37000000-0000-0000-0000-000000000001'::uuid, 'submitted', 'medium'),
  ('37000000-dddd-0000-0000-000000000003'::uuid, '37000000-aaaa-0000-0000-000000000001'::uuid, '37000000-cccc-0000-0000-000000000001'::uuid, 'Owner WO 3', 'x', '37000000-0000-0000-0000-000000000001'::uuid, 'submitted', 'medium');

SET LOCAL ROLE authenticated;

-- ── Equipment: update ───────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'admin' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 1, 'org admin can update team equipment');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'manager' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 1, 'team manager can update team equipment');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'tech' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 1, 'team technician can update team equipment by default');
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'tech' WHERE id = '37000000-cccc-0000-0000-000000000002'$$), 0, 'team technician cannot update unassigned equipment');
SELECT throws_ok(
  $$UPDATE public.equipment SET team_id = NULL WHERE id = '37000000-cccc-0000-0000-000000000001'$$,
  '42501', NULL, 'team technician cannot move equipment off their team'
);

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'req' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 0, 'team requestor cannot update equipment');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'viewer' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 0, 'team viewer cannot update equipment');
SELECT is(public.test37_exec($$DELETE FROM public.equipment WHERE id = '37000000-cccc-0000-0000-000000000003'$$), 0, 'team viewer cannot delete equipment');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000007","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'plain' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 0, 'plain member without a team cannot update equipment');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'outsider' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 0, 'outsider cannot update equipment');

-- ── Equipment: insert and delete ───────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT lives_ok(
  $$INSERT INTO public.equipment (organization_id, name, manufacturer, model, serial_number, status, location, installation_date, team_id)
    VALUES ('37000000-aaaa-0000-0000-000000000001', 'Manager Created', 'Acme', 'M', 'SN-37-M', 'active', 'A', CURRENT_DATE, '37000000-bbbb-0000-0000-000000000001')$$,
  'team manager can create team equipment'
);
SELECT is(public.test37_exec($$DELETE FROM public.equipment WHERE id = '37000000-cccc-0000-0000-000000000003'$$), 0, 'team manager cannot delete equipment');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT throws_ok(
  $$INSERT INTO public.equipment (organization_id, name, manufacturer, model, serial_number, status, location, installation_date, team_id)
    VALUES ('37000000-aaaa-0000-0000-000000000001', 'Requestor Created', 'Acme', 'R', 'SN-37-R', 'active', 'A', CURRENT_DATE, '37000000-bbbb-0000-0000-000000000001')$$,
  '42501', NULL, 'team requestor cannot create equipment'
);

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is(public.test37_exec($$DELETE FROM public.equipment WHERE id = '37000000-cccc-0000-0000-000000000004'$$), 1, 'org admin can delete equipment');

-- ── Overrides ──────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.set_team_permission_override('37000000-aaaa-0000-0000-000000000001', 'requestor', 'equipment.update', true)$$,
  '42501', NULL, 'org admin cannot change permission overrides'
);
SELECT is(
  (SELECT count(*)::integer FROM public.get_team_permission_settings('37000000-aaaa-0000-0000-000000000001')),
  28, 'org admin can read the permission settings for every configurable key'
);

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.get_team_permission_settings('37000000-aaaa-0000-0000-000000000001')$$,
  '42501', NULL, 'team manager cannot read permission settings'
);

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.set_team_permission_override('37000000-aaaa-0000-0000-000000000001', 'requestor', 'equipment.update', true)$$,
  'owner can allow requestors to update equipment'
);
SELECT lives_ok(
  $$SELECT public.set_team_permission_override('37000000-aaaa-0000-0000-000000000001', 'technician', 'equipment.update', false)$$,
  'owner can stop technicians from updating equipment'
);
SELECT throws_ok(
  $$SELECT public.set_team_permission_override('37000000-aaaa-0000-0000-000000000001', 'manager', 'equipment.archive', true)$$,
  '22023', NULL, 'unknown permission keys are rejected'
);

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'req-allowed' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 1, 'team requestor can update equipment once allowed');
SELECT is(
  (SELECT count(*)::integer FROM public.get_my_team_permissions('37000000-aaaa-0000-0000-000000000001')),
  1, 'requestor sees only the permissions granted to their team role'
);

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'tech2' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 0, 'team technician cannot update equipment once disallowed');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.set_team_permission_override('37000000-aaaa-0000-0000-000000000001', 'technician', 'equipment.update', NULL)$$,
  'owner can restore the default'
);
SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.equipment SET location = 'tech3' WHERE id = '37000000-cccc-0000-0000-000000000001'$$), 1, 'team technician can update again after default is restored');

-- ── Work orders ────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT lives_ok(
  $$INSERT INTO public.work_orders (id, organization_id, equipment_id, title, description, created_by, status, priority)
    VALUES ('37000000-dddd-0000-0000-000000000010', '37000000-aaaa-0000-0000-000000000001', '37000000-cccc-0000-0000-000000000001', 'Requestor WO', 'x', '37000000-0000-0000-0000-000000000005', 'submitted', 'low')$$,
  'team requestor can create a work order'
);
SELECT throws_ok(
  $$INSERT INTO public.work_orders (organization_id, equipment_id, title, description, created_by, status, priority)
    VALUES ('37000000-aaaa-0000-0000-000000000001', '37000000-cccc-0000-0000-000000000001', 'Spoofed', 'x', '37000000-0000-0000-0000-000000000001', 'submitted', 'low')$$,
  '42501', NULL, 'work order created_by must be the caller'
);
SELECT is(public.test37_exec($$UPDATE public.work_orders SET title = 'edited' WHERE id = '37000000-dddd-0000-0000-000000000010'$$), 1, 'creator can edit their submitted request');
SELECT is(public.test37_exec($$UPDATE public.work_orders SET title = 'hijack' WHERE id = '37000000-dddd-0000-0000-000000000001'$$), 0, 'requestor cannot edit a work order they did not create');
SELECT is(public.test37_exec($$UPDATE public.work_orders SET status = 'cancelled' WHERE id = '37000000-dddd-0000-0000-000000000010'$$), 1, 'creator can cancel their submitted request');
SELECT is(public.test37_exec($$UPDATE public.work_orders SET title = 'after cancel' WHERE id = '37000000-dddd-0000-0000-000000000010'$$), 0, 'creator cannot edit after the request leaves submitted');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000007","role":"authenticated"}', true);
SELECT throws_ok(
  $$INSERT INTO public.work_orders (organization_id, equipment_id, title, description, created_by, status, priority, is_historical, created_by_admin)
    VALUES ('37000000-aaaa-0000-0000-000000000001', '37000000-cccc-0000-0000-000000000001', 'Historical', 'x', '37000000-0000-0000-0000-000000000007', 'completed', 'low', true, '37000000-0000-0000-0000-000000000007')$$,
  '42501', NULL, 'plain member cannot create historical work orders'
);
SELECT is(public.test37_exec($$DELETE FROM public.work_orders WHERE id = '37000000-dddd-0000-0000-000000000001'$$), 0, 'plain member cannot delete a work order');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.work_orders SET status = 'accepted' WHERE id = '37000000-dddd-0000-0000-000000000001'$$), 1, 'team technician can change status of a team work order');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
SELECT is(public.test37_exec($$UPDATE public.work_orders SET title = 'viewer' WHERE id = '37000000-dddd-0000-0000-000000000002'$$), 0, 'team viewer cannot update a work order');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is(public.test37_exec($$DELETE FROM public.work_orders WHERE id = '37000000-dddd-0000-0000-000000000002'$$), 0, 'team manager cannot delete work orders by default');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is(public.test37_exec($$DELETE FROM public.work_orders WHERE id = '37000000-dddd-0000-0000-000000000003'$$), 1, 'org admin can delete a work order');

SELECT set_config('request.jwt.claims', '{"sub":"37000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
SELECT throws_ok(
  $$INSERT INTO public.work_orders (organization_id, equipment_id, title, description, created_by, status, priority)
    VALUES ('37000000-aaaa-0000-0000-000000000001', '37000000-cccc-0000-0000-000000000001', 'Outsider', 'x', '37000000-0000-0000-0000-000000000008', 'submitted', 'low')$$,
  '42501', NULL, 'outsider cannot create a work order in another organization'
);

RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.audit_log
   WHERE organization_id = '37000000-aaaa-0000-0000-000000000001'
     AND entity_type = 'organization'
     AND changes ? 'team_permission'),
  3, 'each permission change is written to the audit log'
);

SELECT * FROM finish();
ROLLBACK;
