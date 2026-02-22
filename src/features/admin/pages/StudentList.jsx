import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import StudentTable from '../components/StudentTable';
import { subscribeAllStudents, subscribeStudentReport } from '../services/adminDataService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const stop = subscribeAllStudents((allStudents) => {
      setStudents(allStudents);
      setLoading(false);
      setError('');
    });
    return stop;
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    const key = selectedStudent.uid || selectedStudent.id;
    const refreshed = students.find((item) => (item.uid || item.id) === key);
    if (!refreshed) return;
    if (
      refreshed.readinessScore !== selectedStudent.readinessScore ||
      refreshed.streakDays !== selectedStudent.streakDays ||
      refreshed.completedTasks !== selectedStudent.completedTasks ||
      refreshed.totalActivities !== selectedStudent.totalActivities ||
      refreshed.lastActiveAt !== selectedStudent.lastActiveAt
    ) {
      setSelectedStudent(refreshed);
    }
  }, [students, selectedStudent]);

  useEffect(() => {
    if (!selectedStudent) return () => {};
    const userId = selectedStudent.uid || selectedStudent.id;
    const stop = subscribeStudentReport(userId, ({ activities: nextActivities, tasks: nextTasks }) => {
      setActivities(nextActivities);
      setTasks(nextTasks);
    });
    return stop;
  }, [selectedStudent]);

  function handleSelect(student) {
    setSelectedStudent(student);
    setActivities([]);
    setTasks([]);
  }

  const activityChartData = useMemo(() => {
    const labels = activities.map((item) => item.day);
    const values = activities.map((item) => item.hours || 0);
    return {
      labels,
      datasets: [
        {
          label: 'Study hours',
          data: values,
          backgroundColor: '#111111',
        },
      ],
    };
  }, [activities]);

  const selectedSummary = useMemo(() => {
    if (!selectedStudent) return null;
    const totalHours = activities.reduce((acc, item) => acc + (Number(item.hours) || 0), 0);
    const avgHours = activities.length ? Math.round((totalHours / activities.length) * 10) / 10 : 0;
    const avgCompletion = activities.length
      ? Math.round(
        activities.reduce((acc, item) => acc + (Number(item.completionPercent) || 0), 0) / activities.length
      )
      : 0;
    const categoryCompletion = activities.reduce((acc, item) => {
      const key = item.category || 'other';
      if (!acc[key]) acc[key] = { total: 0, count: 0 };
      acc[key].total += Number(item.completionPercent) || 0;
      acc[key].count += 1;
      return acc;
    }, {});
    const taskCount = tasks.length;
    const completedTaskCount = tasks.filter((task) => task.completed).length;
    return { totalHours, avgHours, avgCompletion, categoryCompletion, taskCount, completedTaskCount };
  }, [activities, selectedStudent, tasks]);

  return (
    <section className="admin-page">
      <h1>Students</h1>
      <p className="admin-note">Select a student row to view individual activity history.</p>
      {loading && <p>Loading students...</p>}
      {error && <p className="admin-error">{error}</p>}

      {!loading && <StudentTable students={students} onSelect={handleSelect} />}

      {selectedStudent && (
        <article className="admin-card admin-student-activity">
          <h2>{selectedStudent.name} Report</h2>
          <p>Hours logged: {selectedStudent.hoursLogged ?? 0}</p>
          <p>Readiness score: {selectedStudent.readinessScore ?? 0}%</p>
          <p>Current streak: {selectedStudent.streakDays ?? 0} days</p>
          <p>Completed tasks: {selectedStudent.completedTasks ?? 0}</p>
          <p>Total activities: {selectedStudent.totalActivities ?? 0}</p>
          <p>Status: {selectedStudent.status || 'No activity'}</p>
          <p>Flagged: {selectedStudent.isFlagged ? 'Yes' : 'No'}</p>
          {selectedStudent.riskReason && <p>Reason: {selectedStudent.riskReason}</p>}
          <p>Total hours logged: {selectedSummary?.totalHours ?? 0}</p>
          <p>Average hours per log: {selectedSummary?.avgHours ?? 0}</p>
          <p>Average chapter completion: {selectedSummary?.avgCompletion ?? 0}%</p>
          <p>Tasks assigned: {selectedSummary?.taskCount ?? 0}</p>
          <p>Tasks completed: {selectedSummary?.completedTaskCount ?? 0}</p>
          <div>
            {selectedSummary && Object.entries(selectedSummary.categoryCompletion).map(([key, value]) => (
              <p key={key}>
                {key}: {Math.round(value.total / (value.count || 1))}% avg completion
              </p>
            ))}
          </div>
          {activities.length > 0 ? <Bar data={activityChartData} /> : <p>No activities found.</p>}
          {tasks.length > 0 && (
            <div>
              <h3>Recent Assigned Tasks</h3>
              {tasks.slice(0, 5).map((task) => (
                <p key={task.id}>
                  {task.title} - {task.completed ? 'Completed' : 'Pending'}
                </p>
              ))}
            </div>
          )}
        </article>
      )}
    </section>
  );
}
