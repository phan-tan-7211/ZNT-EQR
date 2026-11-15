import { useI18n } from '@/i18n';
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Globe, Info } from 'lucide-react';
import {
  PMTemplateSelect,
  PMTemplateSelectField,
} from '@/features/work-orders/components/PMTemplateSelectField';
import {
  useWorkOrderPMChecklist,
  type WorkOrderPMChecklistEquipment,
  type WorkOrderPMChecklistSetValue,
  type WorkOrderPMChecklistValues,
} from '@/features/work-orders/hooks/useWorkOrderPMChecklist';

const PM_TEMPLATE_SELECT_ID = 'pm-template-select';

interface WorkOrderPMChecklistProps {
  values: WorkOrderPMChecklistValues;
  setValue: WorkOrderPMChecklistSetValue;
  selectedEquipment?: WorkOrderPMChecklistEquipment | null;
  allowTemplateOverride?: boolean;
  autoDefaultFromEquipment?: boolean;
}

export const WorkOrderPMChecklist: React.FC<WorkOrderPMChecklistProps> = ({
  values,
  setValue,
  selectedEquipment,
  allowTemplateOverride = false,
  autoDefaultFromEquipment = false,
}) => {
  const { t } = useI18n();
  const {
    templates,
    selectedTemplate,
    assignedTemplate,
    isLoading,
    restrictions,
    handleTemplateChange,
    handleClearTemplate,
    selectValue,
  } = useWorkOrderPMChecklist({
    values,
    setValue,
    selectedEquipment,
    allowTemplateOverride,
    autoDefaultFromEquipment,
  });

  const hasPmSelected = Boolean(values.pmTemplateId);

  return (
    <div className="space-y-3">
      <PMTemplateSelectField
        selectId={PM_TEMPLATE_SELECT_ID}
        templateCount={templates.length}
        isLoading={isLoading}
        pmTemplateId={values.pmTemplateId}
        assignedTemplate={assignedTemplate}
        selectedEquipment={selectedEquipment}
        onClearTemplate={handleClearTemplate}
      >
        {/* The work order form shows a loading notice in place of the select. */}
        {isLoading ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">{t('workOrderForm.loadingTemplates')}</p>
          </div>
        ) : (
          <PMTemplateSelect
            id={PM_TEMPLATE_SELECT_ID}
            templates={templates}
            value={selectValue}
            onValueChange={handleTemplateChange}
            canCreateCustomPMTemplates={restrictions.canCreateCustomPMTemplates}
            globalBadge={(
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span className="text-xs text-muted-foreground">{t('workOrderForm.global')}</span>
              </div>
            )}
            equipmentDefaultTemplateId={selectedEquipment?.name ? assignedTemplate?.id : undefined}
          />
        )}
      </PMTemplateSelectField>

      {hasPmSelected && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('workOrderForm.pmChecklistHint')}
            </AlertDescription>
          </Alert>

          {selectedTemplate && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t('workOrderForm.pmChecklistPreview')}</span>
                <span className="text-xs text-muted-foreground">{t('workOrderForm.items', { count: selectedTemplate.itemCount })}</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {selectedTemplate.sections.map((section) => (
                  <div key={section.name}>• {section.name} {t('workOrderForm.items', { count: section.count })}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
