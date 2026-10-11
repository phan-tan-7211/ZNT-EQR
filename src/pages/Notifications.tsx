import { useI18n } from '@/i18n';
import { localizeNotificationDetail } from './notifications/notificationCtaLabels';
// fallow-ignore-file code-duplication
// Duplication rationale: Notifications page reuses display formatting helpers
import React, { useState } from 'react';
import { handleKeyboardActivation } from '@/components/a11y/keyboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Calendar, ArrowRight } from 'lucide-react';
import NotificationsToolbar from './notifications/NotificationsToolbar';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { 
  useRealTimeNotifications, 
  useNotificationSubscription,
  useMarkAllNotificationsAsRead
} from '@/hooks/useNotificationSettings';
import { useMarkNotificationAsRead, type Notification } from '@/features/work-orders/hooks/useWorkOrderData';
import { toNotificationData } from '@/hooks/useOrganizationNotifications';
import { useNotificationMarkReadOnClick } from '@/hooks/useNotificationMarkReadOnClick';
import { logger } from '@/utils/logger';
import {
  getNotificationEmoji,
  getNotificationTypeLabel,
  localizeNotificationContent,
} from '@/utils/notifications/notificationDisplay';
import {
  navigateForNotification,
  resolveNotificationDestination,
} from '@/utils/notifications/notificationDestination';

const Notifications: React.FC = () => {
  const { t, language } = useI18n();
  const { formatDate, formatTime } = useFormatTimestamp();
  const { organizationId, switchOrganization } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');

  // Set up real-time notifications
  const { data: notificationRows = [], isLoading } = useRealTimeNotifications(organizationId || '');
  const notifications: Notification[] = notificationRows.map((row) => ({
    ...row,
    data: toNotificationData(row.data),
  }));
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  
  // Set up real-time subscription
  useNotificationSubscription(organizationId || '');

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    
    const matchesRead = filterRead === 'all' || 
                       (filterRead === 'read' && notification.read) ||
                       (filterRead === 'unread' && !notification.read);
    
    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markReadIfNeeded = useNotificationMarkReadOnClick(markAsReadMutation);

  const handleNotificationClick = async (notification: Notification) => {
    await markReadIfNeeded(notification);

    await navigateForNotification({
      notification,
      organizationId: organizationId ?? undefined,
      navigate,
      switchOrganization,
    });
  };

  const handleMarkAllAsRead = async () => {
    if (!organizationId) return;
    
    try {
      await markAllAsReadMutation.mutateAsync(organizationId);
    } catch (error) {
      logger.error('Error marking all notifications as read', error);
    }
  };

  if (isLoading) {
    return (
      <Page maxWidth="full" padding="workspace" className="space-y-6">
        <PageHeader
          title={t('notificationPage.title')}
          description={t('notificationPage.historySubtitle')}
          icon={<Bell className="h-5 w-5" />}
        />
        <Card>
          <CardContent className="p-6">
            <div className="h-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page maxWidth="full" padding="workspace" className="space-y-6">
      <PageHeader
        title={t('notificationPage.title')}
        description={t('notificationPage.retentionSubtitle')}
        icon={<Bell className="h-5 w-5" />}
        meta={unreadCount > 0 ? <Badge variant="destructive">{t('notificationPage.unreadCount', { count: unreadCount })}</Badge> : undefined}
        inlineMetaOnMobile
        actions={unreadCount > 0 ? (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <Check className="h-4 w-4 mr-2" />
            {t('notificationPage.markAllRead')}
          </Button>
        ) : undefined}
      />

      {/* Filters */}
      <NotificationsToolbar
        searchTerm={searchTerm}
        filterType={filterType}
        filterRead={filterRead}
        resultCount={filteredNotifications.length}
        onSearchChange={setSearchTerm}
        onFilterTypeChange={setFilterType}
        onFilterReadChange={setFilterRead}
        onClearFilters={() => {
          setSearchTerm('');
          setFilterType('all');
          setFilterRead('all');
        }}
      />

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('notificationPage.historyTitle')}
            <Badge variant="secondary">{t('notificationPage.count', { count: filteredNotifications.length })}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">{t('notificationPage.empty')}</p>
              <p className="text-sm">
                {searchTerm || filterType !== 'all' || filterRead !== 'all'
                  ? t('notificationPage.adjustFilters')
                  : t('notificationPage.emptyDefault')
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const dest = resolveNotificationDestination(notification);
                const isTransferRequest =
                  notification.type === 'ownership_transfer_request' ||
                  notification.type === 'workspace_merge_request';
                const isActionRequired = isTransferRequest && !notification.read;
                
                return (
                <div
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                    isActionRequired
                      ? 'bg-primary/5 border-primary/40 border-l-4'
                      : notification.read 
                        ? 'bg-background opacity-75' 
                        : 'bg-muted/30 border-primary/20'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) =>
                    handleKeyboardActivation(e, () => handleNotificationClick(notification))
                  }
                >
                  <div className="flex gap-4">
                    <div className="text-2xl shrink-0 mt-1">
                      {getNotificationEmoji(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm sm:text-base flex items-center gap-2">
                            {localizeNotificationContent(notification, t, language).title}
                            {!notification.read && (
                              <div className="h-2 w-2 bg-primary rounded-full shrink-0" />
                            )}
                          </h3>
                          <Badge variant="outline" className="text-xs mt-1">
                            {t(`notificationPage.${notification.type}`) === `notificationPage.${notification.type}` ? getNotificationTypeLabel(notification.type) : t(`notificationPage.${notification.type}`)}
                          </Badge>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(notification.created_at)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {localizeNotificationContent(notification, t, language).message}
                      </p>
                      
                      {dest.navigable && (
                        <div className="flex items-center gap-2 mt-3">
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="text-xs text-primary font-medium">
                            {localizeNotificationDetail(dest.cta.detail, t)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </Page>
  );
};

export default Notifications;
