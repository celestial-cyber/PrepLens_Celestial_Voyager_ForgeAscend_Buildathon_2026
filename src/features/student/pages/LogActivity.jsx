import { useState } from 'react';
import { logActivity } from '../services/activityService';
import { getCurrentStudent } from '../../../services/authService';

export default function LogActivity() {
  const [topic, setTopic] = useState('');
  const [hours, setHours] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const currentStudent = getCurrentStudent();
      await logActivity({ topic, hours: Number(hours), userId: currentStudent?.uid || '' });
      setMessage('Activity logged successfully.');
      setTopic('');
      setHours(1);
    } catch (submitError) {
      setError(submitError.message || 'Could not log activity.');
    }
  };

  return (
    <section className="dashboard-page">
      <h1>Log Study Activity</h1>
      <p className="dashboard-meta">Add today&apos;s progress so your dashboard and streak stay updated.</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
        <input
          min="0.5"
          step="0.5"
          type="number"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
        />
        <button type="submit">Save</button>
      </form>
      {message && <p className="dashboard-meta">{message}</p>}
      {error && <p style={styles.error}>{error}</p>}
    </section>
  );
}

const styles = {
  form: { display: 'grid', gap: 10, maxWidth: 320 },
  error: { margin: 0, color: '#b00020' },
};
