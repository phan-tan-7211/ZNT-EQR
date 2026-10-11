import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/useOrganizationMembers';
import { useTeams } from '@/features/teams/hooks/useTeamManagement';
import {
  useCreateTooling,
  useEnrollableTlEquipment,
  useToolingDesigns,
  useUpdateToolingDetails,
} from '@/features/tooling/hooks/useTooling';
import {
  TOOLING_OWNERSHIP_TYPES,
  TOOLING_TYPES,
  TOOLING_USAGE_UNITS,
  type CreateToolingInput,
  type ToolingOverview,
  type ToolingOwnershipType,
  type ToolingType,
  type ToolingUsageUnit,
  type UpdateToolingDetailsInput,
} from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { useI18n } from '@/i18n';

const NONE = '__none__';

type Source = 'new' | 'enroll';
type NumericField = 'warningLimit' | 'lifeLimit' | 'maintenanceInterval' | 'inspectionIntervalDays';
type FormErrors = Partial<Record<'name' | 'equipmentId' | NumericField, string>>;

interface FormState {
  source: Source;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  teamId: string;
  equipmentId: string;
  toolingType: ToolingType;
  designId: string;
  ownershipType: ToolingOwnershipType;
  ownerName: string;
  storageLocation: string;
  responsibleUserId: string;
  requiresMachine: boolean;
  drawingNumber: string;
  drawingRevision: string;
  revisionEffectiveDate: string;
  usageUnit: ToolingUsageUnit;
  warningLimit: string;
  lifeLimit: string;
  maintenanceInterval: string;
  inspectionIntervalDays: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  source: 'new',
  name: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  teamId: NONE,
  equipmentId: '',
  toolingType: 'jig',
  designId: NONE,
  ownershipType: 'company',
  ownerName: '',
  storageLocation: '',
  responsibleUserId: NONE,
  requiresMachine: true,
  drawingNumber: '',
  drawingRevision: '',
  revisionEffectiveDate: '',
  usageUnit: 'cycles',
  warningLimit: '',
  lifeLimit: '',
  maintenanceInterval: '',
  inspectionIntervalDays: '',
  notes: '',
};

function formFromTool(tool: ToolingOverview): FormState {
  return {
    ...EMPTY_FORM,
    toolingType: tool.tooling_type,
    designId: tool.design_id ?? NONE,
    ownershipType: tool.ownership_type,
    ownerName: tool.owner_name ?? '',
    responsibleUserId: tool.responsible_user_id ?? NONE,
    requiresMachine: tool.requires_machine,
    drawingNumber: tool.drawing_number ?? '',
    drawingRevision: tool.drawing_revision ?? '',
    revisionEffectiveDate: tool.revision_effective_date ?? '',
    notes: tool.notes ?? '',
  };
}

const text = (value: string): string | null => (value.trim() ? value.trim() : null);
const selected = (value: string): string | null => (value && value !== NONE ? value : null);
const numberOrNull = (value: string): number | null => (value.trim() === '' ? null : Number(value));

function validate(form: FormState, isEdit: boolean, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};
  if (isEdit) return errors;
  if (form.source === 'new' && !form.name.trim()) errors.name = t('toolingMaster.form.errors.nameRequired');
  if (form.source === 'enroll' && !form.equipmentId) {
    errors.equipmentId = t('toolingMaster.form.errors.equipmentRequired');
  }
  const numeric: NumericField[] = ['warningLimit', 'lifeLimit', 'maintenanceInterval', 'inspectionIntervalDays'];
  for (const field of numeric) {
    const value = numberOrNull(form[field]);
    if (value === null) continue;
    if (field === 'inspectionIntervalDays') {
      if (!Number.isInteger(value) || value <= 0) errors[field] = t('toolingMaster.form.errors.wholeDays');
    } else if (!Number.isFinite(value) || value <= 0) {
      errors[field] = t('toolingMaster.form.errors.positiveNumber');
    }
  }
  const warning = numberOrNull(form.warningLimit);
  const life = numberOrNull(form.lifeLimit);
  if (!errors.warningLimit && !errors.lifeLimit && warning !== null && life !== null && warning > life) {
    errors.warningLimit = t('toolingMaster.form.errors.warningAboveLife');
  }
  return errors;
}

function FieldBlock({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className={className ?? 'space-y-1.5'}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">({t('tooling.optional')})</span>}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-sm font-semibold text-foreground md:col-span-2">{children}</h3>;
}

export interface ToolingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** When provided the dialog edits this tool's descriptive details. */
  tool?: ToolingOverview;
}

export function ToolingFormDialog({ open, onOpenChange, organizationId, tool }: ToolingFormDialogProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isEdit = Boolean(tool);
  const [form, setForm] = useState<FormState>(() => (tool ? formFromTool(tool) : EMPTY_FORM));
  const [errors, setErrors] = useState<FormErrors>({});

  const createMutation = useCreateTooling(organizationId);
  const updateMutation = useUpdateToolingDetails(tool?.id);
  const saving = createMutation.isPending || updateMutation.isPending;

  const { data: designs = [] } = useToolingDesigns(open ? organizationId : undefined);
  const { data: members = [] } = useOrganizationMembersQuery(open ? organizationId : '');
  const { data: teams = [] } = useTeams(organizationId, { enabled: open && !isEdit });
  const { data: enrollable = [], isLoading: enrollableLoading } = useEnrollableTlEquipment(
    organizationId,
    open && !isEdit && form.source === 'enroll',
  );

  // Reset only when the dialog opens, so background refetches of `tool` never
  // wipe in-progress edits.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(tool ? formFromTool(tool) : EMPTY_FORM);
      setErrors({});
    }
  }

  const selectableDesigns = useMemo(
    () => designs.filter((design) => design.is_active || design.id === tool?.design_id),
    [designs, tool?.design_id],
  );
  const activeMembers = useMemo(
    () => members.filter((member) => member.status === 'active' || member.userId === tool?.responsible_user_id),
    [members, tool?.responsible_user_id],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const describedBy = (id: string, field?: keyof FormErrors, hasHint = false) => {
    if (field && errors[field]) return `${id}-error`;
    return hasHint ? `${id}-hint` : undefined;
  };

  const handleSubmit = async () => {
    const nextErrors = validate(form, isEdit, t);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error(t('toolingMaster.form.errors.fixErrors'));
      return;
    }

    const descriptive: UpdateToolingDetailsInput = {
      tooling_type: form.toolingType,
      design_id: selected(form.designId),
      ownership_type: form.ownershipType,
      owner_name: text(form.ownerName),
      responsible_user_id: selected(form.responsibleUserId),
      requires_machine: form.requiresMachine,
      drawing_number: text(form.drawingNumber),
      drawing_revision: text(form.drawingRevision),
      revision_effective_date: text(form.revisionEffectiveDate),
      notes: text(form.notes),
    };

    try {
      if (tool) {
        await updateMutation.mutateAsync(descriptive);
        toast.success(t('toolingMaster.form.updated'));
        onOpenChange(false);
        return;
      }
      const input: CreateToolingInput = {
        ...descriptive,
        tooling_type: form.toolingType,
        ownership_type: form.ownershipType,
        requires_machine: form.requiresMachine,
        storage_location: text(form.storageLocation),
        usage_unit: form.usageUnit,
        warning_limit: numberOrNull(form.warningLimit),
        life_limit: numberOrNull(form.lifeLimit),
        maintenance_interval: numberOrNull(form.maintenanceInterval),
        inspection_interval_days: numberOrNull(form.inspectionIntervalDays),
        ...(form.source === 'enroll'
          ? { equipment_id: form.equipmentId }
          : {
              name: form.name.trim(),
              manufacturer: text(form.manufacturer) ?? undefined,
              model: text(form.model) ?? undefined,
              serial_number: text(form.serialNumber) ?? undefined,
              team_id: selected(form.teamId),
            }),
      };
      const newId = await createMutation.mutateAsync(input);
      toast.success(t('toolingMaster.form.created'));
      onOpenChange(false);
      navigate(`/dashboard/tooling/${newId}`);
    } catch (error) {
      toast.error(toolingErrorMessage(error, t));
    }
  };

  const numberInput = (field: NumericField, label: string, isInteger = false) => (
    <FieldBlock id={`tooling-form-${field}`} label={label} error={errors[field]} optional>
      <Input
        id={`tooling-form-${field}`}
        type="number"
        inputMode={isInteger ? 'numeric' : 'decimal'}
        min={isInteger ? 1 : 0}
        step={isInteger ? 1 : 'any'}
        value={form[field]}
        onChange={(event) => set(field, event.target.value)}
        aria-invalid={Boolean(errors[field])}
        aria-describedby={describedBy(`tooling-form-${field}`, field)}
      />
    </FieldBlock>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto" data-testid="tooling-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('toolingMaster.form.editTitle') : t('toolingMaster.form.createTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('toolingMaster.form.editDescription') : t('toolingMaster.form.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 md:grid-cols-2"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          id="tooling-form"
        >
          {tool ? (
            <Alert className="md:col-span-2">
              <AlertDescription className="flex flex-wrap items-center gap-2">
                <span>{t('toolingMaster.form.identityEditHint')}</span>
                <Link
                  to={`/dashboard/equipment/${tool.id}`}
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('toolingMaster.form.openEquipment')}
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <fieldset className="space-y-2 md:col-span-2">
                <legend className="text-sm font-medium">{t('toolingMaster.form.source')}</legend>
                <RadioGroup
                  value={form.source}
                  onValueChange={(value) => set('source', value as Source)}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {(['new', 'enroll'] as const).map((source) => (
                    <Label
                      key={source}
                      htmlFor={`tooling-form-source-${source}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal"
                    >
                      <RadioGroupItem value={source} id={`tooling-form-source-${source}`} />
                      {source === 'new' ? t('toolingMaster.form.sourceNew') : t('toolingMaster.form.sourceEnroll')}
                    </Label>
                  ))}
                </RadioGroup>
              </fieldset>

              <SectionTitle>{t('toolingMaster.form.sections.identity')}</SectionTitle>
              {form.source === 'new' ? (
                <>
                  <FieldBlock id="tooling-form-name" label={t('toolingMaster.form.name')} error={errors.name}>
                    <Input
                      id="tooling-form-name"
                      value={form.name}
                      onChange={(event) => set('name', event.target.value)}
                      aria-invalid={Boolean(errors.name)}
                      aria-required="true"
                      aria-describedby={describedBy('tooling-form-name', 'name')}
                    />
                  </FieldBlock>
                  <FieldBlock id="tooling-form-team" label={t('toolingMaster.form.team')} optional>
                    <Select value={form.teamId} onValueChange={(value) => set('teamId', value)}>
                      <SelectTrigger id="tooling-form-team">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{t('toolingMaster.form.noTeam')}</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>
                  <FieldBlock id="tooling-form-manufacturer" label={t('toolingMaster.form.manufacturer')} optional>
                    <Input
                      id="tooling-form-manufacturer"
                      value={form.manufacturer}
                      onChange={(event) => set('manufacturer', event.target.value)}
                    />
                  </FieldBlock>
                  <FieldBlock id="tooling-form-model" label={t('toolingMaster.form.model')} optional>
                    <Input id="tooling-form-model" value={form.model} onChange={(event) => set('model', event.target.value)} />
                  </FieldBlock>
                  <FieldBlock id="tooling-form-serial" label={t('toolingMaster.form.serial')} optional>
                    <Input
                      id="tooling-form-serial"
                      value={form.serialNumber}
                      onChange={(event) => set('serialNumber', event.target.value)}
                    />
                  </FieldBlock>
                </>
              ) : (
                <FieldBlock
                  id="tooling-form-equipment"
                  label={t('toolingMaster.form.equipment')}
                  error={errors.equipmentId}
                  hint={
                    enrollableLoading
                      ? t('toolingMaster.form.loadingEnrollable')
                      : enrollable.length === 0
                        ? t('toolingMaster.form.noEnrollable')
                        : undefined
                  }
                  className="space-y-1.5 md:col-span-2"
                >
                  <Select
                    value={form.equipmentId || undefined}
                    onValueChange={(value) => set('equipmentId', value)}
                    disabled={enrollableLoading || enrollable.length === 0}
                  >
                    <SelectTrigger
                      id="tooling-form-equipment"
                      aria-invalid={Boolean(errors.equipmentId)}
                      aria-describedby={describedBy(
                        'tooling-form-equipment',
                        'equipmentId',
                        enrollableLoading || enrollable.length === 0,
                      )}
                    >
                      <SelectValue placeholder={t('toolingMaster.form.equipmentPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {enrollable.map((equipment) => (
                        <SelectItem key={equipment.id} value={equipment.id}>
                          {equipment.management_code ? `${equipment.management_code} · ${equipment.name}` : equipment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldBlock>
              )}
            </>
          )}

          <SectionTitle>{t('toolingMaster.form.sections.classification')}</SectionTitle>
          <FieldBlock id="tooling-form-type" label={t('toolingMaster.form.toolingType')}>
            <Select value={form.toolingType} onValueChange={(value) => set('toolingType', value as ToolingType)}>
              <SelectTrigger id="tooling-form-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOOLING_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`tooling.types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
          <FieldBlock id="tooling-form-design" label={t('toolingMaster.form.design')} optional>
            <Select value={form.designId} onValueChange={(value) => set('designId', value)}>
              <SelectTrigger id="tooling-form-design">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('toolingMaster.form.noDesign')}</SelectItem>
                {selectableDesigns.map((design) => (
                  <SelectItem key={design.id} value={design.id}>
                    {design.design_code} · {design.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
          <FieldBlock id="tooling-form-ownership" label={t('toolingMaster.form.ownershipType')}>
            <Select
              value={form.ownershipType}
              onValueChange={(value) => set('ownershipType', value as ToolingOwnershipType)}
            >
              <SelectTrigger id="tooling-form-ownership">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOOLING_OWNERSHIP_TYPES.map((ownership) => (
                  <SelectItem key={ownership} value={ownership}>
                    {t(`tooling.ownership.${ownership}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
          <FieldBlock
            id="tooling-form-owner-name"
            label={t('toolingMaster.form.ownerName')}
            hint={t('toolingMaster.form.ownerNameHint')}
            optional
          >
            <Input
              id="tooling-form-owner-name"
              value={form.ownerName}
              onChange={(event) => set('ownerName', event.target.value)}
              aria-describedby="tooling-form-owner-name-hint"
            />
          </FieldBlock>
          {!isEdit && (
            <FieldBlock id="tooling-form-storage" label={t('toolingMaster.form.storageLocation')} optional>
              <Input
                id="tooling-form-storage"
                value={form.storageLocation}
                onChange={(event) => set('storageLocation', event.target.value)}
              />
            </FieldBlock>
          )}
          <FieldBlock id="tooling-form-responsible" label={t('toolingMaster.form.responsible')} optional>
            <Select value={form.responsibleUserId} onValueChange={(value) => set('responsibleUserId', value)}>
              <SelectTrigger id="tooling-form-responsible">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('toolingMaster.form.noResponsible')}</SelectItem>
                {activeMembers.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
          <div className="flex items-start justify-between gap-3 rounded-md border p-3 md:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="tooling-form-requires-machine">{t('toolingMaster.form.requiresMachine')}</Label>
              <p id="tooling-form-requires-machine-hint" className="text-xs text-muted-foreground">
                {t('toolingMaster.form.requiresMachineHint')}
              </p>
            </div>
            <Switch
              id="tooling-form-requires-machine"
              checked={form.requiresMachine}
              onCheckedChange={(checked) => set('requiresMachine', checked)}
              aria-describedby="tooling-form-requires-machine-hint"
            />
          </div>

          <SectionTitle>{t('toolingMaster.form.sections.drawing')}</SectionTitle>
          <FieldBlock id="tooling-form-drawing-number" label={t('toolingMaster.form.drawingNumber')} optional>
            <Input
              id="tooling-form-drawing-number"
              value={form.drawingNumber}
              onChange={(event) => set('drawingNumber', event.target.value)}
            />
          </FieldBlock>
          <FieldBlock id="tooling-form-drawing-revision" label={t('toolingMaster.form.drawingRevision')} optional>
            <Input
              id="tooling-form-drawing-revision"
              value={form.drawingRevision}
              onChange={(event) => set('drawingRevision', event.target.value)}
            />
          </FieldBlock>
          <FieldBlock id="tooling-form-revision-date" label={t('toolingMaster.form.revisionEffectiveDate')} optional>
            <Input
              id="tooling-form-revision-date"
              type="date"
              value={form.revisionEffectiveDate}
              onChange={(event) => set('revisionEffectiveDate', event.target.value)}
            />
          </FieldBlock>

          {!isEdit && (
            <>
              <SectionTitle>{t('toolingMaster.form.sections.life')}</SectionTitle>
              <p className="-mt-2 text-xs text-muted-foreground md:col-span-2">{t('toolingMaster.form.limitsHint')}</p>
              <FieldBlock id="tooling-form-unit" label={t('toolingMaster.form.usageUnit')}>
                <Select value={form.usageUnit} onValueChange={(value) => set('usageUnit', value as ToolingUsageUnit)}>
                  <SelectTrigger id="tooling-form-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOLING_USAGE_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {t(`tooling.unitLabels.${unit}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldBlock>
              {numberInput('warningLimit', t('toolingMaster.form.warningLimit'))}
              {numberInput('lifeLimit', t('toolingMaster.form.lifeLimit'))}
              {numberInput('maintenanceInterval', t('toolingMaster.form.maintenanceInterval'))}
              {numberInput('inspectionIntervalDays', t('toolingMaster.form.inspectionIntervalDays'), true)}
            </>
          )}

          <FieldBlock
            id="tooling-form-notes"
            label={t('toolingMaster.form.notes')}
            optional
            className="space-y-1.5 md:col-span-2"
          >
            <Textarea
              id="tooling-form-notes"
              value={form.notes}
              onChange={(event) => set('notes', event.target.value)}
              rows={3}
            />
          </FieldBlock>
        </form>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('tooling.cancel')}
          </Button>
          <Button type="submit" form="tooling-form" disabled={saving}>
            {saving
              ? t('tooling.saving')
              : isEdit
                ? t('toolingMaster.form.submitEdit')
                : t('toolingMaster.form.submitCreate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
