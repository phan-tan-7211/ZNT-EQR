import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PMTemplateSummary } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import {
  PM_TEMPLATE_NONE_VALUE,
  type WorkOrderPMChecklistEquipment,
  type WorkOrderPMChecklistValues,
} from '@/features/work-orders/hooks/useWorkOrderPMChecklist';
import { useI18n } from '@/i18n';

interface PMTemplateSelectFieldProps {
  /** Id of the select trigger rendered in `children`; the field label points at it. */
  selectId: string;
  templateCount: number;
  isLoading: boolean;
  pmTemplateId: WorkOrderPMChecklistValues['pmTemplateId'];
  assignedTemplate: PMTemplateSummary | null;
  selectedEquipment?: WorkOrderPMChecklistEquipment | null;
  onClearTemplate: () => void;
  /** The template picker, shown unless there is nothing to pick and nothing is selected. */
  children: React.ReactNode;
}

/**
 * PM template field shared by the work order form and the QR quick action:
 * label, picker (or the "no templates" notice), clear button and the
 * equipment-default hint.
 */
export const PMTemplateSelectField: React.FC<PMTemplateSelectFieldProps> = ({
  selectId,
  templateCount,
  isLoading,
  pmTemplateId,
  assignedTemplate,
  selectedEquipment,
  onClearTemplate,
  children,
}) => {
  const { t } = useI18n();
  const hasPmSelected = Boolean(pmTemplateId);

  return (
    <div className="space-y-2">
      <Label htmlFor={selectId}>{t('workOrderForm.pmTemplate')}</Label>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {templateCount === 0 && !isLoading && !hasPmSelected ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">{t('workOrderForm.noPmTemplates')}</p>
            </div>
          ) : (
            children
          )}
        </div>
        {hasPmSelected && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('workOrderForm.removePmTemplate')}
            onClick={onClearTemplate}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {assignedTemplate && selectedEquipment && hasPmSelected && pmTemplateId === assignedTemplate.id && (
        <p className="text-xs text-muted-foreground">
          {t('workOrderForm.pmEquipmentDefaultHint', { name: selectedEquipment.name })}
        </p>
      )}
    </div>
  );
};

interface PMTemplateSelectProps {
  id: string;
  templates: PMTemplateSummary[];
  value: string;
  onValueChange: (templateId: string) => void;
  disabled?: boolean;
  canCreateCustomPMTemplates: boolean;
  /** Rendered after the name of every global (organization-less) template. */
  globalBadge: React.ReactNode;
  /** Template marked as the equipment default; none when undefined. */
  equipmentDefaultTemplateId?: string;
}

/** PM template select with the None option and the custom-template license note. */
export const PMTemplateSelect: React.FC<PMTemplateSelectProps> = ({
  id,
  templates,
  value,
  onValueChange,
  disabled = false,
  canCreateCustomPMTemplates,
  globalBadge,
  equipmentDefaultTemplateId,
}) => {
  const { t } = useI18n();

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={t('workOrderForm.pmTemplate')}>
        <SelectValue placeholder={t('workOrderForm.selectPmTemplate')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PM_TEMPLATE_NONE_VALUE}>{t('workOrderForm.none')}</SelectItem>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            <div className="flex items-center gap-2">
              <span>{template.name}</span>
              {template.organization_id === null && globalBadge}
              {equipmentDefaultTemplateId === template.id && (
                <span className="text-xs text-muted-foreground">
                  {t('workOrderForm.equipmentDefault')}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
        {!canCreateCustomPMTemplates && templates.some(template => template.organization_id) && (
          <div className="border-t px-2 py-1 text-xs text-muted-foreground">
            {t('workOrderForm.customLicense')}
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
