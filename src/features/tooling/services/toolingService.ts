import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  CreateCompatibilityInput,
  CreateToolingInput,
  IssueToolingInput,
  ProductPart,
  ProductPartInput,
  ProductionOperation,
  ProductionOperationInput,
  RecordVerificationInput,
  ReturnToolingInput,
  SetLifeLimitsInput,
  ToolingAssignment,
  ToolingCompatibility,
  ToolingCompatibilityAction,
  ToolingDesign,
  ToolingDesignInput,
  ToolingEvent,
  ToolingLimitDisposition,
  ToolingOutOfServiceState,
  ToolingOverview,
  ToolingUsageLog,
  ToolingVerification,
  ToolingWorkOrderSummary,
  UpdateToolingDetailsInput,
} from '@/features/tooling/types';

/** Turn '' / undefined into null so RPC defaults and SQL NULLIF behave. */
function nullable<T>(value: T | '' | undefined | null): T | null {
  return value === '' || value === undefined ? null : value;
}

const HISTORY_LIMIT = 200;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listTooling(organizationId: string): Promise<ToolingOverview[]> {
  const { data, error } = await supabase
    .from('tooling_overview')
    .select('*')
    .eq('organization_id', organizationId)
    .order('management_code', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as ToolingOverview[];
}

export async function getTooling(toolingId: string): Promise<ToolingOverview | null> {
  const { data, error } = await supabase
    .from('tooling_overview')
    .select('*')
    .eq('id', toolingId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ToolingOverview | null) ?? null;
}

const EQUIPMENT_REF = 'id, name, management_code';

export async function listToolingCompatibility(toolingId: string): Promise<ToolingCompatibility[]> {
  const { data, error } = await supabase
    .from('tooling_compatibility')
    .select(
      `*, product_part:product_parts!tooling_compatibility_product_fk(id, part_number, name),
       operation:production_operations!tooling_compatibility_operation_fk(id, code, name),
       machine:equipment!tooling_compatibility_machine_equipment_id_fkey(${EQUIPMENT_REF})`,
    )
    .eq('tooling_equipment_id', toolingId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ToolingCompatibility[];
}

export async function listToolingAssignments(toolingId: string): Promise<ToolingAssignment[]> {
  const { data, error } = await supabase
    .from('tooling_assignments')
    .select(
      `*, machine:equipment!tooling_assignments_machine_equipment_id_fkey(${EQUIPMENT_REF}),
       product_part:product_parts!tooling_assignments_product_fk(id, part_number, name),
       operation:production_operations!tooling_assignments_operation_fk(id, code, name)`,
    )
    .eq('tooling_equipment_id', toolingId)
    .order('issued_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return (data ?? []) as unknown as ToolingAssignment[];
}

export async function listToolingUsageLogs(toolingId: string): Promise<ToolingUsageLog[]> {
  const { data, error } = await supabase
    .from('tooling_usage_logs')
    .select('*')
    .eq('tooling_equipment_id', toolingId)
    .order('recorded_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return (data ?? []) as unknown as ToolingUsageLog[];
}

export async function listToolingVerifications(toolingId: string): Promise<ToolingVerification[]> {
  const { data, error } = await supabase
    .from('tooling_verifications')
    .select('*')
    .eq('tooling_equipment_id', toolingId)
    .order('inspected_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return (data ?? []) as unknown as ToolingVerification[];
}

export async function listToolingEvents(toolingId: string): Promise<ToolingEvent[]> {
  const { data, error } = await supabase
    .from('tooling_events')
    .select('*')
    .eq('tooling_equipment_id', toolingId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return (data ?? []) as unknown as ToolingEvent[];
}

/** Existing work orders for the tool's equipment record (no duplicate WO system). */
export async function listToolingWorkOrders(toolingId: string): Promise<ToolingWorkOrderSummary[]> {
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, title, status, priority, has_pm, created_date, completed_date, due_date')
    .eq('equipment_id', toolingId)
    .order('created_date', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return (data ?? []) as ToolingWorkOrderSummary[];
}

/** Non-tooling equipment usable as a compatible machine. */
export async function listMachineCandidates(
  organizationId: string,
): Promise<Array<{ id: string; name: string; management_code: string | null }>> {
  const [{ data: equipment, error }, { data: tools, error: toolsError }] = await Promise.all([
    supabase
      .from('equipment')
      .select(EQUIPMENT_REF)
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
    supabase.from('tooling_details').select('equipment_id').eq('organization_id', organizationId),
  ]);
  if (error) throw error;
  if (toolsError) throw toolsError;
  const toolIds = new Set((tools ?? []).map((row) => row.equipment_id));
  return (equipment ?? []).filter((row) => !toolIds.has(row.id));
}

/** TL equipment rows that are not yet enrolled as tooling. */
export async function listEnrollableTlEquipment(
  organizationId: string,
): Promise<Array<{ id: string; name: string; management_code: string | null }>> {
  const { data: group, error: groupError } = await supabase
    .from('equipment_groups')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('code', 'TL')
    .maybeSingle();
  if (groupError) throw groupError;
  if (!group) return [];

  const [{ data: equipment, error }, { data: tools, error: toolsError }] = await Promise.all([
    supabase
      .from('equipment')
      .select(EQUIPMENT_REF)
      .eq('organization_id', organizationId)
      .eq('equipment_group_id', group.id)
      .order('management_code', { ascending: true }),
    supabase.from('tooling_details').select('equipment_id').eq('organization_id', organizationId),
  ]);
  if (error) throw error;
  if (toolsError) throw toolsError;
  const toolIds = new Set((tools ?? []).map((row) => row.equipment_id));
  return (equipment ?? []).filter((row) => !toolIds.has(row.id));
}

// ---------------------------------------------------------------------------
// Master data (direct table access, admin RLS)
// ---------------------------------------------------------------------------

export async function listProductParts(organizationId: string): Promise<ProductPart[]> {
  const { data, error } = await supabase
    .from('product_parts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('part_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductPart[];
}

export async function saveProductPart(
  organizationId: string,
  input: ProductPartInput,
  id?: string,
): Promise<void> {
  const row = {
    part_number: input.part_number,
    name: input.name,
    customer_name: nullable(input.customer_name),
    revision: nullable(input.revision),
    description: nullable(input.description),
    ...(typeof input.is_active === 'boolean' ? { is_active: input.is_active } : {}),
  };
  const { error } = id
    ? await supabase.from('product_parts').update(row).eq('id', id)
    : await supabase.from('product_parts').insert({ organization_id: organizationId, ...row });
  if (error) throw error;
}

export async function listProductionOperations(organizationId: string): Promise<ProductionOperation[]> {
  const { data, error } = await supabase
    .from('production_operations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('code', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductionOperation[];
}

export async function saveProductionOperation(
  organizationId: string,
  input: ProductionOperationInput,
  id?: string,
): Promise<void> {
  const row = {
    code: input.code,
    name: input.name,
    operation_type: input.operation_type,
    description: nullable(input.description),
    ...(typeof input.is_active === 'boolean' ? { is_active: input.is_active } : {}),
  };
  const { error } = id
    ? await supabase.from('production_operations').update(row).eq('id', id)
    : await supabase.from('production_operations').insert({ organization_id: organizationId, ...row });
  if (error) throw error;
}

export async function listToolingDesigns(organizationId: string): Promise<ToolingDesign[]> {
  const { data, error } = await supabase
    .from('tooling_designs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('design_code', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ToolingDesign[];
}

export async function saveToolingDesign(
  organizationId: string,
  input: ToolingDesignInput,
  id?: string,
): Promise<void> {
  const row = {
    design_code: input.design_code,
    name: input.name,
    tooling_type: input.tooling_type,
    drawing_number: nullable(input.drawing_number),
    current_revision: nullable(input.current_revision),
    revision_effective_date: nullable(input.revision_effective_date),
    description: nullable(input.description),
    ...(typeof input.is_active === 'boolean' ? { is_active: input.is_active } : {}),
  };
  const { error } = id
    ? await supabase.from('tooling_designs').update(row).eq('id', id)
    : await supabase.from('tooling_designs').insert({ organization_id: organizationId, ...row });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// RPC mutations
// ---------------------------------------------------------------------------

export async function createTooling(organizationId: string, input: CreateToolingInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_tooling', {
    p_organization_id: organizationId,
    p_payload: input as unknown as Json,
  });
  if (error) throw error;
  return data as string;
}

export async function updateToolingDetails(toolingId: string, input: UpdateToolingDetailsInput): Promise<void> {
  const { error } = await supabase.rpc('update_tooling_details', {
    p_tooling_id: toolingId,
    p_payload: input as unknown as Json,
  });
  if (error) throw error;
}

export async function approveTooling(toolingId: string, note?: string | null): Promise<void> {
  const { error } = await supabase.rpc('approve_tooling', {
    p_tooling_id: toolingId,
    p_note: nullable(note) ?? undefined,
  });
  if (error) throw error;
}

export async function createToolingCompatibility(input: CreateCompatibilityInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_tooling_compatibility', {
    p_tooling_id: input.toolingId,
    p_product_part_id: input.productPartId,
    p_operation_id: nullable(input.operationId) ?? undefined,
    p_machine_equipment_id: nullable(input.machineEquipmentId) ?? undefined,
    p_drawing_revision: nullable(input.drawingRevision) ?? undefined,
    p_effective_from: nullable(input.effectiveFrom) ?? undefined,
    p_effective_to: nullable(input.effectiveTo) ?? undefined,
    p_notes: nullable(input.notes) ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function setToolingCompatibilityStatus(
  compatibilityId: string,
  action: ToolingCompatibilityAction,
  note?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('set_tooling_compatibility_status', {
    p_compatibility_id: compatibilityId,
    p_action: action,
    p_note: nullable(note) ?? undefined,
  });
  if (error) throw error;
}

export async function issueTooling(input: IssueToolingInput): Promise<string> {
  const { data, error } = await supabase.rpc('issue_tooling', {
    p_tooling_id: input.toolingId,
    p_issued_to_user_id: input.issuedToUserId,
    p_machine_equipment_id: nullable(input.machineEquipmentId) ?? undefined,
    p_product_part_id: nullable(input.productPartId) ?? undefined,
    p_operation_id: nullable(input.operationId) ?? undefined,
    p_issue_location: nullable(input.issueLocation) ?? undefined,
    p_condition: nullable(input.condition) ?? undefined,
    p_notes: nullable(input.notes) ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function returnTooling(input: ReturnToolingInput): Promise<string> {
  const { data, error } = await supabase.rpc('return_tooling', {
    p_tooling_id: input.toolingId,
    p_condition: input.condition,
    p_return_location: nullable(input.returnLocation) ?? undefined,
    p_usage_quantity: nullable(input.usageQuantity) ?? undefined,
    p_notes: nullable(input.notes) ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function transferToolingLocation(
  toolingId: string,
  toLocation: string,
  reason?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('transfer_tooling_location', {
    p_tooling_id: toolingId,
    p_to_location: toLocation,
    p_reason: nullable(reason) ?? undefined,
  });
  if (error) throw error;
}

export async function recordToolingUsage(
  toolingId: string,
  quantity: number,
  productionQuantity?: number | null,
  notes?: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('record_tooling_usage', {
    p_tooling_id: toolingId,
    p_quantity: quantity,
    p_production_quantity: nullable(productionQuantity) ?? undefined,
    p_notes: nullable(notes) ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function correctToolingUsage(toolingId: string, delta: number, reason: string): Promise<string> {
  const { data, error } = await supabase.rpc('correct_tooling_usage', {
    p_tooling_id: toolingId,
    p_delta: delta,
    p_reason: reason,
  });
  if (error) throw error;
  return data as string;
}

export async function setToolingLifeLimits(input: SetLifeLimitsInput): Promise<void> {
  // Limits are nullable in SQL; the generated Args type marks them as plain numbers.
  const { error } = await supabase.rpc('set_tooling_life_limits', {
    p_tooling_id: input.toolingId,
    p_usage_unit: input.usageUnit,
    p_warning_limit: input.warningLimit as number,
    p_life_limit: input.lifeLimit as number,
    p_maintenance_interval: input.maintenanceInterval as number,
    p_inspection_interval_days: input.inspectionIntervalDays as number,
    p_reason: nullable(input.reason) ?? undefined,
  });
  if (error) throw error;
}

export async function recordToolingLimitDisposition(
  toolingId: string,
  disposition: ToolingLimitDisposition,
  newLifeLimit: number | null,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc('record_tooling_limit_disposition', {
    p_tooling_id: toolingId,
    p_disposition: disposition,
    p_new_life_limit: newLifeLimit as number,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function setToolingUsability(
  toolingId: string,
  state: ToolingOutOfServiceState,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc('set_tooling_usability', {
    p_tooling_id: toolingId,
    p_state: state,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function recordToolingVerification(input: RecordVerificationInput): Promise<string> {
  const { data, error } = await supabase.rpc('record_tooling_verification', {
    p_tooling_id: input.toolingId,
    p_verification_type: input.verificationType,
    p_result: input.result,
    p_findings: nullable(input.findings) ?? undefined,
    p_work_order_id: nullable(input.workOrderId) ?? undefined,
    p_maintenance_completed: input.maintenanceCompleted ?? false,
    p_return_to_service: input.returnToService ?? false,
    p_next_due: nullable(input.nextDue) ?? undefined,
  });
  if (error) throw error;
  return data as string;
}
