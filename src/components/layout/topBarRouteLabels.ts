/**
 * Shared route-label resolution for the global TopBar / ContextBreadcrumb.
 *
 * `getPageLabelKey` exposes stable i18n keys for UI rendering.
 */

export const ROUTE_LABEL_KEYS: Record<string, string> = {
  '/dashboard': 'breadcrumb.dashboard',
  '/dashboard/scan': 'breadcrumb.scanQr',
  '/dashboard/equipment': 'breadcrumb.equipment',
  '/dashboard/work-orders': 'breadcrumb.workOrders',
  '/dashboard/fleet-map': 'breadcrumb.fleetMap',
  '/dashboard/facility-map': 'facilityMap.title',
  '/dashboard/tooling': 'tooling.title',
  '/dashboard/inventory': 'breadcrumb.inventory',
  '/dashboard/part-lookup': 'breadcrumb.partLookup',
  '/dashboard/alternate-groups': 'breadcrumb.partAlternates',
  '/dashboard/teams': 'breadcrumb.teams',
  '/dashboard/organization': 'breadcrumb.settings',
  '/dashboard/organization/settings': 'breadcrumb.settings',
  '/dashboard/organization/members': 'breadcrumb.members',
  '/dashboard/organization/integrations': 'breadcrumb.integrations',
  '/dashboard/pm-templates': 'breadcrumb.pmTemplates',
  '/dashboard/pm-templates/new': 'breadcrumb.newPmTemplate',
  '/dashboard/operator-check-ins': 'breadcrumb.dailyCheckIns',
  '/dashboard/reports': 'breadcrumb.reports',
  '/dashboard/organization/audit-log': 'breadcrumb.auditLog',
  '/dashboard/organization/permissions': 'breadcrumb.permissions',
  '/dashboard/settings': 'breadcrumb.settings',
  '/dashboard/support': 'breadcrumb.supportTickets',
};

export const ROUTES_WITH_PAGE_H1 = new Set([
  '/dashboard',
  '/dashboard/scan',
  '/dashboard/equipment',
  '/dashboard/work-orders',
  '/dashboard/inventory',
  '/dashboard/fleet-map',
  '/dashboard/facility-map',
  '/dashboard/tooling',
  '/dashboard/teams',
  '/dashboard/reports',
  '/dashboard/pm-templates',
  '/dashboard/organization/audit-log',
  '/dashboard/organization/permissions',
  '/dashboard/settings',
  '/dashboard/support',
  '/dashboard/organization',
  '/dashboard/organization/settings',
  '/dashboard/organization/members',
  '/dashboard/organization/integrations',
]);

const MOBILE_DETAIL_PREFIXES = [
  '/dashboard/equipment/',
  '/dashboard/work-orders/',
  '/dashboard/inventory/',
  '/dashboard/tooling/',
];

export function shouldSuppressLabelOnMobile(pathname: string): boolean {
  if (ROUTES_WITH_PAGE_H1.has(pathname)) return true;
  return MOBILE_DETAIL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getPageLabelKey(pathname: string): string {
  if (ROUTE_LABEL_KEYS[pathname]) return ROUTE_LABEL_KEYS[pathname];
  if (pathname.endsWith('/edit') && pathname.includes('/pm-templates/')) {
    return 'breadcrumb.editPmTemplate';
  }
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const base = `/${segments[0]}/${segments[1]}`;
    if (ROUTE_LABEL_KEYS[base]) return ROUTE_LABEL_KEYS[base];
  }
  return '';
}
