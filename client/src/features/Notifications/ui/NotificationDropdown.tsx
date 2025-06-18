// client/src/features/Notifications/ui/NotificationDropdown.tsx
import React from 'react';
import { NotificationDto } from '../../../shared/api/notificationService';
import NotificationItem from './NotificationItem';
import styles from './NotificationDropdown.module.css';

interface NotificationDropdownProps {
  notifications: NotificationDto[];
  onNotificationClick: (notification: NotificationDto) => void;
  onMarkAllRead: () => void;
  unreadCount: number; // To decide if "Mark all read" should be enabled/shown
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ notifications, onNotificationClick, onMarkAllRead, unreadCount }) => {
  return (
    <div className={styles.dropdown}>
      <div className={styles.dropdownHeader}>
        <h4>Notifications</h4>
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead} className={styles.markAllButton}>
            Mark all as read
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <p className={styles.noNotifications}>No notifications yet.</p>
      ) : (
        notifications.map(notif => (
          <NotificationItem key={notif.id} notification={notif} onNotificationClick={onNotificationClick} />
        ))
      )}
    </div>
  );
};
export default NotificationDropdown;
