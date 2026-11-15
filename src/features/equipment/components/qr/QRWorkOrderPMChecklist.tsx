import React from 'react';
import { Globe } from 'lucide-react';
import {
  PMTemplateSelect,
  PMTemplateSelectField,
} from '@/features/work-orders/components/PMTemplateSelectField';
import {
  useWorkOrderPMChecklistForOrganization,
  type WorkOrderPMChecklistEquipment,
  type WorkOrderPMChecklistSetValue,
  type WorkOrderPMChecklistValues,
} from '@/features/work-orders/hooks/useWorkOrderPMChecklist';
import { useI18n } from '@/i18n';

const QR_PM_TEMPLATE_SELECT_ID = 'qr-pm-template-select';

interface QRWorkOrderPMChecklistProps {
  organizationId: string;
  values: WorkOrderPMChecklistValues;
  setValue: WorkOrderPMChecklistSetValue;
  selectedEquipment: WorkOrderPMChecklistEquipment;
  autoDefaultFromEquipment?: boolean;
}

const QRWorkOrderPMChecklist: React.FC<QRWorkOrderPMChecklistProps> = ({
  organizationId,
  values,
  setValue,
  selectedEquipment,
  autoDefaultFromEquipment = true,
}) => {
  const { t } = useI18n();
  const {
    templates,
    assignedTemplate,
    isLoading,
    restrictions,
    handleTemplateChange,
    handleClearTemplate,
    selectValue,
  } = useWorkOrderPMChecklistForOrganization(organizationId, {
    values,
    setValue,
    selectedEquipment,
    autoDefaultFromEquipment,
  });

  return (
    <PMTemplateSelectField
      selectId={QR_PM_TEMPLATE_SELECT_ID}
      templateCount={templates.length}
      isLoading={isLoading}
      pmTemplateId={values.pmTemplateId}
      assignedTemplate={assignedTemplate}
      selectedEquipment={selectedEquipment}
      onClearTemplate={handleClearTemplate}
    >
      {/* The QR quick action keeps the select visible (disabled) while templates load. */}
      <PMTemplateSelect
        id={QR_PM_TEMPLATE_SELECT_ID}
        templates={templates}
        value={selectValue}
        onValueChange={handleTemplateChange}
        disabled={isLoading}
        canCreateCustomPMTemplates={restrictions.canCreateCustomPMTemplates}
        globalBadge={(
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            {t('workOrderForm.global')}
          </span>
        )}
        equipmentDefaultTemplateId={assignedTemplate?.id}
      />
    </PMTemplateSelectField>
  );
};

export default QRWorkOrderPMChecklist;
