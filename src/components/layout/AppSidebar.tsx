
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Forklift,
  ClipboardList,
  Users,
  Map,
  MapPinned,
  Building,
  FileText,
  ClipboardCheck,
  ClipboardSignature,
  FileSignature,
  Warehouse,
  Search,
  Layers,
  Shield,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isLightColor } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar-context";
import Logo from "@/components/ui/Logo";
import { ORGANIZATION_MEMBERS_PATH } from "@/features/organization/constants/routes";
import { useInventoryAccess } from "@/features/inventory/hooks/useInventoryAccess";
import { useI18n } from '@/i18n';
import { usePlatformAdminAccess, usePlatformAdminPendingAccessRequests } from '@/features/platform-admin/usePlatformAdminAccess';
import { platformAdminCopy } from '@/features/platform-admin/platformAdminCopy';

interface NavigationItem {
  translationKey: string;
  url: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  inventoryAccessRequired?: boolean;
}

interface NavigationGroup {
  translationKey: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    translationKey: "navigation.groups.fleet",
    items: [
      { translationKey: "navigation.items.equipment", url: "/dashboard/equipment", icon: Forklift },
      { translationKey: "navigation.items.fleetMap", url: "/dashboard/fleet-map", icon: Map },
      { translationKey: "navigation.items.facilityMap", url: "/dashboard/facility-map", icon: MapPinned },
      { translationKey: "navigation.items.tooling", url: "/dashboard/tooling", icon: Wrench },
      { translationKey: "navigation.items.inventory", url: "/dashboard/inventory", icon: Warehouse, inventoryAccessRequired: true },
      { translationKey: "navigation.items.partLookup", url: "/dashboard/part-lookup", icon: Search, inventoryAccessRequired: true },
      { translationKey: "navigation.items.partAlternates", url: "/dashboard/alternate-groups", icon: Layers, inventoryAccessRequired: true },
    ],
  },
  {
    translationKey: "navigation.groups.operations",
    items: [
      { translationKey: "navigation.items.dashboard", url: "/dashboard", icon: Home },
      { translationKey: "navigation.items.workOrders", url: "/dashboard/work-orders", icon: ClipboardList },
      { translationKey: "navigation.items.pmTemplates", url: "/dashboard/pm-templates", icon: ClipboardCheck, adminOnly: true },
      { translationKey: "navigation.items.dailyCheckIns", url: "/dashboard/operator-check-ins", icon: ClipboardSignature, adminOnly: true },
      { translationKey: "navigation.items.quickForms", url: "/dashboard/quick-forms", icon: FileSignature, adminOnly: true },
      { translationKey: "navigation.items.reports", url: "/dashboard/reports", icon: FileText },
    ],
  },
  {
    translationKey: "navigation.groups.infrastructure",
    items: [
      { translationKey: "navigation.items.teams", url: "/dashboard/teams", icon: Users },
      { translationKey: "navigation.items.organization", url: ORGANIZATION_MEMBERS_PATH, icon: Building },
    ],
  },
  // Audit Log lives under Organization settings (#1122).
  // DSR Cockpit lives in the Legal footer drawer + Settings → Privacy (admin-only).
];

const AppSidebar = () => {
  const location = useLocation();
  const { currentOrganization } = useOrganization();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const { language, t } = useI18n();
  const platformCopy = platformAdminCopy[language];
  const { isPlatformAdmin } = usePlatformAdminAccess();
  const { pendingCount } = usePlatformAdminPendingAccessRequests();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const orgBackgroundColor = currentOrganization?.backgroundColor;
  const hasCustomBranding = orgBackgroundColor && orgBackgroundColor !== '#ffffff';
  const isLightBrand = hasCustomBranding ? isLightColor(orgBackgroundColor) : true;

  const sidebarStyle = hasCustomBranding ? {
    '--brand': orgBackgroundColor,
    '--brand-foreground': isLightBrand ? '#1a1a1a' : '#ffffff',
    backgroundColor: orgBackgroundColor,
  } as React.CSSProperties : {};

  const textColorClass = hasCustomBranding ? 'text-brand-foreground' : '';
  const mutedTextColorClass = hasCustomBranding ? 'text-brand-foreground/70' : '';
  const hoverBackgroundClass = hasCustomBranding
    ? (isLightBrand ? 'hover:bg-brand-foreground/10' : 'hover:bg-brand-foreground/20')
    : '';
  const activeBackgroundClass = hasCustomBranding
    ? (isLightBrand ? 'bg-brand-foreground/15' : 'bg-brand-foreground/25')
    : '';

  const isAdmin =
    currentOrganization?.userRole === 'owner' ||
    currentOrganization?.userRole === 'admin';
  const { canView: canViewInventory } = useInventoryAccess();

  const renderNavItem = (item: NavigationItem) => {
    const isActive =
      item.url === ORGANIZATION_MEMBERS_PATH
        ? location.pathname.startsWith('/dashboard/organization')
        : location.pathname === item.url;
    return (
      <SidebarMenuItem key={item.translationKey}>
        <SidebarMenuButton
          asChild
          className={cn(
            "text-sm transition-colors duration-fast",
            textColorClass,
            hasCustomBranding ? '' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            hoverBackgroundClass,
            isActive && hasCustomBranding ? activeBackgroundClass : '',
            isActive && hasCustomBranding ? 'font-medium' : '',
            isActive && !hasCustomBranding ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground border-l-2 border-l-sidebar-primary rounded-l-sm shadow-[inset_0_0_0_1px_hsl(var(--sidebar-primary)/0.08)]' : ''
          )}
        >
          <Link to={item.url} onClick={handleNavClick}>
            <item.icon className="h-4 w-4" />
            <span>{t(item.translationKey)}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const visibleGroups = navigationGroups
    .map((group) => ({
      translationKey: group.translationKey,
      items: group.items.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.inventoryAccessRequired && !canViewInventory) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar variant="sidebar">
      <div
        className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
        data-control-sidebar={hasCustomBranding ? undefined : ''}
        style={sidebarStyle}
      >
        <SidebarHeader className="p-3 sm:p-4">
          <div className={cn("flex items-center gap-2 px-1 sm:px-2 py-1 sm:py-2", textColorClass)}>
            <Logo size="sm" />
            <span className="font-semibold text-base sm:text-lg">ZNTEQR</span>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 sm:px-3 overflow-x-hidden" role="navigation" aria-label={t('navigation.mainNavigation')}>
          {visibleGroups.map((group, idx) => (
            <React.Fragment key={group.translationKey}>
              {idx > 0 && <Separator className="mx-1 my-1 opacity-30" />}
              <SidebarGroup>
                <SidebarGroupLabel className={cn(
                  "text-[10px] uppercase tracking-widest font-semibold",
                  mutedTextColorClass || "text-sidebar-foreground/50"
                )}>
                  {t(group.translationKey)}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>{group.items.map(renderNavItem)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </React.Fragment>
          ))}
          {isPlatformAdmin && (
            <>
              <Separator className="mx-1 my-1 opacity-30" />
              <SidebarGroup>
                <SidebarGroupLabel className={cn("text-[10px] uppercase tracking-widest font-semibold", mutedTextColorClass || "text-sidebar-foreground/50")}>{platformCopy.navigationGroup}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={cn("text-sm transition-colors duration-fast", textColorClass, hasCustomBranding ? '' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', hoverBackgroundClass)}>
                        <Link to="/platform-admin" onClick={handleNavClick}>
                          <Shield className="h-4 w-4" />
                          <span>{platformCopy.title}</span>
                          {pendingCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-auto min-w-5 justify-center px-1 py-0 text-[10px]"
                              aria-label={`${pendingCount} pending access requests`}
                            >
                              {pendingCount}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
      </div>
    </Sidebar>
  );
};

export default AppSidebar;
