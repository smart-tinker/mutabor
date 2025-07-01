// client/src/features/Notifications/ui/NotificationBell.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../api';
import type { NotificationDto } from '../../../shared/api/notificationService';
import NotificationDropdown from './NotificationDropdown';
import { socket } from '../../../shared/lib/socket';
import { joinUserRoom } from '../../../shared/lib/socket';
import styles from './NotificationBell.module.css';
import { useAuth } from '../../../app/auth/AuthContext'; // Import useAuth hook

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const auth = useAuth();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const fetchedNotifications = await getUserNotifications();
      setNotifications(fetchedNotifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    if (auth?.user?.id) {
      fetchNotifications();
      if (!socket.connected) socket.connect();

      const onSocketConnect = () => {
        if (auth.user) {
          console.log('Socket connected for notifications, joining user room:', auth.user.id);
          joinUserRoom(auth.user.id);
        }
      };

      socket.on('connect', onSocketConnect);
      if(socket.connected) onSocketConnect();

      const handleNewNotification = (newNotification: NotificationDto) => {
        console.log('notification:new event received', newNotification);
        setNotifications(prev =>
          [newNotification, ...prev].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      };
      
      // ### НОВОЕ: Обработчик события прочтения уведомления ###
      const handleReadNotification = (readNotification: NotificationDto) => {
        console.log('notification:read event received', readNotification);
        setNotifications(prev => 
          prev.map(n => n.id === readNotification.id ? { ...n, isRead: true } : n)
        );
      };

      socket.on('notification:new', handleNewNotification);
      socket.on('notification:read', handleReadNotification); // ### НОВОЕ: Подписываемся на событие

      return () => {
        socket.off('connect', onSocketConnect);
        socket.off('notification:new', handleNewNotification);
        socket.off('notification:read', handleReadNotification); // ### НОВОЕ: Отписываемся от события
      };
    } else if (auth?.isAuthenticated) {
        console.warn("User is authenticated, but user ID is not available in AuthContext for NotificationBell.");
    }
  }, [auth?.user?.id, auth?.isAuthenticated, fetchNotifications]);

  const handleNotificationClick = async (notification: NotificationDto) => {
    if (notification.sourceUrl) {
      navigate(notification.sourceUrl);
    }
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        // Состояние обновится автоматически через WebSocket событие 'notification:read'
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    setIsDropdownOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      // Состояние обновится автоматически через WebSocket события
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  if (!auth?.user?.id) {
      return null;
  }

  return (
    <div className={styles.bellContainer}>
      <span className={styles.bellIcon} onClick={() => setIsDropdownOpen(prev => !prev)}>
        🔔
        {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
      </span>
      {isDropdownOpen && (
        <NotificationDropdown
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={handleMarkAllRead}
          unreadCount={unreadCount}
        />
      )}
    </div>
  );
};
export default NotificationBell;