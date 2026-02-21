import { useEffect, useMemo, useState } from 'react';
import ActivityChart from '../dashboard/components/ActivityChart';
import StreakCard from '../dashboard/components/StreakCard';
import SummaryCards from '../dashboard/components/SummaryCards';
import TaskList from '../dashboard/components/TaskList';
import { subscribeActivitiesForUser } from '../services/activityService';
import { subscribeStudentProfile, subscribeStudentProgress } from '../services/studentDataService';
import { subscribeTasksForUser } from '../services/taskService';
import { getCurrentStudent, subscribeToStudentAuth } from '../../../services/authService';
import { calculateReadiness } from '../../../utils/readinessCalculator';
import '../styles/studentDashboard.css';

export default function StudentDashboard() {
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [student, setStudent] = useState(getCurrentStudent());

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

  const stats = useMemo(() => {
    const hoursStudied = activities.reduce((acc, item) => acc + item.hours, 0);
    const completedTasks = progress?.completedTasks ?? tasks.filter((task) => task.completed).length;
    const totalActivities = activities.length;
    const totalCodingCount =
      activities.filter((item) => /coding|code|program/i.test(item.topic || item.title || '')).length || 0;
    const streakDays = progress?.streakDays ?? 0;
    return { hoursStudied, completedTasks, totalActivities, totalCodingCount, streakDays };
  }, [activities, progress, tasks]);

  const readiness =
    progress?.readinessScore ??
    calculateReadiness({
      hoursStudied: stats.hoursStudied,
      completedTasks: stats.completedTasks,
      totalTasks: tasks.length,
    });

  const chartData = activities.map((item) => ({ label: item.day, value: item.hours }));

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
      <ActivityChart data={chartData} />
      <StreakCard streakDays={stats.streakDays} />
      <TaskList tasks={tasks} />
    </div>
  );
}
