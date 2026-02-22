import { useEffect, useMemo, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import StatsCards from '../components/StatsCards';
import { subscribeAllStudents } from '../services/adminDataService';
import { calculateReadinessScore } from '../utils/readinessScore';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);
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

  const stats = useMemo(() => {
    let activeStudents = 0;
    let inactiveStudents = 0;
    let readinessTotal = 0;

    students.forEach((student) => {
      const readiness = calculateReadinessScore({ readinessScore: student.readinessScore });
      readinessTotal += readiness;
      if (student.status === 'Active') activeStudents += 1;
      if (student.status === 'Inactive') inactiveStudents += 1;
    });

    return {
      totalStudents: students.length,
      activeStudents,
      inactiveStudents,
      avgReadiness: students.length ? Math.round((readinessTotal / students.length) * 100) / 100 : 0,
    };
  }, [students]);

  const readinessBuckets = useMemo(() => {
    const buckets = { High: 0, Medium: 0, Low: 0 };
    students.forEach((student) => {
      const score = calculateReadinessScore({ readinessScore: student.readinessScore });
      if (score >= 75) buckets.High += 1;
      else if (score >= 40) buckets.Medium += 1;
      else buckets.Low += 1;
    });
    return buckets;
  }, [students]);

  const weakStudents = useMemo(() => {
    return students.filter((student) => student.isFlagged);
  }, [students]);

  if (loading) {
    return <div className="admin-page"><p>Loading dashboard summary...</p></div>;
  }

  if (error) {
    return <div className="admin-page"><p className="admin-error">{error}</p></div>;
  }

  return (
    <section className="admin-page">
      <h1>Admin Dashboard</h1>
      <p className="admin-note">Monitor student engagement, readiness, and overall prep health.</p>
      {students.length === 0 && (
        <p className="admin-note">
          No student records are available yet. Add students or check data access settings.
        </p>
      )}
      <StatsCards stats={{ ...stats, weakStudents: weakStudents.length }} />

      <div className="admin-chart-grid">
        <article className="admin-card">
          <h3>Active vs Inactive</h3>
          <Pie
            data={{
              labels: ['Active', 'Inactive'],
              datasets: [
                {
                  data: [stats.activeStudents, stats.inactiveStudents],
                  backgroundColor: ['#111111', '#777777'],
                },
              ],
            }}
          />
        </article>

        <article className="admin-card">
          <h3>Readiness Distribution</h3>
          <Bar
            data={{
              labels: Object.keys(readinessBuckets),
              datasets: [
                {
                  label: 'Students',
                  data: Object.values(readinessBuckets),
                  backgroundColor: ['#111111', '#444444', '#9a9a9a'],
                },
              ],
            }}
          />
        </article>
      </div>

      <article className="admin-card">
        <h3>Weak Students (Auto-identified)</h3>
        {weakStudents.length === 0 && <p>None currently flagged.</p>}
        {weakStudents.length > 0 && (
          <ul className="admin-flag-list">
            {weakStudents.map((student) => (
              <li key={student.uid || student.id}>
                {student.name} ({student.email || 'N/A'}) - {student.riskReason || 'Needs attention'}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
