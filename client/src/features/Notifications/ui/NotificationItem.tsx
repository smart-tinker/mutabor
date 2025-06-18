// client/src/features/Notifications/ui/NotificationItem.tsx
import React from 'react';
import { NotificationDto } from '../../../shared/api/notificationService';
import styles from './NotificationItem.module.css';

interface NotificationItemProps {
  notification: NotificationDto;
  onNotificationClick: (notification: NotificationDto) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onNotificationClick }) => {
  return (
    <div
      className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
      onClick={() => onNotificationClick(notification)}
    >
      <div className={styles.notificationText}>{notification.text}</div>
      <div className={styles.notificationTimestamp}>
        {new Date(notification.createdAt).toLocaleString()}
      </div>
    </div>
  );
};
export default NotificationItem;
