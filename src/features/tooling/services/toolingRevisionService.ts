import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { ToolingDrawingRevision } from '@/features/tooling/types';

/**
 * Drawing revision register (see
 * supabase/migrations/20261011120000_tooling_alerts_and_revisions.sql).
 * Reads go through RLS (org members); the only write path is the
 * `release_tooling_drawing_revision` RPC (owner/admin), which supersedes the
 * previous revision and updates the tool's current drawing fields atomically.
 */

export interface ReleaseToolingDrawingRevisionInput {
  toolingId: string;
  revision: string;
  changeDescription: string;
  /** Blank keeps the tool's current drawing number. */
  drawingNumber?: string | null;
  /** YYYY-MM-DD; blank lets the database default to today. */
  effectiveDate?: string | null;
}

const REVISION_HISTORY_LIMIT = 200;

type DrawingRevisionRow = Tables<'tooling_drawing_revisions'>;

function toDrawingRevision(row: DrawingRevisionRow): ToolingDrawingRevision {
  return {
    ...row,
    status: row.status === 'superseded' ? 'superseded' : 'released',
  };
}

/** Trimmed text, or undefined so the RPC default applies. */
function optionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function listToolingDrawingRevisions(toolingId: string): Promise<ToolingDrawingRevision[]> {
  const { data, error } = await supabase
    .from('tooling_drawing_revisions')
    .select('*')
    .eq('tooling_equipment_id', toolingId)
    .order('released_at', { ascending: false })
    .limit(REVISION_HISTORY_LIMIT);
  if (error) throw error;
  return (data ?? []).map(toDrawingRevision);
}

/** Returns the new revision id. Raises TOOLING_* codes mapped by toolingErrorMessage. */
export async function releaseToolingDrawingRevision(input: ReleaseToolingDrawingRevisionInput): Promise<string> {
  const { data, error } = await supabase.rpc('release_tooling_drawing_revision', {
    p_tooling_id: input.toolingId,
    p_revision: input.revision.trim(),
    p_change_description: input.changeDescription.trim(),
    p_drawing_number: optionalText(input.drawingNumber),
    p_effective_date: optionalText(input.effectiveDate),
  });
  if (error) throw error;
  return data;
}
