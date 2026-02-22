import { useEffect, useState } from 'react';
import { createAdminTask, getAllStudents } from '../services/adminDataService';
import { appendAdminMessage } from '../../student/services/messageService';
import { categoryOptions, chapterOptions, topicOptions } from '../../student/constants/studyCatalog';
import { createTeachingSchedule } from '../../../services/scheduleService';

export default function CreateTask() {
  const [students, setStudents] = useState([]);
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduleCategory, setScheduleCategory] = useState('coding');
  const [scheduleTopic, setScheduleTopic] = useState('dsa');
  const [scheduleChapter, setScheduleChapter] = useState('Arrays');
  const [scheduleNote, setScheduleNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      try {
        const allStudents = await getAllStudents();
        if (!isMounted) return;
        setStudents(allStudents);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError.message || 'Failed to load students.');
      }
    }

    loadStudents();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const trimmedTitle = String(title || '').trim();
      await createAdminTask({ userId, title: trimmedTitle, completed: false });
      const messageText = adminMessage.trim() || `New task assigned: ${trimmedTitle}`;
      await appendAdminMessage({ userId, text: messageText });
      setTitle('');
      setAdminMessage('');
      setMessage('Task and message saved successfully.');
    } catch (submitError) {
      setError(submitError.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleScheduleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const categoryLabel = categoryOptions().find((item) => item.value === scheduleCategory)?.label || scheduleCategory;
      const topicLabel = topicOptions(scheduleCategory).find((item) => item.value === scheduleTopic)?.label || scheduleTopic;
      await createTeachingSchedule({
        date: scheduleDate,
        category: scheduleCategory,
        topic: scheduleTopic,
        chapter: scheduleChapter,
        note: scheduleNote,
      });
      const scheduleMessage = `Schedule for ${scheduleDate}: ${categoryLabel} / ${topicLabel} / ${scheduleChapter}${scheduleNote ? ` - ${scheduleNote}` : ''}`;
      await Promise.all(
        students.map((student) => appendAdminMessage({ userId: student.uid || student.id, text: scheduleMessage }))
      );
      setScheduleNote('');
      setMessage('Teaching schedule published.');
    } catch (submitError) {
      setError(submitError.message || 'Failed to publish schedule.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleScheduleCategoryChange(nextCategory) {
    const nextTopic = topicOptions(nextCategory)[0]?.value || '';
    const nextChapter = chapterOptions(nextCategory, nextTopic)[0]?.value || '';
    setScheduleCategory(nextCategory);
    setScheduleTopic(nextTopic);
    setScheduleChapter(nextChapter);
  }

  function handleScheduleTopicChange(nextTopic) {
    const nextChapter = chapterOptions(scheduleCategory, nextTopic)[0]?.value || '';
    setScheduleTopic(nextTopic);
    setScheduleChapter(nextChapter);
  }

  return (
    <section className="admin-page">
      <h1>Create Task</h1>
      <p className="admin-note">Assign a focused action item and optional note to keep students on track.</p>
      <form onSubmit={handleSubmit} className="admin-form">
        <label htmlFor="student-select">Student</label>
        <select
          id="student-select"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          required
        >
          <option value="">Select a student</option>
          {students.map((student) => (
            <option key={student.uid || student.id} value={student.uid || student.id}>
              {student.name} ({student.email || 'No email'})
            </option>
          ))}
        </select>

        <label htmlFor="task-title">Task Title</label>
        <input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter task title"
          required
        />

        <label htmlFor="admin-message">Message to Student</label>
        <textarea
          id="admin-message"
          value={adminMessage}
          onChange={(event) => setAdminMessage(event.target.value)}
          placeholder="Add instruction or motivation for this task"
          rows={4}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Task'}
        </button>
      </form>

      <section className="admin-card">
        <h2>Publish Daily Teaching Schedule</h2>
        <form onSubmit={handleScheduleSubmit} className="admin-form">
          <label htmlFor="schedule-date">Date</label>
          <input
            id="schedule-date"
            type="date"
            value={scheduleDate}
            onChange={(event) => setScheduleDate(event.target.value)}
            required
          />

          <label htmlFor="schedule-category">Category</label>
          <select
            id="schedule-category"
            value={scheduleCategory}
            onChange={(event) => handleScheduleCategoryChange(event.target.value)}
            required
          >
            {categoryOptions().map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <label htmlFor="schedule-topic">Topic</label>
          <select
            id="schedule-topic"
            value={scheduleTopic}
            onChange={(event) => handleScheduleTopicChange(event.target.value)}
            required
          >
            {topicOptions(scheduleCategory).map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <label htmlFor="schedule-chapter">Chapter</label>
          <select
            id="schedule-chapter"
            value={scheduleChapter}
            onChange={(event) => setScheduleChapter(event.target.value)}
            required
          >
            {chapterOptions(scheduleCategory, scheduleTopic).map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <label htmlFor="schedule-note">Notes</label>
          <textarea
            id="schedule-note"
            value={scheduleNote}
            onChange={(event) => setScheduleNote(event.target.value)}
            placeholder="Optional guidance for students"
            rows={3}
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : 'Publish Schedule'}
          </button>
        </form>
      </section>

      {message && <p>{message}</p>}
      {error && <p className="admin-error">{error}</p>}
    </section>
  );
}
