import { useState } from 'react';
import { logActivity } from '../services/activityService';
import { getCurrentStudent } from '../../../services/authService';
import { categoryOptions, chapterOptions, topicOptions } from '../constants/studyCatalog';

export default function LogActivity() {
  const [category, setCategory] = useState('coding');
  const [topicKey, setTopicKey] = useState('dsa');
  const [chapter, setChapter] = useState('Arrays');
  const [completionPercent, setCompletionPercent] = useState(40);
  const [hours, setHours] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const currentStudent = getCurrentStudent();
      await logActivity({
        category,
        topicKey,
        chapter,
        completionPercent: Number(completionPercent),
        hours: Number(hours),
        userId: currentStudent?.uid || '',
      });
      setMessage('Activity logged successfully.');
      setHours(1);
      setCompletionPercent(40);
    } catch (submitError) {
      setError(submitError.message || 'Could not log activity.');
    }
  };

  const topics = topicOptions(category);
  const chapters = chapterOptions(category, topicKey);

  function handleCategoryChange(nextCategory) {
    const nextTopics = topicOptions(nextCategory);
    const nextTopic = nextTopics[0]?.value || '';
    const nextChapter = chapterOptions(nextCategory, nextTopic)[0]?.value || '';
    setCategory(nextCategory);
    setTopicKey(nextTopic);
    setChapter(nextChapter);
  }

  function handleTopicChange(nextTopic) {
    const nextChapter = chapterOptions(category, nextTopic)[0]?.value || '';
    setTopicKey(nextTopic);
    setChapter(nextChapter);
  }

  return (
    <section className="dashboard-page">
      <h1>Log Study Activity</h1>
      <p className="dashboard-meta">Select category, topic, chapter, and completion to track daily progress.</p>
      <form onSubmit={handleSubmit} style={styles.form} className="dashboard-section">
        <label>
          Category
          <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} required>
            {categoryOptions().map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>

        <label>
          Topic
          <select value={topicKey} onChange={(e) => handleTopicChange(e.target.value)} required>
            {topics.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>

        <label>
          Chapter
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} required>
            {chapters.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>

        <label>
          Completion (%)
          <input
            min="0"
            max="100"
            step="5"
            type="number"
            value={completionPercent}
            onChange={(e) => setCompletionPercent(e.target.value)}
            required
          />
        </label>

        <label>
          Study Hours
        <input
          min="0.5"
          step="0.5"
          type="number"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
        />
        </label>
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
