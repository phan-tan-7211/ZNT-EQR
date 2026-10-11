BEGIN;
SELECT plan(25);

-- ============================================================================
-- Tooling batch 2: state-change notifications and drawing revision register.
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
  ('40000000-0000-0000-0000-000000000001'::uuid, 'tl2-owner@equipqr.test'),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'tl2-admin@equipqr.test'),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'tl2-tech@equipqr.test'),
  ('40000000-0000-0000-0000-000000000004'::uuid, 'tl2-plain@equipqr.test'),
  ('40000000-0000-0000-0000-000000000005'::uuid, 'tl2-outsider@equipqr.test')
) AS u(id, email)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name)
SELECT u.id, u.email, split_part(u.email, '@', 1)
FROM auth.users AS u
WHERE u.id::text LIKE '40000000-0000-0000-0000-%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, plan, member_count, max_members)
VALUES
  ('40000000-aaaa-0000-0000-000000000001'::uuid, 'Tooling Alerts Org', 'free', 4, 20),
  ('40000000-aaaa-0000-0000-000000000002'::uuid, 'Tooling Alerts Outsider', 'free', 1, 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_date)
VALUES
  ('40000000-aaaa-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('40000000-aaaa-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000002'::uuid, 'admin', 'active', NOW()),
  ('40000000-aaaa-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000003'::uuid, 'member', 'active', NOW()),
  ('40000000-aaaa-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000004'::uuid, 'member', 'active', NOW()),
  ('40000000-aaaa-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000005'::uuid, 'owner', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (id, organization_id, name)
VALUES ('40000000-bbbb-0000-0000-000000000001'::uuid, '40000000-aaaa-0000-0000-000000000001'::uuid, 'Alerts Team')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (team_id, user_id, role)
VALUES ('40000000-bbbb-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000003'::uuid, 'technician')
ON CONFLICT DO NOTHING;

SELECT is(has_table_privilege('authenticated', 'public.tooling_drawing_revisions', 'INSERT'), false, 'clients cannot insert revisions directly');
SELECT is(has_table_privilege('anon', 'public.tooling_drawing_revisions', 'SELECT'), false, 'anon cannot read revisions');
SELECT is(has_function_privilege('authenticated', 'public.tooling_notify_state_changes()', 'EXECUTE'), false, 'notify trigger function is not client-callable');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.create_tooling('40000000-aaaa-0000-0000-000000000001', '{"name":"Alert Die","team_id":"40000000-bbbb-0000-0000-000000000001","tooling_type":"die","usage_unit":"strokes","warning_limit":80,"life_limit":100,"responsible_user_id":"40000000-0000-0000-0000-000000000003","drawing_number":"DWG-7","drawing_revision":"A"}'::jsonb)$$,
  'owner registers a die with a responsible technician'
);
SELECT lives_ok(
  $$SELECT public.approve_tooling((SELECT id FROM public.equipment WHERE name = 'Alert Die'))$$,
  'owner approves the die'
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.record_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Alert Die'), 50)$$,
  'usage below the warning threshold'
);

RESET ROLE;
SELECT is(
  (SELECT count(*)::integer FROM public.notifications WHERE type LIKE 'tooling_%' AND organization_id = '40000000-aaaa-0000-0000-000000000001'),
  0,
  'no notification below the warning threshold'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.record_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Alert Die'), 35)$$,
  'usage crosses the warning threshold (85 / 80)'
);
SELECT lives_ok(
  $$SELECT public.record_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Alert Die'), 5)$$,
  'more usage while already in warning'
);

RESET ROLE;
SELECT is(
  (SELECT count(*)::integer FROM public.notifications WHERE type = 'tooling_life_warning' AND organization_id = '40000000-aaaa-0000-0000-000000000001'),
  3,
  'warning notifies owner, admin and the responsible technician exactly once'
);
SELECT is(
  (SELECT count(*)::integer FROM public.notifications WHERE type = 'tooling_life_warning' AND user_id = '40000000-0000-0000-0000-000000000004'),
  0,
  'plain members without responsibility are not notified'
);
SELECT is(
  (SELECT data->>'tooling_id' FROM public.notifications WHERE type = 'tooling_life_warning' LIMIT 1),
  (SELECT id::text FROM public.equipment WHERE name = 'Alert Die'),
  'notification data links to the tool'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.record_tooling_usage((SELECT id FROM public.equipment WHERE name = 'Alert Die'), 15)$$,
  'usage reaches the life limit (105 / 100)'
);
SELECT lives_ok(
  $$SELECT public.set_tooling_usability((SELECT id FROM public.equipment WHERE name = 'Alert Die'), 'quarantined', 'burr on punch')$$,
  'technician quarantines the die'
);

RESET ROLE;
SELECT is(
  (SELECT count(*)::integer FROM public.notifications WHERE type = 'tooling_life_limit' AND organization_id = '40000000-aaaa-0000-0000-000000000001'),
  3,
  'life limit notifies the same recipients once'
);
SELECT is(
  (SELECT count(*)::integer FROM public.notifications WHERE type = 'tooling_quarantined' AND organization_id = '40000000-aaaa-0000-0000-000000000001'),
  3,
  'quarantine notifies the same recipients'
);
SELECT is(
  (SELECT count(*)::integer FROM public.notifications WHERE type LIKE 'tooling_%' AND organization_id = '40000000-aaaa-0000-0000-000000000002'),
  0,
  'no tooling notifications leak to another organization'
);
SET LOCAL ROLE authenticated;

-- ---------------------------------------------------------------------------
-- Drawing revisions
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.release_tooling_drawing_revision((SELECT id FROM public.equipment WHERE name = 'Alert Die'), 'B', 'new punch radius')$$,
  '42501', 'TOOLING_PERMISSION_DENIED', 'technician cannot release a drawing revision'
);

SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.release_tooling_drawing_revision((SELECT id FROM public.equipment WHERE name = 'Alert Die'), 'B', '   ')$$,
  '22023', 'TOOLING_REASON_REQUIRED', 'a change description is required'
);
SELECT lives_ok(
  $$SELECT public.release_tooling_drawing_revision((SELECT id FROM public.equipment WHERE name = 'Alert Die'), 'B', 'new punch radius', NULL, '2026-10-01')$$,
  'admin releases revision B'
);
SELECT lives_ok(
  $$SELECT public.release_tooling_drawing_revision((SELECT id FROM public.equipment WHERE name = 'Alert Die'), 'C', 'hardened insert', 'DWG-7A')$$,
  'admin releases revision C with a new drawing number'
);
SELECT throws_ok(
  $$SELECT public.release_tooling_drawing_revision((SELECT id FROM public.equipment WHERE name = 'Alert Die'), ' b ', 'reuse')$$,
  '23505', 'TOOLING_REVISION_DUPLICATE', 'a revision cannot be released twice (case/space-insensitive)'
);
SELECT is(
  (SELECT string_agg(revision || ':' || status, ',' ORDER BY released_at, revision)
     FROM public.tooling_drawing_revisions
    WHERE tooling_equipment_id = (SELECT id FROM public.equipment WHERE name = 'Alert Die')),
  'B:superseded,C:released',
  'only the latest revision stays released'
);
SELECT is(
  (SELECT drawing_number || '/' || drawing_revision FROM public.tooling_overview WHERE name = 'Alert Die'),
  'DWG-7A/C',
  'tool drawing fields follow the released revision'
);

SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.tooling_drawing_revisions), 0, 'outsider reads no revisions');

SELECT * FROM finish();
ROLLBACK;
