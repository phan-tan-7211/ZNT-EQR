import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@vitest-harness/utils/query-client-wrapper';
import {
  toolingRevisionKeys,
  useReleaseToolingDrawingRevision,
  useToolingDrawingRevisions,
} from '@/features/tooling/hooks/useToolingRevisions';
import { toolingKeys } from '@/features/tooling/hooks/toolingKeys';

const rpcMock = vi.hoisted(() => vi.fn());
const queryState = vi.hoisted(() => ({
  rows: [] as unknown[],
  calls: [] as Array<[string, ...unknown[]]>,
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder = {
    select: (...args: unknown[]) => {
      queryState.calls.push(['select', ...args]);
      return builder;
    },
    eq: (...args: unknown[]) => {
      queryState.calls.push(['eq', ...args]);
      return builder;
    },
    order: (...args: unknown[]) => {
      queryState.calls.push(['order', ...args]);
      return builder;
    },
    limit: (...args: unknown[]) => {
      queryState.calls.push(['limit', ...args]);
      return Promise.resolve({ data: queryState.rows, error: null });
    },
  };
  return {
    supabase: {
      from: (table: string) => {
        queryState.calls.push(['from', table]);
        return builder;
      },
      rpc: (...args: unknown[]) => rpcMock(...args),
    },
  };
});

function setup() {
  const queryClient = createTestQueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { invalidate, wrapper };
}

describe('useToolingRevisions', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    queryState.rows = [];
    queryState.calls = [];
  });

  it('keys revisions under the per-tool scope so tool mutations refresh them', () => {
    expect(toolingRevisionKeys.list('tool-1')).toEqual([...toolingKeys.scoped('tool-1'), 'revisions']);
  });

  it('reads the tool revision register newest first and narrows the status', async () => {
    queryState.rows = [
      { id: 'rev-b', revision: 'B', status: 'released' },
      { id: 'rev-a', revision: 'A', status: 'superseded' },
    ];
    const { wrapper } = setup();
    const { result } = renderHook(() => useToolingDrawingRevisions('tool-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((row) => row.status)).toEqual(['released', 'superseded']);
    expect(queryState.calls).toContainEqual(['from', 'tooling_drawing_revisions']);
    expect(queryState.calls).toContainEqual(['eq', 'tooling_equipment_id', 'tool-1']);
    expect(queryState.calls).toContainEqual(['order', 'released_at', { ascending: false }]);
  });

  it('does not query without a tool id', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useToolingDrawingRevisions(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(queryState.calls).toEqual([]);
  });

  it('releases through the RPC with trimmed values and refreshes tool, history and list', async () => {
    rpcMock.mockResolvedValue({ data: 'rev-c', error: null });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useReleaseToolingDrawingRevision('tool-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        revision: ' C ',
        changeDescription: ' Pin moved ',
        drawingNumber: '  ',
        effectiveDate: '2026-10-15',
      });
    });

    expect(rpcMock).toHaveBeenCalledWith('release_tooling_drawing_revision', {
      p_tooling_id: 'tool-1',
      p_revision: 'C',
      p_change_description: 'Pin moved',
      p_drawing_number: undefined,
      p_effective_date: '2026-10-15',
    });
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([toolingKeys.detail('tool-1'), toolingKeys.scoped('tool-1'), [...toolingKeys.all, 'list']]),
    );
  });

  it('surfaces RPC errors without invalidating', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'TOOLING_PERMISSION_DENIED' } });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useReleaseToolingDrawingRevision('tool-1'), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ revision: 'C', changeDescription: 'x' })).rejects.toEqual({
        message: 'TOOLING_PERMISSION_DENIED',
      });
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
