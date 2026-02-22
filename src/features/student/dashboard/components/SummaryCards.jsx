export default function SummaryCards({ stats }) {
  const cards = [
    { label: 'Total Activities', value: stats.totalActivities },
    { label: 'Total Coding Count', value: stats.totalCodingCount },
    { label: 'Completed Tasks', value: stats.completedTasks },
    { label: 'Current Streak', value: `${stats.streakDays ?? 0} days` },
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
