import { useEffect, useState } from 'react';
import { getCurrentStudent, subscribeToStudentAuth } from '../../../services/authService';
import { subscribeMessagesForUser } from '../services/messageService';
import '../styles/studentDashboard.css';

function formatDate(value) {
  if (!value) return 'Just now';
  return new Date(value).toLocaleString();
}

export default function StudentMessages() {
  const [student, setStudent] = useState(getCurrentStudent());
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let stopMessages = () => {};

    const stopAuth = subscribeToStudentAuth((user) => {
      setStudent(user);
      stopMessages();

      if (!user?.uid) {
        setMessages([]);
        return;
      }

      stopMessages = subscribeMessagesForUser(user.uid, setMessages);
    });

    return () => {
      stopMessages();
      stopAuth();
    };
  }, []);

  return (
    <section className="dashboard-page">
      <h1 className="dashboard-title">Admin Messages</h1>
      <p className="dashboard-meta">Messages for: {student?.email || 'Unknown student'}</p>
      <p className="dashboard-meta">Check this section regularly for new tasks, reminders, and feedback.</p>
      <div className="dashboard-section">
        {messages.length === 0 && <p className="dashboard-empty">No admin messages yet.</p>}
        {messages.length > 0 && (
          <ul className="message-list">
            {messages.map((message) => (
              <li key={message.id} className="message-item">
                <p className="message-text">{message.text}</p>
                <p className="message-time">{formatDate(message.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
