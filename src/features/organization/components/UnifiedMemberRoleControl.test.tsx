import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedMemberRoleControl } from '@/features/organization/components/UnifiedMemberRoleControl';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';

const buildMember = (overrides: Partial<UnifiedMember> = {}): UnifiedMember => ({
  id: 'member-1',
  userId: 'user-1',
  name: 'Bob Member',
  email: 'bob@example.com',
  organizationRole: 'member',
  status: 'active',
  type: 'member',
  ...overrides,
});

describe('UnifiedMemberRoleControl', () => {
  it.each([
    ['an owner', buildMember({ organizationRole: 'owner' }), true, 'Owner'],
    ['a pending invitation', buildMember({ type: 'invitation', status: 'pending_invite' }), true, 'Member'],
    ['a pending Google Workspace claim', buildMember({ type: 'gws_claim', status: 'pending_gws' }), true, 'Member'],
    ['a viewer who cannot manage members', buildMember({ organizationRole: 'admin' }), false, 'Admin'],
  ])('shows a read-only role badge for %s', (_case, member, canManageMembers, label) => {
    render(
      <UnifiedMemberRoleControl
        member={member}
        canManageMembers={canManageMembers}
        onRoleChange={vi.fn()}
        layout="desktop"
      />,
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(label)).toHaveClass('capitalize');
  });

  it.each([
    ['desktop', 'h-8', 'capitalize'],
    ['mobile', 'h-7', 'capitalize text-xs'],
  ] as const)('sizes the %s select and badge for its layout', (layout, triggerHeight, badgeClassName) => {
    const { unmount } = render(
      <UnifiedMemberRoleControl member={buildMember()} canManageMembers onRoleChange={vi.fn()} layout={layout} />,
    );
    expect(screen.getByRole('combobox')).toHaveClass('w-24', triggerHeight);
    unmount();

    render(
      <UnifiedMemberRoleControl
        member={buildMember({ organizationRole: 'owner' })}
        canManageMembers
        onRoleChange={vi.fn()}
        layout={layout}
      />,
    );
    expect(screen.getByText('Owner').className).toMatch(new RegExp(` ${badgeClassName}$`));
  });

  it('reports the chosen role with the member id', async () => {
    const onRoleChange = vi.fn();
    render(
      <UnifiedMemberRoleControl member={buildMember()} canManageMembers onRoleChange={onRoleChange} layout="mobile" />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Admin' }));

    expect(onRoleChange).toHaveBeenCalledWith('member-1', 'admin');
  });
});
