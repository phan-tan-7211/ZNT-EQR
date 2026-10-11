import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toolingKeys } from '@/features/tooling/hooks/toolingKeys';
import {
  approveTooling,
  correctToolingUsage,
  createTooling,
  createToolingCompatibility,
  getTooling,
  issueTooling,
  listEnrollableTlEquipment,
  listMachineCandidates,
  listProductParts,
  listProductionOperations,
  listTooling,
  listToolingAssignments,
  listToolingCompatibility,
  listToolingDesigns,
  listToolingEvents,
  listToolingUsageLogs,
  listToolingVerifications,
  listToolingWorkOrders,
  recordToolingLimitDisposition,
  recordToolingUsage,
  recordToolingVerification,
  returnTooling,
  saveProductPart,
  saveProductionOperation,
  saveToolingDesign,
  setToolingCompatibilityStatus,
  setToolingLifeLimits,
  setToolingUsability,
  transferToolingLocation,
  updateToolingDetails,
} from '@/features/tooling/services/toolingService';
import type {
  CreateCompatibilityInput,
  CreateToolingInput,
  IssueToolingInput,
  ProductPartInput,
  ProductionOperationInput,
  RecordVerificationInput,
  ReturnToolingInput,
  SetLifeLimitsInput,
  ToolingCompatibilityAction,
  ToolingDesignInput,
  ToolingLimitDisposition,
  ToolingOutOfServiceState,
  UpdateToolingDetailsInput,
} from '@/features/tooling/types';

function requireId(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} is required`);
  return value;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useToolingList(organizationId?: string) {
  return useQuery({
    queryKey: toolingKeys.list(organizationId),
    queryFn: () => listTooling(requireId(organizationId, 'organizationId')),
    enabled: Boolean(organizationId),
  });
}

export function useTooling(toolingId?: string) {
  return useQuery({
    queryKey: toolingKeys.detail(toolingId),
    queryFn: () => getTooling(requireId(toolingId, 'toolingId')),
    enabled: Boolean(toolingId),
  });
}

export function useToolingCompatibility(toolingId?: string) {
  return useQuery({
    queryKey: toolingKeys.compatibility(toolingId),
    queryFn: () => listToolingCompatibility(requireId(toolingId, 'toolingId')),
    enabled: Boolean(toolingId),
  });
}

export function useToolingAssignments(toolingId?: string) {
  return useQuery({
    queryKey: toolingKeys.assignments(toolingId),
    queryFn: () => listToolingAssignments(requireId(toolingId, 'toolingId')),
    enabled: Boolean(toolingId),
  });
}

export function useToolingUsageLogs(toolingId?: string) {
  return useQuery({
    queryKey: toolingKeys.usage(toolingId),
    queryFn: () => listToolingUsageLogs(requireId(toolingId, 'toolingId')),
    enabled: Boolean(toolingId),
  });
}

export function useToolingVerifications(toolingId?: string) {
  return useQuery({
    queryKey: toolingKeys.verifications(toolingId),
    queryFn: () => listToolingVerifications(requireId(toolingId, 'toolingId')),
    enabled: Boolean(toolingId),
  });
}

export function useToolingEvents(toolingId?: string) {
  return useQuery({
    queryKey: toolingKeys.events(toolingId),
    queryFn: () => listToolingEvents(requireId(toolingId, 'toolingId')),
    enabled: Boolean(toolingId),
  });
}

export function useToolingWorkOrders(toolingId?: string) {
  return useQuery({
    queryKey: toolingKeys.workOrders(toolingId),
    queryFn: () => listToolingWorkOrders(requireId(toolingId, 'toolingId')),
    enabled: Boolean(toolingId),
  });
}

export function useProductParts(organizationId?: string) {
  return useQuery({
    queryKey: toolingKeys.productParts(organizationId),
    queryFn: () => listProductParts(requireId(organizationId, 'organizationId')),
    enabled: Boolean(organizationId),
  });
}

export function useProductionOperations(organizationId?: string) {
  return useQuery({
    queryKey: toolingKeys.operations(organizationId),
    queryFn: () => listProductionOperations(requireId(organizationId, 'organizationId')),
    enabled: Boolean(organizationId),
  });
}

export function useToolingDesigns(organizationId?: string) {
  return useQuery({
    queryKey: toolingKeys.designs(organizationId),
    queryFn: () => listToolingDesigns(requireId(organizationId, 'organizationId')),
    enabled: Boolean(organizationId),
  });
}

export function useMachineCandidates(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: toolingKeys.machines(organizationId),
    queryFn: () => listMachineCandidates(requireId(organizationId, 'organizationId')),
    enabled: Boolean(organizationId) && enabled,
  });
}

export function useEnrollableTlEquipment(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: toolingKeys.enrollable(organizationId),
    queryFn: () => listEnrollableTlEquipment(requireId(organizationId, 'organizationId')),
    enabled: Boolean(organizationId) && enabled,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Refresh the list, the tool header and every per-tool history query. */
function useInvalidateTool() {
  const queryClient = useQueryClient();
  return async (toolingId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [...toolingKeys.all, 'list'] }),
      queryClient.invalidateQueries({ queryKey: toolingKeys.detail(toolingId) }),
      queryClient.invalidateQueries({ queryKey: toolingKeys.scoped(toolingId) }),
    ]);
  };
}

export function useCreateTooling(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateToolingInput) => createTooling(requireId(organizationId, 'organizationId'), input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: toolingKeys.all });
      // New TL equipment rows also appear in the generic equipment list.
      await queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useUpdateToolingDetails(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (input: UpdateToolingDetailsInput) => updateToolingDetails(requireId(toolingId, 'toolingId'), input),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useApproveTooling(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (note?: string | null) => approveTooling(requireId(toolingId, 'toolingId'), note),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useCreateToolingCompatibility(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (input: Omit<CreateCompatibilityInput, 'toolingId'>) =>
      createToolingCompatibility({ ...input, toolingId: requireId(toolingId, 'toolingId') }),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useSetToolingCompatibilityStatus(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (args: { compatibilityId: string; action: ToolingCompatibilityAction; note?: string | null }) =>
      setToolingCompatibilityStatus(args.compatibilityId, args.action, args.note),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useIssueTooling(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (input: Omit<IssueToolingInput, 'toolingId'>) =>
      issueTooling({ ...input, toolingId: requireId(toolingId, 'toolingId') }),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useReturnTooling(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (input: Omit<ReturnToolingInput, 'toolingId'>) =>
      returnTooling({ ...input, toolingId: requireId(toolingId, 'toolingId') }),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useTransferToolingLocation(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (args: { toLocation: string; reason?: string | null }) =>
      transferToolingLocation(requireId(toolingId, 'toolingId'), args.toLocation, args.reason),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useRecordToolingUsage(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (args: { quantity: number; productionQuantity?: number | null; notes?: string | null }) =>
      recordToolingUsage(requireId(toolingId, 'toolingId'), args.quantity, args.productionQuantity, args.notes),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useCorrectToolingUsage(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (args: { delta: number; reason: string }) =>
      correctToolingUsage(requireId(toolingId, 'toolingId'), args.delta, args.reason),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useSetToolingLifeLimits(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (input: Omit<SetLifeLimitsInput, 'toolingId'>) =>
      setToolingLifeLimits({ ...input, toolingId: requireId(toolingId, 'toolingId') }),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useRecordToolingLimitDisposition(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (args: { disposition: ToolingLimitDisposition; newLifeLimit: number | null; reason: string }) =>
      recordToolingLimitDisposition(requireId(toolingId, 'toolingId'), args.disposition, args.newLifeLimit, args.reason),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useSetToolingUsability(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (args: { state: ToolingOutOfServiceState; reason: string }) =>
      setToolingUsability(requireId(toolingId, 'toolingId'), args.state, args.reason),
    onSuccess: () => invalidate(toolingId),
  });
}

export function useRecordToolingVerification(toolingId?: string) {
  const invalidate = useInvalidateTool();
  return useMutation({
    mutationFn: (input: Omit<RecordVerificationInput, 'toolingId'>) =>
      recordToolingVerification({ ...input, toolingId: requireId(toolingId, 'toolingId') }),
    onSuccess: () => invalidate(toolingId),
  });
}

function useMasterMutation<TInput>(
  organizationId: string | undefined,
  keyFor: (organizationId: string | undefined) => readonly unknown[],
  save: (organizationId: string, input: TInput, id?: string) => Promise<void>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { input: TInput; id?: string }) =>
      save(requireId(organizationId, 'organizationId'), args.input, args.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keyFor(organizationId) }),
  });
}

export function useSaveProductPart(organizationId?: string) {
  return useMasterMutation<ProductPartInput>(organizationId, toolingKeys.productParts, saveProductPart);
}

export function useSaveProductionOperation(organizationId?: string) {
  return useMasterMutation<ProductionOperationInput>(organizationId, toolingKeys.operations, saveProductionOperation);
}

export function useSaveToolingDesign(organizationId?: string) {
  return useMasterMutation<ToolingDesignInput>(organizationId, toolingKeys.designs, saveToolingDesign);
}
