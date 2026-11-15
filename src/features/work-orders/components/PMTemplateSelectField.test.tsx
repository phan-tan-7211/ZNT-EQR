import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PMTemplateSummary } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { PM_TEMPLATE_NONE_VALUE } from '@/features/work-orders/hooks/useWorkOrderPMChecklist';
import { PMTemplateSelect, PMTemplateSelectField } from './PMTemplateSelectField';

const template = (id: string, name: string, organizationId: string | null): PMTemplateSummary => ({
  id,
  name,
  organization_id: organizationId,
  is_protected: false,
  interval_value: null,
  interval_type: null,
  sections: [],
  itemCount: 0,
});

const assignedTemplate = template('assigned-1', 'Forklift PM', 'org-1');
const equipment = { id: 'equipment-1', name: 'Forklift 17', default_pm_template_id: 'assigned-1' };

const renderField = (props: Partial<React.ComponentProps<typeof PMTemplateSelectField>> = {}) => {
  const onClearTemplate = vi.fn();
  render(
    <PMTemplateSelectField
      selectId="pm-template-select"
      templateCount={1}
      isLoading={false}
      pmTemplateId={null}
      assignedTemplate={null}
      selectedEquipment={equipment}
      onClearTemplate={onClearTemplate}
      {...props}
    >
      <div data-testid="picker" />
    </PMTemplateSelectField>,
  );
  return { onClearTemplate };
};

describe('PMTemplateSelectField', () => {
  it('shows the picker and no clear button when nothing is selected', () => {
    renderField();

    expect(screen.getByText('PM Template')).toHaveAttribute('for', 'pm-template-select');
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove PM template' })).not.toBeInTheDocument();
  });

  it('shows the empty notice instead of the picker only when there is nothing to pick', () => {
    renderField({ templateCount: 0 });

    expect(screen.getByText(/no pm templates available/i)).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it.each([
    ['while templates load', { templateCount: 0, isLoading: true }],
    ['while a template is selected', { templateCount: 0, pmTemplateId: 'missing-1' }],
  ])('keeps the picker %s', (_label, props) => {
    renderField(props);

    expect(screen.getByTestId('picker')).toBeInTheDocument();
    expect(screen.queryByText(/no pm templates available/i)).not.toBeInTheDocument();
  });

  it('clears the selected template from the remove button', () => {
    const { onClearTemplate } = renderField({ pmTemplateId: 'other-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove PM template' }));

    expect(onClearTemplate).toHaveBeenCalledTimes(1);
  });

  it('shows the equipment-default hint only while the assigned template is selected', () => {
    renderField({ pmTemplateId: 'assigned-1', assignedTemplate });
    expect(screen.getByText(/defaults to the pm template assigned to forklift 17/i)).toBeInTheDocument();
  });

  it.each([
    ['another template is selected', { pmTemplateId: 'other-1', assignedTemplate }],
    ['nothing is selected', { pmTemplateId: null, assignedTemplate }],
    ['the equipment has no assigned template', { pmTemplateId: 'assigned-1', assignedTemplate: null }],
    ['no equipment is selected', { pmTemplateId: 'assigned-1', assignedTemplate, selectedEquipment: null }],
  ])('hides the equipment-default hint when %s', (_label, props) => {
    renderField(props);
    expect(screen.queryByText(/defaults to the pm template assigned to/i)).not.toBeInTheDocument();
  });
});

describe('PMTemplateSelect', () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  const globalTemplate = template('global-1', 'Bundled PM', null);
  const orgTemplate = template('org-1', 'Custom PM', 'org-1');

  const openSelect = (props: Partial<React.ComponentProps<typeof PMTemplateSelect>> = {}) => {
    const onValueChange = vi.fn();
    render(
      <PMTemplateSelect
        id="pm-template-select"
        templates={[globalTemplate, orgTemplate]}
        value={PM_TEMPLATE_NONE_VALUE}
        onValueChange={onValueChange}
        canCreateCustomPMTemplates
        globalBadge={<span data-testid="global-badge">(Global)</span>}
        {...props}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: 'PM Template' });
    expect(trigger).toHaveAttribute('id', 'pm-template-select');
    act(() => {
      fireEvent.keyDown(trigger, { key: 'Enter' });
    });
    return { onValueChange, listbox: screen.getByRole('listbox') };
  };

  it('lists None and every template, with the global badge on organization-less templates only', () => {
    const { listbox } = openSelect();

    const options = within(listbox).getAllByRole('option');
    expect(options.map(option => option.textContent)).toEqual(['None', 'Bundled PM(Global)', 'Custom PM']);
    expect(within(options[1]).getByTestId('global-badge')).toBeInTheDocument();
    expect(within(options[2]).queryByTestId('global-badge')).not.toBeInTheDocument();
  });

  it('marks the equipment default template', () => {
    const { listbox } = openSelect({ equipmentDefaultTemplateId: 'org-1' });

    const [, bundled, custom] = within(listbox).getAllByRole('option');
    expect(within(custom).getByText('(Equipment default)')).toBeInTheDocument();
    expect(within(bundled).queryByText('(Equipment default)')).not.toBeInTheDocument();
  });

  it('shows the license note only when custom templates are not allowed and some are listed', () => {
    const { listbox } = openSelect({ canCreateCustomPMTemplates: false });
    expect(within(listbox).getByText('Custom templates require user licenses')).toBeInTheDocument();
  });

  it.each([
    ['custom templates are allowed', { canCreateCustomPMTemplates: true }],
    ['only global templates are listed', { canCreateCustomPMTemplates: false, templates: [globalTemplate] }],
  ])('hides the license note when %s', (_label, props) => {
    const { listbox } = openSelect(props);
    expect(within(listbox).queryByText('Custom templates require user licenses')).not.toBeInTheDocument();
  });

  it('reports the picked template id', () => {
    const { listbox, onValueChange } = openSelect();

    act(() => {
      fireEvent.keyDown(within(listbox).getByRole('option', { name: /custom pm/i }), { key: 'Enter' });
    });

    expect(onValueChange).toHaveBeenCalledWith('org-1');
  });

  it('can be disabled', () => {
    render(
      <PMTemplateSelect
        id="pm-template-select"
        templates={[]}
        value={PM_TEMPLATE_NONE_VALUE}
        onValueChange={vi.fn()}
        disabled
        canCreateCustomPMTemplates
        globalBadge={null}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'PM Template' })).toBeDisabled();
  });
});
