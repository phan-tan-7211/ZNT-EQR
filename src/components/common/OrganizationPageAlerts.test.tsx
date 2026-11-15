import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminOnlyPageAlert, NoOrganizationPageAlert } from './OrganizationPageAlerts';

describe('OrganizationPageAlerts', () => {
  it('renders the no-organization notice as a neutral alert with its title and description', () => {
    render(<NoOrganizationPageAlert title="No organization" description="Pick an organization first." />);

    const alert = screen.getByRole('alert');
    expect(alert).not.toHaveClass('text-destructive');
    expect(alert.querySelector('svg.lucide-circle-alert')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'No organization' })).toBeInTheDocument();
    expect(screen.getByText('Pick an organization first.')).toBeInTheDocument();
  });

  it('renders the admin-only notice as a destructive alert with its title and description', () => {
    render(<AdminOnlyPageAlert title="Access denied" description="Owners and admins only." />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-destructive');
    expect(alert.querySelector('svg.lucide-shield-alert')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.getByText('Owners and admins only.')).toBeInTheDocument();
  });
});
