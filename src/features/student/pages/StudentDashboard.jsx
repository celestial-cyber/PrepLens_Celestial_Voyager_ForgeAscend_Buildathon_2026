import { useEffect, useMemo, useState } from 'react';
import CategoryProgressPie from '../dashboard/components/CategoryProgressPie';
import StreakCard from '../dashboard/components/StreakCard';
import SummaryCards from '../dashboard/components/SummaryCards';
import TaskList from '../dashboard/components/TaskList';
import { subscribeActivitiesForUser } from '../services/activityService';
import { subscribeStudentProfile, subscribeStudentProgress } from '../services/studentDataService';
import { subscribeTasksForUser } from '../services/taskService';
import { getCurrentStudent, subscribeToStudentAuth } from '../../../services/authService';
import { calculateReadiness } from '../../../utils/readinessCalculator';
import { subscribeTeachingSchedules } from '../../../services/scheduleService';
import { STUDY_CATALOG } from '../constants/studyCatalog';
import '../styles/studentDashboard.css';

function toDayKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function computeStreakFromActivities(activities = []) {
  const uniqueDays = Array.from(new Set(activities.map((item) => toDayKey(item.createdAt)).filter(Boolean))).sort();
  if (!uniqueDays.length) return 0;

  let streak = 1;
  for (let i = uniqueDays.length - 1; i > 0; i -= 1) {
    const current = new Date(`${uniqueDays[i]}T00:00:00.000Z`);
    const previous = new Date(`${uniqueDays[i - 1]}T00:00:00.000Z`);
    const diffDays = (current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays === 1) streak += 1;
    else break;
  }
  return streak;
}

export default function StudentDashboard() {
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [student, setStudent] = useState(getCurrentStudent());
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    let stopActivities = () => {};
    let stopTasks = () => {};
    let stopProfile = () => {};
    let stopProgress = () => {};

    const stopAuth = subscribeToStudentAuth((user) => {
      setStudent(user);
      stopActivities();
      stopTasks();
      stopProfile();
      stopProgress();

      if (!user?.uid) {
        setActivities([]);
        setTasks([]);
        setProfile(null);
        setProgress(null);
        return;
      }

      stopActivities = subscribeActivitiesForUser(user.uid, setActivities);
      stopTasks = subscribeTasksForUser(user.uid, setTasks);
      stopProfile = subscribeStudentProfile(user.uid, setProfile);
      stopProgress = subscribeStudentProgress(user.uid, setProgress);
    });

    return () => {
      stopActivities();
      stopTasks();
      stopProfile();
      stopProgress();
      stopAuth();
    };
  }, []);

  useEffect(() => {
    const stopSchedules = subscribeTeachingSchedules(setSchedules);
    return stopSchedules;
  }, []);

  const stats = useMemo(() => {
    const hoursStudied = activities.reduce((acc, item) => acc + item.hours, 0);
    const completedTasks = progress?.completedTasks ?? tasks.filter((task) => task.completed).length;
    const totalActivities = activities.length;
    const totalCodingCount = activities.filter((item) => item.category === 'coding').length || 0;
    const streakDays = computeStreakFromActivities(activities) || progress?.streakDays || 0;
    const categoryTotals = activities.reduce(
      (acc, item) => {
        const key = item.category || 'soft-skills';
        acc[key] = (acc[key] || 0) + (Number(item.hours) || 0);
        return acc;
      },
      { coding: 0, aptitude: 0, core: 0, 'soft-skills': 0 }
    );
    return {
      hoursStudied,
      completedTasks,
      totalActivities,
      totalCodingCount,
      streakDays,
      categoryTotals,
    };
  }, [activities, progress, tasks]);

  const readiness =
    progress?.readinessScore ??
    calculateReadiness({
      hoursStudied: stats.hoursStudied,
      completedTasks: stats.completedTasks,
      totalTasks: tasks.length,
    });

  function scheduleLabel(item) {
    const categoryLabel = STUDY_CATALOG[item.category]?.label || item.category;
    const topicLabel = STUDY_CATALOG[item.category]?.topics?.[item.topic]?.label || item.topic;
    return `${categoryLabel} / ${topicLabel} / ${item.chapter}`;
  }

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">Student Dashboard</h1>
      <p className="dashboard-meta">
        Track your day-to-day prep, stay consistent, and complete your assigned tasks.
      </p>
      <section className="dashboard-section">
        <h3 className="dashboard-section-title">Profile</h3>
        <p className="dashboard-meta"><strong>Name:</strong> {profile?.name || student?.displayName || 'Not set'}</p>
        <p className="dashboard-meta"><strong>Email:</strong> {profile?.email || student?.email || 'Not set'}</p>
        <p className="dashboard-meta"><strong>Target Exam:</strong> {profile?.targetExam || 'Not set'}</p>
        <p className="dashboard-meta"><strong>Grade:</strong> {profile?.grade || 'Not set'}</p>
      </section>
      <p className="dashboard-readiness">Prep readiness: {readiness}%</p>
      <SummaryCards stats={stats} />
      <section className="dashboard-columns">
        <section className="dashboard-section dashboard-column">
          <h3 className="dashboard-section-title">Category Progress (hours)</h3>
          <div className="category-progress-row">
            <div className="category-progress-graph">
              <CategoryProgressPie categoryTotals={stats.categoryTotals} />
            </div>
            <div className="category-progress-detail">
              <p className="dashboard-meta">Coding: {stats.categoryTotals.coding}</p>
              <p className="dashboard-meta">Aptitude: {stats.categoryTotals.aptitude}</p>
              <p className="dashboard-meta">Core: {stats.categoryTotals.core}</p>
              <p className="dashboard-meta">Soft Skills: {stats.categoryTotals['soft-skills']}</p>
            </div>
          </div>
        </section>
        <section className="dashboard-column">
          <StreakCard streakDays={stats.streakDays} activities={activities} />
          <section className="dashboard-section">
            <h3 className="dashboard-section-title">Teaching Schedule</h3>
            {schedules.length === 0 && <p className="dashboard-empty">No schedule published yet.</p>}
            {schedules.slice(0, 5).map((item) => (
              <p key={item.id} className="dashboard-meta">
                <strong>{item.date}:</strong> {scheduleLabel(item)}
                {item.note ? ` - ${item.note}` : ''}
              </p>
            ))}
          </section>
          <TaskList tasks={tasks} />
        </section>
      </section>
    </div>
  );
}
