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
import { getActivitiesByUserId, getAllStudents } from '../services/adminDataService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStudents();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSelect(student) {
    setSelectedStudent(student);
    setActivities([]);

    try {
      const items = await getActivitiesByUserId(student.uid || student.id);
      setActivities(items);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load activities for student.');
    }
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

  return (
    <section className="admin-page">
      <h1>Students</h1>
      {loading && <p>Loading students...</p>}
      {error && <p className="admin-error">{error}</p>}

      {!loading && <StudentTable students={students} onSelect={handleSelect} />}

      {selectedStudent && (
        <article className="admin-card admin-student-activity">
          <h2>{selectedStudent.name} Activity</h2>
          {activities.length > 0 ? <Bar data={activityChartData} /> : <p>No activities found.</p>}
        </article>
      )}
    </section>
  );
}
