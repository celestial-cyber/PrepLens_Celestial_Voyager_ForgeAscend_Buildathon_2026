import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryProgressPie({ categoryTotals }) {
  const values = [
    categoryTotals.coding || 0,
    categoryTotals.aptitude || 0,
    categoryTotals.core || 0,
    categoryTotals['soft-skills'] || 0,
  ];

  const hasValues = values.some((value) => value > 0);
  if (!hasValues) {
    return <p className="dashboard-empty">Log activities to view category split.</p>;
  }

  return (
    <div className="category-pie-wrap">
      <Pie
        data={{
          labels: ['Coding', 'Aptitude', 'Core', 'Soft Skills'],
          datasets: [
            {
              data: values,
              backgroundColor: ['#111', '#444', '#777', '#aaa'],
            },
          ],
        }}
        options={{
          plugins: {
            legend: { position: 'bottom' },
          },
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
