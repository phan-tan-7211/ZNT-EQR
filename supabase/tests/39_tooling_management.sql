BEGIN;
SELECT plan(96);

-- ============================================================================
-- Tooling / Jig / Fixture management: registration (TL identity), product /
-- operation / machine compatibility, issue / return concurrency guard, tool
-- life, inspection + return-to-service, permissions and tenant isolation.
-- ============================================================================

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
  ('39000000-0000-0000-0000-000000000001'::uuid, 'tl-owner@equipqr.test'),
  ('39000000-0000-0000-0000-000000000002'::uuid, 'tl-admin@equipqr.test'),
  ('39000000-0000-0000-0000-000000000003'::uuid, 'tl-manager@equipqr.test'),
  ('39000000-0000-0000-0000-000000000004'::uuid, 'tl-tech@equipqr.test'),
  ('39000000-0000-0000-0000-000000000005'::uuid, 'tl-requestor@equipqr.test'),
  ('39000000-0000-0000-0000-000000000006'::uuid, 'tl-plain@equipqr.test'),
  ('39000000-0000-0000-0000-000000000007'::uuid, 'tl-outsider@equipqr.test')
) AS u(id, email)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name)
SELECT u.id, u.email, split_part(u.email, '@', 1)
FROM auth.users AS u
WHERE u.id::text LIKE '39000000-0000-0000-0000-%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, plan, member_count, max_members)
VALUES
  ('39000000-aaaa-0000-0000-000000000001'::uuid, 'Tooling Org', 'free', 6, 20),
  ('39000000-aaaa-0000-0000-000000000002'::uuid, 'Tooling Outsider Org', 'free', 1, 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_date)
VALUES
  ('39000000-aaaa-0000-0000-000000000001'::uuid, '39000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('39000000-aaaa-0000-0000-000000000001'::uuid, '39000000-0000-0000-0000-000000000002'::uuid, 'admin', 'active', NOW()),
  ('39000000-aaaa-0000-0000-000000000001'::uuid, '39000000-0000-0000-0000-000000000003'::uuid, 'member', 'active', NOW()),
  ('39000000-aaaa-0000-0000-000000000001'::uuid, '39000000-0000-0000-0000-000000000004'::uuid, 'member', 'active', NOW()),
  ('39000000-aaaa-0000-0000-000000000001'::uuid, '39000000-0000-0000-0000-000000000005'::uuid, 'member', 'active', NOW()),
  ('39000000-aaaa-0000-0000-000000000001'::uuid, '39000000-0000-0000-0000-000000000006'::uuid, 'member', 'active', NOW()),
  ('39000000-aaaa-0000-0000-000000000002'::uuid, '39000000-0000-0000-0000-000000000007'::uuid, 'owner', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (id, organization_id, name)
VALUES ('39000000-bbbb-0000-0000-000000000001'::uuid, '39000000-aaaa-0000-0000-000000000001'::uuid, 'Tooling Team')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (team_id, user_id, role)
VALUES
  ('39000000-bbbb-0000-0000-000000000001'::uuid, '39000000-0000-0000-0000-000000000003'::uuid, 'manager'),
  ('39000000-bbbb-0000-0000-000000000001'::uuid, '39000000-0000-0000-0000-000000000004'::uuid, 'technician'),
  ('39000000-bbbb-0000-0000-000000000001'::uuid, '39000000-0000-0000-0000-000000000005'::uuid, 'requestor')
ON CONFLICT DO NOTHING;

-- Machines (production equipment) in both organizations.
INSERT INTO public.equipment (id, organization_id, name, manufacturer, model, serial_number, status, location, installation_date, team_id)
VALUES
  ('39000000-cccc-0000-0000-000000000001'::uuid, '39000000-aaaa-0000-0000-000000000001'::uuid, 'Welding Robot 1', 'Acme', 'W1', 'SN-39-1', 'active', 'Line A', CURRENT_DATE, '39000000-bbbb-0000-0000-000000000001'::uuid),
  ('39000000-cccc-0000-0000-000000000002'::uuid, '39000000-aaaa-0000-0000-000000000001'::uuid, 'Welding Robot 2', 'Acme', 'W2', 'SN-39-2', 'active', 'Line A', CURRENT_DATE, '39000000-bbbb-0000-0000-000000000001'::uuid),
  ('39000000-cccc-0000-0000-000000000003'::uuid, '39000000-aaaa-0000-0000-000000000001'::uuid, 'Press 3', 'Acme', 'P3', 'SN-39-3', 'active', 'Line B', CURRENT_DATE, '39000000-bbbb-0000-0000-000000000001'::uuid),
  ('39000000-cccc-0000-0000-000000000009'::uuid, '39000000-aaaa-0000-0000-000000000002'::uuid, 'Foreign Robot', 'Acme', 'FX', 'SN-39-9', 'active', 'Elsewhere', CURRENT_DATE, NULL);

-- Foreign product part for cross-tenant checks.
INSERT INTO public.product_parts (id, organization_id, part_number, name)
VALUES ('39000000-dddd-0000-0000-000000000009'::uuid, '39000000-aaaa-0000-0000-000000000002'::uuid, 'FOREIGN-1', 'Foreign part');

-- Structural guarantees.
SELECT ok(
  (SELECT indisunique FROM pg_index WHERE indexrelid = 'public.tooling_assignments_one_active_key'::regclass),
  'one active checkout per tool is enforced by a unique index'
);
SELECT is(has_table_privilege('anon', 'public.tooling_details', 'SELECT'), false, 'anon cannot read tooling_details');
SELECT is(has_table_privilege('authenticated', 'public.tooling_assignments', 'INSERT'), false, 'authenticated cannot insert assignments directly');
SELECT is(has_table_privilege('authenticated', 'public.tooling_usage_logs', 'UPDATE'), false, 'authenticated cannot rewrite usage history');
SELECT is(has_function_privilege('authenticated', 'public.tooling_lock_for_actor(uuid, text)', 'EXECUTE'), false, 'internal lock helper is not client-callable');
SELECT is(has_function_privilege('anon', 'public.issue_tooling(uuid, uuid, uuid, uuid, uuid, text, text, text)', 'EXECUTE'), false, 'anon cannot issue tooling');

SET LOCAL ROLE authenticated;

-- ---------------------------------------------------------------------------
-- AC01 / AC04: registration with TL identity
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.create_tooling('39000000-aaaa-0000-0000-000000000001', '{"name":"Rogue Jig"}'::jsonb)$$,
  '42501', 'TOOLING_PERMISSION_DENIED', 'technician cannot register tooling'
);

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.create_tooling('39000000-aaaa-0000-0000-000000000001', '{"name":"Weld Jig A","team_id":"39000000-bbbb-0000-0000-000000000001","tooling_type":"jig","usage_unit":"cycles","warning_limit":800,"life_limit":1000,"maintenance_interval":400,"storage_location":"Rack 1","drawing_number":"DWG-100","drawing_revision":"B"}'::jsonb)$$,
  'owner registers a physical jig'
);
SELECT is(
  (SELECT e.management_code FROM public.equipment AS e WHERE e.name = 'Weld Jig A'),
  'EQ-TL-000001',
  'jig receives a stable TL management code (QR uses the equipment id)'
);
SELECT is(
  (SELECT count(*)::integer FROM public.equipment_groups AS g WHERE g.organization_id = '39000000-aaaa-0000-0000-000000000001' AND g.code = 'TL'),
  1,
  'TL group is reused/seeded rather than duplicated'
);
SELECT is(
  (SELECT approval_status FROM public.tooling_overview WHERE name = 'Weld Jig A'),
  'pending',
  'new tooling starts unapproved'
);
SELECT lives_ok(
  $$SELECT public.create_tooling('39000000-aaaa-0000-0000-000000000001', '{"name":"Hand Gauge","team_id":"39000000-bbbb-0000-0000-000000000001","tooling_type":"checking_fixture","requires_machine":false}'::jsonb)$$,
  'owner registers manually operated tooling'
);
SELECT is(
  (SELECT requires_machine FROM public.tooling_overview WHERE name = 'Hand Gauge'),
  false,
  'manual tooling does not require a machine'
);
SELECT throws_ok(
  $$SELECT public.create_tooling('39000000-aaaa-0000-0000-000000000001', jsonb_build_object('equipment_id', (SELECT id FROM public.equipment WHERE name = 'Weld Jig A')))$$,
  '23505', 'TOOLING_ALREADY_REGISTERED', 'equipment cannot be registered twice'
);
SELECT throws_ok(
  $$SELECT public.create_tooling('39000000-aaaa-0000-0000-000000000001', '{"equipment_id":"39000000-cccc-0000-0000-000000000009"}'::jsonb)$$,
  '23514', 'TOOLING_CROSS_ORGANIZATION', 'cannot enroll equipment from another organization'
);

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------
SELECT lives_ok(
  $$INSERT INTO public.product_parts (id, organization_id, part_number, name, customer_name) VALUES
      ('39000000-dddd-0000-0000-000000000001', '39000000-aaaa-0000-0000-000000000001', 'pn-100', 'Bracket LH', 'OEM'),
      ('39000000-dddd-0000-0000-000000000002', '39000000-aaaa-0000-0000-000000000001', 'PN-200', 'Bracket RH', 'OEM')$$,
  'admin creates product parts'
);
SELECT is(
  (SELECT part_number FROM public.product_parts WHERE id = '39000000-dddd-0000-0000-000000000001'),
  'PN-100',
  'part numbers are normalized'
);
SELECT throws_ok(
  $$INSERT INTO public.product_parts (organization_id, part_number, name) VALUES ('39000000-aaaa-0000-0000-000000000001', ' PN-100 ', 'Dup')$$,
  '23505', NULL, 'duplicate part number rejected'
);
SELECT lives_ok(
  $$INSERT INTO public.production_operations (id, organization_id, code, name, operation_type) VALUES
      ('39000000-eeee-0000-0000-000000000001', '39000000-aaaa-0000-0000-000000000001', 'OP10', 'Spot welding', 'welding')$$,
  'admin creates a production operation'
);

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
SELECT throws_ok(
  $$INSERT INTO public.product_parts (organization_id, part_number, name) VALUES ('39000000-aaaa-0000-0000-000000000001', 'PN-999', 'Nope')$$,
  '42501', NULL, 'plain member cannot create product parts'
);

-- ---------------------------------------------------------------------------
-- AC02 / AC03: compatibility (two products, two machines, one operation)
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-dddd-0000-0000-000000000001')$$,
  '42501', 'TOOLING_PERMISSION_DENIED', 'technician cannot define compatibility'
);

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-dddd-0000-0000-000000000001', '39000000-eeee-0000-0000-000000000001', '39000000-cccc-0000-0000-000000000001', 'B')$$,
  'rule: jig x PN-100 x OP10 x robot 1'
);
SELECT lives_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-dddd-0000-0000-000000000001', '39000000-eeee-0000-0000-000000000001', '39000000-cccc-0000-0000-000000000002', 'B')$$,
  'rule: jig x PN-100 x OP10 x robot 2'
);
SELECT lives_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-dddd-0000-0000-000000000002', '39000000-eeee-0000-0000-000000000001', '39000000-cccc-0000-0000-000000000001', 'B')$$,
  'rule: jig x PN-200 x OP10 x robot 1'
);
SELECT is(
  (SELECT count(DISTINCT product_part_id)::integer FROM public.tooling_compatibility WHERE tooling_equipment_id = (SELECT id FROM public.equipment WHERE name = 'Weld Jig A')),
  2,
  'one jig is associated with two product numbers'
);
SELECT is(
  (SELECT count(DISTINCT machine_equipment_id)::integer FROM public.tooling_compatibility WHERE tooling_equipment_id = (SELECT id FROM public.equipment WHERE name = 'Weld Jig A')),
  2,
  'one jig is compatible with two machines'
);
SELECT is(
  (SELECT count(*)::integer FROM public.tooling_compatibility WHERE approval_status = 'pending' AND tooling_equipment_id = (SELECT id FROM public.equipment WHERE name = 'Weld Jig A')),
  3,
  'new rules require explicit approval'
);
SELECT is(
  (SELECT count(*)::integer FROM public.tooling_assignments WHERE tooling_equipment_id = (SELECT id FROM public.equipment WHERE name = 'Weld Jig A')),
  0,
  'compatibility does not assign the tool to any machine'
);
SELECT throws_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-dddd-0000-0000-000000000001', '39000000-eeee-0000-0000-000000000001', '39000000-cccc-0000-0000-000000000001')$$,
  '23505', 'TOOLING_COMPATIBILITY_DUPLICATE', 'duplicate active rule rejected'
);
SELECT throws_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-dddd-0000-0000-000000000001', NULL, '39000000-cccc-0000-0000-000000000009')$$,
  '23514', 'TOOLING_CROSS_ORGANIZATION', 'machine from another organization rejected'
);
SELECT throws_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-dddd-0000-0000-000000000009')$$,
  '23514', 'TOOLING_CROSS_ORGANIZATION', 'product part from another organization rejected'
);
SELECT throws_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-dddd-0000-0000-000000000001', NULL, (SELECT id FROM public.equipment WHERE name = 'Hand Gauge'))$$,
  '23514', 'TOOLING_MACHINE_IS_TOOL', 'a tool cannot be used as the machine'
);
SELECT lives_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Hand Gauge'), '39000000-dddd-0000-0000-000000000001')$$,
  'manual tooling rule without operation or machine'
);
SELECT throws_ok(
  $$SELECT public.create_tooling_compatibility((SELECT id FROM public.equipment WHERE name = 'Hand Gauge'), '39000000-dddd-0000-0000-000000000001')$$,
  '23505', 'TOOLING_COMPATIBILITY_DUPLICATE', 'NULL operation/machine still participates in duplicate check'
);
SELECT lives_ok(
  $$SELECT public.set_tooling_compatibility_status(c.id, 'approve') FROM public.tooling_compatibility AS c
     WHERE c.tooling_equipment_id = (SELECT id FROM public.equipment WHERE name = 'Weld Jig A')
       AND c.product_part_id = '39000000-dddd-0000-0000-000000000001'$$,
  'admin approves the PN-100 rules (PN-200 stays pending)'
);

-- ---------------------------------------------------------------------------
-- AC08 (unapproved), AC13 (unauthorized), AC05 / AC06 / AC07 issue-return
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000003')$$,
  '22023', 'TOOLING_NOT_APPROVED', 'unapproved jig cannot be issued'
);

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.approve_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'PPAP approved')$$,
  'owner approves the jig for production use'
);

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000005')$$,
  '42501', 'TOOLING_PERMISSION_DENIED', 'team requestor cannot issue tooling'
);
SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000006')$$,
  '42501', 'TOOLING_PERMISSION_DENIED', 'plain member cannot issue tooling'
);
SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000007","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT td.equipment_id FROM public.tooling_details AS td LIMIT 1), '39000000-0000-0000-0000-000000000007')$$,
  'P0002', 'TOOLING_NOT_FOUND', 'outsider cannot see or issue another tenant''s tool'
);
SELECT is((SELECT count(*)::integer FROM public.tooling_overview), 0, 'outsider reads no tooling rows');
SELECT is((SELECT count(*)::integer FROM public.tooling_events), 0, 'outsider reads no tooling history');

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000003', '39000000-cccc-0000-0000-000000000001', '39000000-dddd-0000-0000-000000000002', '39000000-eeee-0000-0000-000000000001')$$,
  '22023', 'TOOLING_INCOMPATIBLE_CONTEXT', 'pending (unapproved) rule cannot authorize an issue'
);
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000003', '39000000-cccc-0000-0000-000000000003')$$,
  '22023', 'TOOLING_INCOMPATIBLE_CONTEXT', 'incompatible machine rejected'
);
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000007')$$,
  '22023', 'TOOLING_HOLDER_NOT_MEMBER', 'cannot issue to someone outside the organization'
);
SELECT lives_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000003', '39000000-cccc-0000-0000-000000000002', '39000000-dddd-0000-0000-000000000001', '39000000-eeee-0000-0000-000000000001', 'Line A cell 2', 'good')$$,
  'technician issues the compatible jig to the manager'
);
SELECT ok(
  (SELECT compatibility_id IS NOT NULL FROM public.tooling_assignments WHERE status = 'active' AND tooling_equipment_id = (SELECT id FROM public.equipment WHERE name = 'Weld Jig A')),
  'assignment records the approved compatibility rule it used'
);
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000004')$$,
  '23505', 'TOOLING_ALREADY_ISSUED', 'second simultaneous checkout is rejected'
);
SELECT throws_ok(
  $$INSERT INTO public.tooling_assignments (organization_id, tooling_equipment_id, issued_to_user_id, issued_by, condition_at_issue)
    VALUES ('39000000-aaaa-0000-0000-000000000001', (SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000004', '39000000-0000-0000-0000-000000000004', 'good')$$,
  '42501', NULL, 'direct assignment inserts bypassing the RPC are refused'
);
SELECT throws_ok(
  $$UPDATE public.tooling_details SET usability_state = 'available', cumulative_usage = 0$$,
  '42501', NULL, 'direct tooling_details updates are refused'
);
SELECT throws_ok(
  $$SELECT public.transfer_tooling_location((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'Rack 9')$$,
  '22023', 'TOOLING_ISSUED_RETURN_FIRST', 'cannot transfer storage while issued'
);
SELECT lives_ok(
  $$SELECT public.return_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'good', 'Rack 2', 500, 'shift end')$$,
  'technician returns the jig with 500 cycles'
);
SELECT lives_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000004')$$,
  'jig can be issued again after return (no context)'
);
SELECT lives_ok(
  $$SELECT public.return_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'good')$$,
  'second return'
);
SELECT throws_ok(
  $$SELECT public.return_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'good', NULL, -5)$$,
  '22023', 'TOOLING_INVALID_QUANTITY', 'negative usage on return is rejected'
);
SELECT is(
  (SELECT count(*)::integer FROM public.tooling_assignments WHERE status = 'returned' AND tooling_equipment_id = (SELECT id FROM public.equipment WHERE name = 'Weld Jig A')),
  2,
  'historical assignments are preserved'
);
SELECT is(
  (SELECT storage_location FROM public.tooling_overview WHERE name = 'Weld Jig A'),
  'Rack 2',
  'return location becomes the current storage location'
);

-- ---------------------------------------------------------------------------
-- AC09 / AC10: usage and life
-- ---------------------------------------------------------------------------
SELECT lives_ok(
  $$SELECT public.record_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 300, 290)$$,
  'technician records 300 cycles'
);
SELECT is((SELECT cumulative_usage FROM public.tooling_overview WHERE name = 'Weld Jig A'), 800::numeric, 'cumulative usage = 800');
SELECT is((SELECT remaining_life FROM public.tooling_overview WHERE name = 'Weld Jig A'), 200::numeric, 'remaining life = 1000 - 800');
SELECT is((SELECT warning_reached FROM public.tooling_overview WHERE name = 'Weld Jig A'), true, 'warning threshold reached at 800');
SELECT is((SELECT maintenance_due FROM public.tooling_overview WHERE name = 'Weld Jig A'), true, 'maintenance interval (400) exceeded');
SELECT throws_ok(
  $$SELECT public.record_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 0)$$,
  '22023', 'TOOLING_INVALID_QUANTITY', 'usage must be positive'
);
SELECT lives_ok(
  $$SELECT public.record_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 250)$$,
  'usage beyond the life limit is still recorded'
);
SELECT is((SELECT life_limit_reached FROM public.tooling_overview WHERE name = 'Weld Jig A'), true, 'life limit reached at 1050');
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000004')$$,
  '22023', 'TOOLING_LIFE_LIMIT_REACHED', 'tool over hard limit cannot be issued'
);
SELECT throws_ok(
  $$SELECT public.record_tooling_limit_disposition((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'extend_life', 1500, 'refurbished')$$,
  '42501', 'TOOLING_PERMISSION_DENIED', 'technician cannot authorize a life-limit disposition'
);
SELECT throws_ok(
  $$SELECT public.correct_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), -50, 'miscount')$$,
  '42501', 'TOOLING_PERMISSION_DENIED', 'technician cannot correct usage'
);

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.set_tooling_life_limits((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'cycles', 800, 2000, 400, NULL)$$,
  '22023', 'TOOLING_DISPOSITION_REQUIRED', 'raising a reached limit requires a disposition'
);
SELECT throws_ok(
  $$SELECT public.set_tooling_life_limits((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'shots', 800, 1000, 400, NULL)$$,
  '22023', 'TOOLING_UNIT_LOCKED', 'usage unit is locked once usage exists'
);
SELECT throws_ok(
  $$SELECT public.correct_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), -50, '  ')$$,
  '22023', 'TOOLING_REASON_REQUIRED', 'corrections require a reason'
);
SELECT lives_ok(
  $$SELECT public.correct_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), -50, 'counter double-count on shift 2')$$,
  'owner corrects usage with a reason'
);
SELECT is((SELECT cumulative_usage FROM public.tooling_overview WHERE name = 'Weld Jig A'), 1000::numeric, 'corrected cumulative usage = 1000');
SELECT lives_ok(
  $$SELECT public.record_tooling_limit_disposition((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'extend_life', 1500, 'refurbished and re-validated')$$,
  'owner records an extend-life disposition'
);
SELECT is((SELECT life_limit_reached FROM public.tooling_overview WHERE name = 'Weld Jig A'), false, 'jig usable again after disposition');

-- ---------------------------------------------------------------------------
-- AC08 (defective) / AC11 / AC12: repair, inspection, return to service
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000004')$$,
  'issue before damage'
);
SELECT lives_ok(
  $$SELECT public.return_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'damaged', NULL, NULL, 'cracked locator pin')$$,
  'returned damaged'
);
SELECT is((SELECT usability_state FROM public.tooling_overview WHERE name = 'Weld Jig A'), 'quarantined', 'damaged return quarantines the jig');
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000004')$$,
  '22023', 'TOOLING_NOT_USABLE', 'defective jig cannot be issued'
);

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.set_tooling_usability((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'under_repair', 'replace locator pin')$$,
  'owner sends the jig to repair'
);
SELECT lives_ok(
  $$INSERT INTO public.work_orders (id, organization_id, equipment_id, title, description, created_by, status, priority, team_id)
    VALUES ('39000000-ffff-0000-0000-000000000001', '39000000-aaaa-0000-0000-000000000001', (SELECT id FROM public.equipment WHERE name = 'Weld Jig A'),
            'Repair locator pin', 'Replace cracked pin', '39000000-0000-0000-0000-000000000001', 'submitted', 'high', '39000000-bbbb-0000-0000-000000000001')$$,
  'repair work order is an ordinary work order on the jig equipment'
);

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.record_tooling_verification((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'post_repair', 'pass', 'pin replaced', '39000000-ffff-0000-0000-000000000001', true, true)$$,
  '42501', 'TOOLING_PERMISSION_DENIED', 'technician cannot authorize return to service'
);
SELECT lives_ok(
  $$SELECT public.record_tooling_verification((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'post_repair', 'pass', 'pin replaced, dims OK', '39000000-ffff-0000-0000-000000000001', true, false)$$,
  'technician records the post-repair inspection'
);
SELECT is((SELECT usability_state FROM public.tooling_overview WHERE name = 'Weld Jig A'), 'under_repair', 'inspection alone does not release the jig');
SELECT throws_ok(
  $$SELECT public.record_tooling_verification((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'post_repair', 'pass', NULL, '39000000-0000-0000-0000-00000000dead')$$,
  '23514', 'TOOLING_WORK_ORDER_MISMATCH', 'inspection cannot link a work order of another asset'
);

SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.record_tooling_verification((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'post_repair', 'conditional', NULL, NULL, false, true)$$,
  '22023', 'TOOLING_RTS_REQUIRES_PASS', 'return to service requires a pass'
);
SELECT lives_ok(
  $$SELECT public.record_tooling_verification((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'post_repair', 'pass', 'released by QA', '39000000-ffff-0000-0000-000000000001', false, true)$$,
  'owner authorizes return to service'
);
SELECT is((SELECT usability_state FROM public.tooling_overview WHERE name = 'Weld Jig A'), 'available', 'jig is available after authorized release');
SELECT is((SELECT cumulative_usage FROM public.tooling_overview WHERE name = 'Weld Jig A'), 1000::numeric, 'maintenance never resets lifetime usage');
SELECT is((SELECT usage_since_maintenance FROM public.tooling_overview WHERE name = 'Weld Jig A'), 0::numeric, 'maintenance resets the since-maintenance counter');
SELECT is(
  (SELECT count(*)::integer FROM public.tooling_verifications WHERE work_order_id = '39000000-ffff-0000-0000-000000000001' AND returned_to_service AND approved_by = '39000000-0000-0000-0000-000000000001'),
  1,
  'return-to-service authorization is recorded against the repair work order'
);
SELECT ok(
  (SELECT count(*) > 0 FROM public.audit_log WHERE entity_id = (SELECT id FROM public.equipment WHERE name = 'Weld Jig A') AND metadata->>'source' = 'tooling'),
  'tooling events are mirrored to the organization audit log'
);

-- Inspection overdue blocks issue (state set by the test harness as postgres).
RESET ROLE;
UPDATE public.tooling_details SET next_inspection_due = CURRENT_DATE - 1
WHERE equipment_id = (SELECT id FROM public.equipment WHERE name = 'Weld Jig A');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.issue_tooling((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), '39000000-0000-0000-0000-000000000004')$$,
  '22023', 'TOOLING_INSPECTION_OVERDUE', 'overdue inspection blocks issue'
);

-- Retirement is terminal and tools with history cannot be hard-deleted.
SELECT set_config('request.jwt.claims', '{"sub":"39000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.set_tooling_usability((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'retired', 'end of program')$$,
  'owner retires the jig'
);
SELECT throws_ok(
  $$SELECT public.set_tooling_usability((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'), 'blocked', 'oops')$$,
  '22023', 'TOOLING_RETIRED', 'retired is terminal'
);
SELECT is(
  (SELECT public.delete_equipment_cascade((SELECT id FROM public.equipment WHERE name = 'Weld Jig A'))->>'success'),
  'false',
  'a tool with recorded history cannot be hard-deleted'
);

SELECT * FROM finish();
ROLLBACK;
