/** Query key factories for the tooling domain. */
export const toolingKeys = {
  all: ['tooling'] as const,
  list: (organizationId: string | undefined) => [...toolingKeys.all, 'list', organizationId ?? 'none'] as const,
  detail: (toolingId: string | undefined) => [...toolingKeys.all, 'detail', toolingId ?? 'none'] as const,
  /** Every per-tool sub-resource shares this prefix so one invalidation refreshes them all. */
  scoped: (toolingId: string | undefined) => [...toolingKeys.all, 'tool', toolingId ?? 'none'] as const,
  compatibility: (toolingId: string | undefined) => [...toolingKeys.scoped(toolingId), 'compatibility'] as const,
  assignments: (toolingId: string | undefined) => [...toolingKeys.scoped(toolingId), 'assignments'] as const,
  usage: (toolingId: string | undefined) => [...toolingKeys.scoped(toolingId), 'usage'] as const,
  verifications: (toolingId: string | undefined) => [...toolingKeys.scoped(toolingId), 'verifications'] as const,
  events: (toolingId: string | undefined) => [...toolingKeys.scoped(toolingId), 'events'] as const,
  workOrders: (toolingId: string | undefined) => [...toolingKeys.scoped(toolingId), 'work-orders'] as const,
  productParts: (organizationId: string | undefined) => [...toolingKeys.all, 'product-parts', organizationId ?? 'none'] as const,
  operations: (organizationId: string | undefined) => [...toolingKeys.all, 'operations', organizationId ?? 'none'] as const,
  designs: (organizationId: string | undefined) => [...toolingKeys.all, 'designs', organizationId ?? 'none'] as const,
  machines: (organizationId: string | undefined) => [...toolingKeys.all, 'machines', organizationId ?? 'none'] as const,
  enrollable: (organizationId: string | undefined) => [...toolingKeys.all, 'enrollable', organizationId ?? 'none'] as const,
};
