BEGIN;
SELECT plan(26);

-- ============================================================================
-- Phase 2 configurable team permissions: equipment/work order delete cascades
-- and team / team member management.
-- ============================================================================

CREATE FUNCTION public.test38_exec(p_sql text)
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
GRANT EXECUTE ON FUNCTION public.test38_exec(text) TO authenticated;

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
  ('38000000-0000-0000-0000-000000000001'::uuid, 'p2-owner@znteqr.test'),
  ('38000000-0000-0000-0000-000000000002'::uuid, 'p2-admin@znteqr.test'),
  ('38000000-0000-0000-0000-000000000003'::uuid, 'p2-manager@znteqr.test'),
  ('38000000-0000-0000-0000-000000000004'::uuid, 'p2-tech@znteqr.test'),
  ('38000000-0000-0000-0000-000000000005'::uuid, 'p2-requestor@znteqr.test'),
  ('38000000-0000-0000-0000-000000000006'::uuid, 'p2-plain@znteqr.test'),
  ('38000000-0000-0000-0000-000000000007'::uuid, 'p2-outsider@znteqr.test')
) AS u(id, email)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, plan, member_count, max_members)
VALUES
  ('38000000-aaaa-0000-0000-000000000001'::uuid, 'Phase 2 Org', 'free', 6, 20),
  ('38000000-aaaa-0000-0000-000000000002'::uuid, 'Phase 2 Outsider Org', 'free', 1, 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_date)
VALUES
  ('38000000-aaaa-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('38000000-aaaa-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000002'::uuid, 'admin', 'active', NOW()),
  ('38000000-aaaa-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000003'::uuid, 'member', 'active', NOW()),
  ('38000000-aaaa-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000004'::uuid, 'member', 'active', NOW()),
  ('38000000-aaaa-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000005'::uuid, 'member', 'active', NOW()),
  ('38000000-aaaa-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000006'::uuid, 'member', 'active', NOW()),
  ('38000000-aaaa-0000-0000-000000000002'::uuid, '38000000-0000-0000-0000-000000000007'::uuid, 'owner', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (id, organization_id, name)
VALUES
  ('38000000-bbbb-0000-0000-000000000001'::uuid, '38000000-aaaa-0000-0000-000000000001'::uuid, 'Phase 2 Team'),
  ('38000000-bbbb-0000-0000-000000000002'::uuid, '38000000-aaaa-0000-0000-000000000001'::uuid, 'Other Team')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (team_id, user_id, role)
VALUES
  ('38000000-bbbb-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000001'::uuid, 'owner'),
  ('38000000-bbbb-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000003'::uuid, 'manager'),
  ('38000000-bbbb-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000004'::uuid, 'technician'),
  ('38000000-bbbb-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000005'::uuid, 'requestor')
ON CONFLICT DO NOTHING;

INSERT INTO public.equipment (id, organization_id, name, manufacturer, model, serial_number, status, location, installation_date, team_id)
VALUES
  ('38000000-cccc-0000-0000-000000000001'::uuid, '38000000-aaaa-0000-0000-000000000001'::uuid, 'P2 Press', 'Acme', 'P1', 'SN-38-1', 'active', 'A', CURRENT_DATE, '38000000-bbbb-0000-0000-000000000001'::uuid),
  ('38000000-cccc-0000-0000-000000000002'::uuid, '38000000-aaaa-0000-0000-000000000001'::uuid, 'P2 Lift', 'Acme', 'P2', 'SN-38-2', 'active', 'A', CURRENT_DATE, '38000000-bbbb-0000-0000-000000000001'::uuid),
  ('38000000-cccc-0000-0000-000000000003'::uuid, '38000000-aaaa-0000-0000-000000000001'::uuid, 'P2 Spare', 'Acme', 'P3', 'SN-38-3', 'active', 'A', CURRENT_DATE, '38000000-bbbb-0000-0000-000000000001'::uuid);

INSERT INTO public.work_orders (id, organization_id, equipment_id, title, description, created_by, status, priority)
VALUES
  ('38000000-dddd-0000-0000-000000000001'::uuid, '38000000-aaaa-0000-0000-000000000001'::uuid, '38000000-cccc-0000-0000-000000000001'::uuid, 'WO on press', 'x', '38000000-0000-0000-0000-000000000001'::uuid, 'submitted', 'medium'),
  ('38000000-dddd-0000-0000-000000000002'::uuid, '38000000-aaaa-0000-0000-000000000001'::uuid, '38000000-cccc-0000-0000-000000000002'::uuid, 'WO on lift', 'x', '38000000-0000-0000-0000-000000000001'::uuid, 'submitted', 'medium'),
  ('38000000-dddd-0000-0000-000000000003'::uuid, '38000000-aaaa-0000-0000-000000000001'::uuid, '38000000-cccc-0000-0000-000000000002'::uuid, 'WO on lift 2', 'x', '38000000-0000-0000-0000-000000000001'::uuid, 'submitted', 'medium');

INSERT INTO public.equipment_notes (id, equipment_id, author_id, content)
VALUES ('38000000-eeee-0000-0000-000000000001'::uuid, '38000000-cccc-0000-0000-000000000001'::uuid, '38000000-0000-0000-0000-000000000004'::uuid, 'Technician note');

INSERT INTO public.equipment_note_images (equipment_note_id, file_name, file_url, uploaded_by)
VALUES ('38000000-eeee-0000-0000-000000000001'::uuid, 'n.jpg', '38000000-0000-0000-0000-000000000004/note/n.jpg', '38000000-0000-0000-0000-000000000004'::uuid);

SET LOCAL ROLE authenticated;

-- ── Equipment delete cascade ───────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is(
  public.delete_equipment_cascade('38000000-cccc-0000-0000-000000000001') ->> 'error',
  'Permission denied', 'team manager cannot delete equipment by default'
);

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.set_team_permission_override('38000000-aaaa-0000-0000-000000000001', 'manager', 'equipment.delete', true)$$,
  'owner can allow managers to delete equipment'
);

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is(
  (public.delete_equipment_cascade('38000000-cccc-0000-0000-000000000001') - 'equipment_id' - 'organization_id'),
  jsonb_build_object('success', true, 'work_orders_deleted', 1, 'note_image_paths', jsonb_build_array('38000000-0000-0000-0000-000000000004/note/n.jpg')),
  'team manager deletes equipment with its work orders and returns note image paths'
);
SELECT is(
  (SELECT count(*)::integer FROM public.equipment WHERE id = '38000000-cccc-0000-0000-000000000001'),
  0, 'equipment row is gone'
);
SELECT is(
  (SELECT count(*)::integer FROM public.work_orders WHERE id = '38000000-dddd-0000-0000-000000000001'),
  0, 'linked work order is gone'
);
SELECT is(public.test38_exec($$DELETE FROM public.equipment WHERE id = '38000000-cccc-0000-0000-000000000003'$$), 1, 'direct equipment delete follows the same permission');

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is(
  public.delete_equipment_cascade('38000000-cccc-0000-0000-000000000002') ->> 'error',
  'Permission denied', 'team technician cannot delete equipment'
);

-- ── Work order delete cascade ──────────────────────────────────────────────
SELECT is(
  public.delete_work_order_cascade('38000000-dddd-0000-0000-000000000002') ->> 'error',
  'Permission denied', 'team technician cannot delete work orders by default'
);

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.set_team_permission_override('38000000-aaaa-0000-0000-000000000001', 'technician', 'work_order.delete', true)$$,
  'owner can allow technicians to delete work orders'
);

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is(
  (public.delete_work_order_cascade('38000000-dddd-0000-0000-000000000002') ->> 'success')::boolean,
  true, 'team technician deletes a work order once allowed'
);

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT is(
  public.delete_work_order_cascade('38000000-dddd-0000-0000-000000000003') ->> 'error',
  'Permission denied', 'team requestor cannot delete work orders'
);

-- ── Teams ──────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is(public.test38_exec($$UPDATE public.teams SET description = 'by manager' WHERE id = '38000000-bbbb-0000-0000-000000000001'$$), 1, 'team manager can update their team by default');
SELECT is(public.test38_exec($$UPDATE public.teams SET description = 'x' WHERE id = '38000000-bbbb-0000-0000-000000000002'$$), 0, 'team manager cannot update another team');
SELECT is(public.test38_exec($$DELETE FROM public.teams WHERE id = '38000000-bbbb-0000-0000-000000000001'$$), 0, 'team manager cannot delete their team by default');

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is(public.test38_exec($$UPDATE public.teams SET description = 'by tech' WHERE id = '38000000-bbbb-0000-0000-000000000001'$$), 0, 'team technician cannot update the team');

-- ── Team members ───────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT lives_ok(
  $$INSERT INTO public.team_members (team_id, user_id, role) VALUES ('38000000-bbbb-0000-0000-000000000001', '38000000-0000-0000-0000-000000000006', 'technician')$$,
  'team manager can add an organization member'
);
SELECT throws_ok(
  $$INSERT INTO public.team_members (team_id, user_id, role) VALUES ('38000000-bbbb-0000-0000-000000000001', '38000000-0000-0000-0000-000000000007', 'viewer')$$,
  '42501', NULL, 'team manager cannot add someone outside the organization'
);
SELECT throws_ok(
  $$INSERT INTO public.team_members (team_id, user_id, role) VALUES ('38000000-bbbb-0000-0000-000000000002', '38000000-0000-0000-0000-000000000006', 'viewer')$$,
  '42501', NULL, 'team manager cannot add members to another team'
);
SELECT throws_ok(
  $$UPDATE public.team_members SET role = 'owner' WHERE team_id = '38000000-bbbb-0000-0000-000000000001' AND user_id = '38000000-0000-0000-0000-000000000006'$$,
  '42501', NULL, 'team manager cannot grant the team owner role'
);
SELECT is(public.test38_exec($$UPDATE public.team_members SET role = 'requestor' WHERE team_id = '38000000-bbbb-0000-0000-000000000001' AND user_id = '38000000-0000-0000-0000-000000000006'$$), 1, 'team manager can change a member role');
SELECT is(public.test38_exec($$DELETE FROM public.team_members WHERE team_id = '38000000-bbbb-0000-0000-000000000001' AND user_id = '38000000-0000-0000-0000-000000000001'$$), 0, 'team manager cannot remove the team owner');
SELECT is(public.test38_exec($$DELETE FROM public.team_members WHERE team_id = '38000000-bbbb-0000-0000-000000000001' AND user_id = '38000000-0000-0000-0000-000000000006'$$), 1, 'team manager can remove a member');

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  $$INSERT INTO public.team_members (team_id, user_id, role) VALUES ('38000000-bbbb-0000-0000-000000000001', '38000000-0000-0000-0000-000000000006', 'viewer')$$,
  '42501', NULL, 'team technician cannot add members'
);

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.set_team_permission_override('38000000-aaaa-0000-0000-000000000001', 'manager', 'team.members.manage', false)$$,
  'owner can stop managers from managing members'
);
SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok(
  $$INSERT INTO public.team_members (team_id, user_id, role) VALUES ('38000000-bbbb-0000-0000-000000000001', '38000000-0000-0000-0000-000000000006', 'viewer')$$,
  '42501', NULL, 'team manager cannot add members once disallowed'
);

SELECT set_config('request.jwt.claims', '{"sub":"38000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.get_team_permission_settings('38000000-aaaa-0000-0000-000000000001')),
  28, 'settings cover 4 team roles x 7 permissions'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
