import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toolingKeys } from '@/features/tooling/hooks/toolingKeys';
import {
  listToolingDrawingRevisions,
  releaseToolingDrawingRevision,
  type ReleaseToolingDrawingRevisionInput,
} from '@/features/tooling/services/toolingRevisionService';

/** Lives under the per-tool scope so every tool mutation also refreshes it. */
export const toolingRevisionKeys = {
  list: (toolingId: string | undefined) => [...toolingKeys.scoped(toolingId), 'revisions'] as const,
};

function requireToolingId(toolingId: string | undefined): string {
  if (!toolingId) throw new Error('toolingId is required');
  return toolingId;
}

export function useToolingDrawingRevisions(toolingId?: string) {
  return useQuery({
    queryKey: toolingRevisionKeys.list(toolingId),
    queryFn: () => listToolingDrawingRevisions(requireToolingId(toolingId)),
    enabled: Boolean(toolingId),
  });
}

export type ReleaseDrawingRevisionArgs = Omit<ReleaseToolingDrawingRevisionInput, 'toolingId'>;

export function useReleaseToolingDrawingRevision(toolingId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: ReleaseDrawingRevisionArgs) =>
      releaseToolingDrawingRevision({ ...args, toolingId: requireToolingId(toolingId) }),
    onSuccess: async () => {
      // The RPC also rewrites drawing_number / drawing_revision / effective date
      // on the tool, so refresh the header, the list and every per-tool history.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: toolingKeys.detail(toolingId) }),
        queryClient.invalidateQueries({ queryKey: toolingKeys.scoped(toolingId) }),
        queryClient.invalidateQueries({ queryKey: [...toolingKeys.all, 'list'] }),
      ]);
    },
  });
}
