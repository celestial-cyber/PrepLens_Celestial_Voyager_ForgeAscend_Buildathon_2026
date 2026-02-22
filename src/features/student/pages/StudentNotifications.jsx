import { useEffect, useMemo, useState } from 'react';
import { getCurrentStudent, subscribeToStudentAuth } from '../../../services/authService';
import {
  getReadTimestamp,
  markNotificationsAsRead,
  subscribeNotificationsForUser,
} from '../services/notificationService';
import '../styles/studentDashboard.css';

function formatDate(value) {
  if (!value) return 'Just now';
  return new Date(value).toLocaleString();
}

export default function StudentNotifications() {
  const [student, setStudent] = useState(getCurrentStudent());
  const [notifications, setNotifications] = useState([]);
  const [readAt, setReadAt] = useState(() => getReadTimestamp(getCurrentStudent()?.uid));

  useEffect(() => {
    let stopNotifications = () => {};

    const stopAuth = subscribeToStudentAuth((user) => {
      setStudent(user);
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

  function handleMarkAllRead() {
    if (!student?.uid) return;
    markNotificationsAsRead(student.uid);
    setReadAt(Date.now());
  }

  return (
    <section className="dashboard-page">
      <h1 className="dashboard-title">Notifications</h1>
      <p className="dashboard-meta">Unread: {unreadCount}</p>
      <div className="dashboard-section">
        <button type="button" onClick={handleMarkAllRead} disabled={!notifications.length}>
          Mark all as read
        </button>
      </div>
      <div className="dashboard-section">
        {notifications.length === 0 && <p className="dashboard-empty">No notifications yet.</p>}
        {notifications.length > 0 && (
          <ul className="message-list">
            {notifications.map((item) => (
              <li key={item.id} className="message-item">
                <p className="message-text">
                  <strong>{item.type.toUpperCase()}:</strong> {item.text}
                </p>
                <p className="message-time">{formatDate(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
