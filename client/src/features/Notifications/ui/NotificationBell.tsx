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
  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  const auth = useAuth(); // Use the imported useAuth hook
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    // setIsLoading(true); setError(null);
    try {
      const fetchedNotifications = await getUserNotifications();
      setNotifications(fetchedNotifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      // setError('Could not load notifications.');
    } finally {
      // setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for auth.user.id which is currently NOT in AuthContext
    if (auth?.user?.id) {
      fetchNotifications();
      if (!socket.connected) socket.connect();

      const onSocketConnect = () => {
        if (auth.user) { // Add null check for auth.user
          console.log('Socket connected for notifications, joining user room:', auth.user.id);
          joinUserRoom(auth.user.id); // Pass user ID string to joinUserRoom
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
      socket.on('notification:new', handleNewNotification);

      return () => {
        socket.off('connect', onSocketConnect);
        socket.off('notification:new', handleNewNotification);
      };
    } else if (auth?.isAuthenticated) {
        // If authenticated but user.id is not available, log an error or handle appropriately.
        // This indicates AuthContext needs to be updated to provide user details.
        console.warn("User is authenticated, but user ID is not available in AuthContext for NotificationBell.");
    }
  }, [auth?.user?.id, auth?.isAuthenticated, fetchNotifications]);

  const handleNotificationClick = async (notification: NotificationDto) => {
    if (notification.sourceUrl) {
      navigate(notification.sourceUrl);
    }
    if (!notification.isRead) {
      try {
        const updatedNotification = await markNotificationAsRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? updatedNotification : n));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    setIsDropdownOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Render bell only if user object with ID exists
  if (!auth?.user?.id) {
      return null;
  }

  return (
    <div className={styles.bellContainer}>
      <span className={styles.bellIcon} onClick={() => setIsDropdownOpen(prev => !prev)}>
        🔔 {/* Placeholder for a proper Bell Icon */}
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
