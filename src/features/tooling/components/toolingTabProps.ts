import type { ToolingOverview } from '@/features/tooling/types';

/** Props every detail tab receives from ToolingDetailPage. */
export interface ToolingTabProps {
  tool: ToolingOverview;
  /** Org owner/admin. */
  canManage: boolean;
  /** Owner/admin or team role with equipment.update on the tool's team. */
  canOperate: boolean;
}
