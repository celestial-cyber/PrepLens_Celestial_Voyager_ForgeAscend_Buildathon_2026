export default function SummaryCards({ stats }) {
  const cards = [
    { label: 'Total Activities', value: stats.totalActivities },
    { label: 'Total Coding Count', value: stats.totalCodingCount },
    { label: 'Completed Tasks', value: stats.completedTasks },
    { label: 'Weekly Hours', value: stats.weeklyHours ?? 0 },
    { label: 'Avg Daily Hours', value: stats.averageDailyHours ?? 0 },
  ];

  return (
    <section className="dashboard-grid">
      {cards.map((card) => (
        <article key={card.label} className="dashboard-card">
          <div className="dashboard-card-label">{card.label}</div>
          <div className="dashboard-card-value">{card.value}</div>
        </article>
      ))}
    </section>
  );
}
