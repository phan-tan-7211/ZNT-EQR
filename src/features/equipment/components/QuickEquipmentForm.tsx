import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Forklift, Info, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TeamPickerWithCreate from '@/features/teams/components/TeamPickerWithCreate';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { useCreateQuickEquipment } from '@/features/equipment/hooks/useCreateQuickEquipment';
import { useEquipmentValidationMessages } from '@/features/equipment/hooks/useEquipmentValidationMessages';
import { useManufacturerModelSuggestions } from '@/features/equipment/utils/manufacturerModelLookup';
import { useTeams } from '@/features/teams/hooks/useTeams';
import {
  createQuickEquipmentSchema,
  generateEquipmentName,
  type QuickEquipmentFormData,
} from '@/features/equipment/types/equipment';
import { useI18n } from '@/i18n';

interface QuickEquipmentFormProps {
  onEquipmentCreated: (equipmentId: string) => void;
  onCancel: () => void;
  canCreateForTeam: (teamId: string) => boolean;
}

export const QuickEquipmentForm: React.FC<QuickEquipmentFormProps> = ({
  onEquipmentCreated,
  onCancel,
  canCreateForTeam,
}) => {
  const { currentOrganization } = useOrganization();
  const { t } = useI18n();

  const { data: manufacturersData = [] } = useEquipmentManufacturersAndModels(
    currentOrganization?.id
  );
  const { teams = [], isLoading: isLoadingTeams } = useTeams();

  const availableTeams = useMemo(() => {
    return teams.filter(team => canCreateForTeam(team.id));
  }, [teams, canCreateForTeam]);

  const createMutation = useCreateQuickEquipment();

  const validationMessages = useEquipmentValidationMessages();

  const quickSchema = useMemo(
    () => createQuickEquipmentSchema(validationMessages),
    [validationMessages],
  );

  const form = useForm<QuickEquipmentFormData>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      manufacturer: '',
      model: '',
      serial_number: '',
      working_hours: null,
      team_id: availableTeams.length === 1 ? availableTeams[0].id : '',
      name: '',
    },
  });

  const { watch, setValue, formState: { errors } } = form;
  const manufacturer = watch('manufacturer');
  const model = watch('model');
  const name = watch('name');
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  useEffect(() => {
    if (!nameManuallyEdited) {
      const generatedName = generateEquipmentName(manufacturer || '', model || '');
      if (generatedName) {
        setValue('name', generatedName);
      }
    }
  }, [manufacturer, model, nameManuallyEdited, setValue]);

  useEffect(() => {
    if (availableTeams.length === 1 && !form.getValues('team_id')) {
      setValue('team_id', availableTeams[0].id);
    }
  }, [availableTeams, form, setValue]);

  const { manufacturers, modelsForManufacturer } = useManufacturerModelSuggestions(
    manufacturersData,
    manufacturer,
  );

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createMutation.mutateAsync(data);
      onEquipmentCreated(result.id);
    } catch {
      // Error toast is handled by the mutation hook
    }
  });

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNameManuallyEdited(true);
    setValue('name', e.target.value);
  }, [setValue]);

  const handleManufacturerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('manufacturer', value);
    if (!value) setNameManuallyEdited(false);
  }, [setValue]);

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('model', value);
    if (!value) setNameManuallyEdited(false);
  }, [setValue]);

  const isSubmitting = createMutation.isPending;

  return (
    <Card className="border-dashed border-primary/50 bg-primary/5">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Forklift className="h-4 w-4" />
          <span>{t('equipmentForm.quickEntry')}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{t('equipmentForm.quickEntryHelp')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manufacturer">{t('equipmentForm.manufacturerLabel')}</Label>
            <Input
              id="manufacturer"
              list="manufacturer-suggestions"
              placeholder={t('equipmentForm.manufacturerQuickPlaceholder')}
              value={manufacturer}
              onChange={handleManufacturerChange}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <datalist id="manufacturer-suggestions">
              {manufacturers.map((mfr) => (
                <option key={mfr} value={mfr} />
              ))}
            </datalist>
            {manufacturers.length > 0 && !manufacturer && (
              <p className="text-xs text-muted-foreground">
                {t('equipmentForm.manufacturerSuggestions', { count: manufacturers.length })}
              </p>
            )}
            {errors.manufacturer && (
              <p className="text-sm text-destructive">{errors.manufacturer.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">{t('equipmentForm.modelLabel')}</Label>
            <Input
              id="model"
              list="model-suggestions"
              placeholder={t('equipmentForm.modelQuickPlaceholder')}
              value={model}
              onChange={handleModelChange}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <datalist id="model-suggestions">
              {modelsForManufacturer.map((mdl) => (
                <option key={mdl} value={mdl} />
              ))}
            </datalist>
            {modelsForManufacturer.length > 0 && !model && (
              <p className="text-xs text-muted-foreground">
                {t('equipmentForm.modelSuggestions', {
                  count: modelsForManufacturer.length,
                  manufacturer,
                })}
              </p>
            )}
            {errors.model && (
              <p className="text-sm text-destructive">{errors.model.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number">{t('equipmentForm.serialNumberLabel')}</Label>
            <Input
              id="serial_number"
              placeholder={t('equipmentForm.serialNumberQuickPlaceholder')}
              {...form.register('serial_number')}
              disabled={isSubmitting}
            />
            {errors.serial_number && (
              <p className="text-sm text-destructive">{errors.serial_number.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="working_hours">
              {t('equipmentForm.machineHours')}
              <span className="text-muted-foreground ml-1">{t('equipmentForm.optional')}</span>
            </Label>
            <Input
              id="working_hours"
              type="number"
              min="0"
              step="0.1"
              placeholder={t('equipmentForm.machineHoursPlaceholder')}
              {...form.register('working_hours', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            {errors.working_hours && (
              <p className="text-sm text-destructive">{errors.working_hours.message}</p>
            )}
          </div>

          {isLoadingTeams ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('equipmentForm.loadingTeams')}
            </div>
          ) : availableTeams.length === 0 ? (
            <Alert variant="destructive">
              <AlertDescription>{t('equipmentForm.noTeamCreatePermission')}</AlertDescription>
            </Alert>
          ) : (
            <TeamPickerWithCreate
              value={form.watch('team_id')}
              onChange={(value) => setValue('team_id', value, { shouldValidate: true })}
              requireTeam
              showBillingCallout
              teamFilter={(team) => canCreateForTeam(team.id)}
              id="quick-equipment-team"
            />
          )}
          {errors.team_id && (
            <p className="text-sm text-destructive">{errors.team_id.message}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              {t('equipmentForm.equipmentNameLabel')}
              {!nameManuallyEdited && name && (
                <span className="text-muted-foreground ml-1">{t('equipmentForm.autoGenerated')}</span>
              )}
            </Label>
            <Input
              id="name"
              placeholder={t('equipmentForm.equipmentNamePlaceholder')}
              value={name}
              onChange={handleNameChange}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <Alert className="border-info/30 bg-info/10 dark:bg-info/10">
            <Info className="h-4 w-4 text-info" />
            <AlertDescription className="text-info dark:text-info">
              {t('equipmentForm.partsMatchingInfo')}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {t('equipmentForm.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || availableTeams.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('equipmentForm.creating')}
                </>
              ) : (
                <>
                  <Forklift className="h-4 w-4 mr-2" />
                  {t('equipmentForm.createEquipment')}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
