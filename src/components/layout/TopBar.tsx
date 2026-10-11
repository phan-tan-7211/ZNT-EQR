
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar-context';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import ContextBreadcrumb from './ContextBreadcrumb';
import UserProfileMenu from './UserProfileMenu';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { useI18n } from '@/i18n';

const TopBar: React.FC = () => {
  const { toggleSidebar } = useSidebar();
  const { t } = useI18n();

  return (
    <header
      className="sticky top-0 z-sticky flex h-10 shrink-0 items-center gap-2 border-b transition-none"
      data-control-topbar=""
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 w-full text-foreground">
        {/* Mobile: brand logo doubles as the sidebar trigger. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={t('common.openSidebar')}
          className="-ml-1 h-8 w-8 p-1 shrink-0 sm:hidden"
        >
          <img
            src="/images/brand/icons/ZNTEQR-Icon-512.png"
            alt="ZNTEQR"
            className="h-6 w-6"
          />
        </Button>
        <SidebarTrigger className="-ml-1 shrink-0 hidden sm:inline-flex" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block border-border" />

        <div className="flex-1 min-w-0 flex items-center justify-center sm:justify-start gap-2">
          <ContextBreadcrumb />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
