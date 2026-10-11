/**
 * Tooling / Jig / Fixture domain types.
 *
 * A tool is an `equipment` row in the TL equipment group plus one
 * `tooling_details` row. Mutations go through SECURITY DEFINER RPCs
 * (see supabase/migrations/20261011090000_tooling_management.sql).
 */

export const TOOLING_TYPES = ['jig', 'fixture', 'mold', 'die', 'checking_fixture', 'general_tool'] as const;
export type ToolingType = (typeof TOOLING_TYPES)[number];

export const TOOLING_OWNERSHIP_TYPES = ['company', 'customer', 'supplier', 'other'] as const;
export type ToolingOwnershipType = (typeof TOOLING_OWNERSHIP_TYPES)[number];

export const TOOLING_CONDITIONS = ['new', 'good', 'worn', 'damaged'] as const;
export type ToolingCondition = (typeof TOOLING_CONDITIONS)[number];

export const TOOLING_USABILITY_STATES = [
  'available',
  'quarantined',
  'under_repair',
  'pending_inspection',
  'blocked',
  'retired',
] as const;
export type ToolingUsabilityState = (typeof TOOLING_USABILITY_STATES)[number];

/** States an operator/admin can move a tool INTO via set_tooling_usability. */
export const TOOLING_OUT_OF_SERVICE_STATES = [
  'quarantined',
  'under_repair',
  'pending_inspection',
  'blocked',
  'retired',
] as const satisfies readonly ToolingUsabilityState[];
export type ToolingOutOfServiceState = (typeof TOOLING_OUT_OF_SERVICE_STATES)[number];

export const TOOLING_USAGE_UNITS = ['cycles', 'shots', 'strokes', 'pieces'] as const;
export type ToolingUsageUnit = (typeof TOOLING_USAGE_UNITS)[number];

export const TOOLING_OPERATION_TYPES = [
  'welding',
  'pressing',
  'assembly',
  'inspection',
  'machining',
  'molding',
  'painting',
  'other',
] as const;
export type ToolingOperationType = (typeof TOOLING_OPERATION_TYPES)[number];

export const TOOLING_VERIFICATION_TYPES = ['periodic', 'post_repair', 'incoming', 'first_article', 'other'] as const;
export type ToolingVerificationType = (typeof TOOLING_VERIFICATION_TYPES)[number];

export const TOOLING_VERIFICATION_RESULTS = ['pass', 'fail', 'conditional'] as const;
export type ToolingVerificationResult = (typeof TOOLING_VERIFICATION_RESULTS)[number];

export type ToolingApprovalStatus = 'pending' | 'approved';
export type ToolingCompatibilityApproval = 'pending' | 'approved' | 'rejected';
export type ToolingCompatibilityAction = 'approve' | 'reject' | 'deactivate';
export type ToolingLimitDisposition = 'extend_life' | 'retire';

export type ToolingEventType =
  | 'registered'
  | 'details_updated'
  | 'approved'
  | 'issued'
  | 'returned'
  | 'transferred'
  | 'usability_changed'
  | 'limits_changed'
  | 'limit_disposition'
  | 'usage_corrected'
  | 'inspection_recorded'
  | 'returned_to_service'
  | 'compatibility_changed'
  | 'drawing_revision_released';

/** Row of the `tooling_overview` view (security_invoker). */
export interface ToolingOverview {
  id: string;
  organization_id: string;
  name: string;
  management_code: string | null;
  manufacturer: string;
  model: string;
  serial_number: string | null;
  equipment_status: string;
  team_id: string | null;
  image_url: string | null;
  tooling_type: ToolingType;
  design_id: string | null;
  design_code: string | null;
  design_name: string | null;
  ownership_type: ToolingOwnershipType;
  owner_name: string | null;
  storage_location: string | null;
  responsible_user_id: string | null;
  responsible_name: string | null;
  condition: ToolingCondition;
  usability_state: ToolingUsabilityState;
  approval_status: ToolingApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  requires_machine: boolean;
  drawing_number: string | null;
  drawing_revision: string | null;
  revision_effective_date: string | null;
  usage_unit: ToolingUsageUnit;
  warning_limit: number | null;
  life_limit: number | null;
  maintenance_interval: number | null;
  inspection_interval_days: number | null;
  cumulative_usage: number;
  usage_since_maintenance: number;
  last_maintenance_at: string | null;
  last_inspection_at: string | null;
  next_inspection_due: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  remaining_life: number | null;
  warning_reached: boolean;
  life_limit_reached: boolean;
  maintenance_due: boolean;
  inspection_overdue: boolean;
  active_assignment_id: string | null;
  issued_to_user_id: string | null;
  issued_to_name: string | null;
  issued_at: string | null;
  issued_machine_id: string | null;
  is_issued: boolean;
  is_issuable: boolean;
}

export interface ToolingDesign {
  id: string;
  organization_id: string;
  design_code: string;
  name: string;
  tooling_type: ToolingType;
  drawing_number: string | null;
  current_revision: string | null;
  revision_effective_date: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductPart {
  id: string;
  organization_id: string;
  part_number: string;
  name: string;
  customer_name: string | null;
  revision: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductionOperation {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  operation_type: ToolingOperationType;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToolingCompatibility {
  id: string;
  organization_id: string;
  tooling_equipment_id: string;
  product_part_id: string;
  operation_id: string | null;
  machine_equipment_id: string | null;
  drawing_revision: string | null;
  effective_from: string | null;
  effective_to: string | null;
  approval_status: ToolingCompatibilityApproval;
  approved_by: string | null;
  approved_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  product_part?: Pick<ProductPart, 'id' | 'part_number' | 'name'> | null;
  operation?: Pick<ProductionOperation, 'id' | 'code' | 'name'> | null;
  machine?: { id: string; name: string; management_code: string | null } | null;
}

export interface ToolingAssignment {
  id: string;
  organization_id: string;
  tooling_equipment_id: string;
  status: 'active' | 'returned';
  issued_to_user_id: string;
  issued_to_name: string | null;
  issued_by: string;
  issued_by_name: string | null;
  issued_at: string;
  machine_equipment_id: string | null;
  product_part_id: string | null;
  operation_id: string | null;
  compatibility_id: string | null;
  issue_location: string | null;
  condition_at_issue: ToolingCondition;
  notes: string | null;
  returned_at: string | null;
  returned_by: string | null;
  returned_by_name: string | null;
  return_location: string | null;
  condition_at_return: ToolingCondition | null;
  usage_at_return: number | null;
  return_notes: string | null;
  machine?: { id: string; name: string; management_code: string | null } | null;
  product_part?: Pick<ProductPart, 'id' | 'part_number' | 'name'> | null;
  operation?: Pick<ProductionOperation, 'id' | 'code' | 'name'> | null;
}

export interface ToolingUsageLog {
  id: string;
  tooling_equipment_id: string;
  entry_type: 'usage' | 'correction';
  quantity: number;
  usage_unit: ToolingUsageUnit;
  production_quantity: number | null;
  assignment_id: string | null;
  cumulative_after: number;
  reason: string | null;
  recorded_by: string;
  recorded_by_name: string | null;
  recorded_at: string;
}

export interface ToolingVerification {
  id: string;
  tooling_equipment_id: string;
  verification_type: ToolingVerificationType;
  result: ToolingVerificationResult;
  findings: string | null;
  work_order_id: string | null;
  maintenance_completed: boolean;
  returned_to_service: boolean;
  usability_before: ToolingUsabilityState;
  usability_after: ToolingUsabilityState;
  cumulative_usage_at: number;
  next_due: string | null;
  inspected_by: string;
  inspected_by_name: string | null;
  inspected_at: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
}

export interface ToolingEvent {
  id: string;
  tooling_equipment_id: string;
  event_type: ToolingEventType;
  from_value: string | null;
  to_value: string | null;
  assignment_id: string | null;
  reason: string | null;
  details: Record<string, unknown>;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface ToolingDrawingRevision {
  id: string;
  organization_id: string;
  tooling_equipment_id: string;
  drawing_number: string | null;
  revision: string;
  effective_date: string | null;
  change_description: string;
  status: 'released' | 'superseded';
  released_by: string;
  released_by_name: string | null;
  released_at: string;
  superseded_at: string | null;
}

/** Linked work orders are read straight from `work_orders` (equipment_id = tool). */
export interface ToolingWorkOrderSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  has_pm: boolean;
  created_date: string;
  completed_date: string | null;
  due_date: string | null;
}

/** Payload for create_tooling(p_organization_id, p_payload). */
export interface CreateToolingInput {
  equipment_id?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  team_id?: string | null;
  tooling_type: ToolingType;
  design_id?: string | null;
  ownership_type: ToolingOwnershipType;
  owner_name?: string | null;
  storage_location?: string | null;
  responsible_user_id?: string | null;
  requires_machine: boolean;
  drawing_number?: string | null;
  drawing_revision?: string | null;
  revision_effective_date?: string | null;
  usage_unit: ToolingUsageUnit;
  warning_limit?: number | null;
  life_limit?: number | null;
  maintenance_interval?: number | null;
  inspection_interval_days?: number | null;
  notes?: string | null;
}

/** Payload for update_tooling_details — only descriptive fields. */
export type UpdateToolingDetailsInput = Partial<
  Pick<
    CreateToolingInput,
    | 'tooling_type'
    | 'design_id'
    | 'ownership_type'
    | 'owner_name'
    | 'responsible_user_id'
    | 'requires_machine'
    | 'drawing_number'
    | 'drawing_revision'
    | 'revision_effective_date'
    | 'notes'
  >
>;

export interface CreateCompatibilityInput {
  toolingId: string;
  productPartId: string;
  operationId?: string | null;
  machineEquipmentId?: string | null;
  drawingRevision?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
}

export interface IssueToolingInput {
  toolingId: string;
  issuedToUserId: string;
  machineEquipmentId?: string | null;
  productPartId?: string | null;
  operationId?: string | null;
  issueLocation?: string | null;
  condition?: ToolingCondition | null;
  notes?: string | null;
}

export interface ReturnToolingInput {
  toolingId: string;
  condition: ToolingCondition;
  returnLocation?: string | null;
  usageQuantity?: number | null;
  notes?: string | null;
}

export interface SetLifeLimitsInput {
  toolingId: string;
  usageUnit: ToolingUsageUnit;
  warningLimit: number | null;
  lifeLimit: number | null;
  maintenanceInterval: number | null;
  inspectionIntervalDays: number | null;
  reason?: string | null;
}

export interface RecordVerificationInput {
  toolingId: string;
  verificationType: ToolingVerificationType;
  result: ToolingVerificationResult;
  findings?: string | null;
  workOrderId?: string | null;
  maintenanceCompleted?: boolean;
  returnToService?: boolean;
  nextDue?: string | null;
}

export type ProductPartInput = Pick<ProductPart, 'part_number' | 'name'> &
  Partial<Pick<ProductPart, 'customer_name' | 'revision' | 'description' | 'is_active'>>;
export type ProductionOperationInput = Pick<ProductionOperation, 'code' | 'name' | 'operation_type'> &
  Partial<Pick<ProductionOperation, 'description' | 'is_active'>>;
export type ToolingDesignInput = Pick<ToolingDesign, 'design_code' | 'name' | 'tooling_type'> &
  Partial<
    Pick<ToolingDesign, 'drawing_number' | 'current_revision' | 'revision_effective_date' | 'description' | 'is_active'>
  >;
