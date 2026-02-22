import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentStudent, logoutStudent, subscribeToStudentAuth } from '../../../services/authService';
import { getReadTimestamp, subscribeNotificationsForUser } from '../services/notificationService';

export default function Navbar() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [readAt, setReadAt] = useState(() => getReadTimestamp(getCurrentStudent()?.uid));

  useEffect(() => {
    let stopNotifications = () => {};
    const stopAuth = subscribeToStudentAuth((user) => {
      stopNotifications();
      if (!user?.uid) {
        setNotifications([]);
        setReadAt(0);
        return;
      }
      setReadAt(getReadTimestamp(user.uid));
      stopNotifications = subscribeNotificationsForUser(user.uid, setNotifications);
    });

    return () => {
      stopNotifications();
      stopAuth();
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => (item.createdAt || 0) > readAt).length,
    [notifications, readAt]
  );

  const handleLogout = async () => {
    try {
      await logoutStudent();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      navigate('/login');
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>PrepLens</div>
      <div style={styles.links}>
        <Link to="/student/dashboard">Dashboard</Link>
        <Link to="/student/log">Log Activity</Link>
        <Link to="/student/notifications">
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Link>
        <button onClick={handleLogout} style={styles.button} type="button">
          Logout
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #ddd',
  },
  brand: { fontWeight: 700 },
  links: { display: 'flex', gap: 12, alignItems: 'center' },
  button: { cursor: 'pointer' },
};
