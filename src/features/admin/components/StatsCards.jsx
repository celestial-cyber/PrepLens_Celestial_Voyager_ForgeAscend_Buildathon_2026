export default function StatsCards({ stats = {} }) {
  const {
    totalStudents = 0,
    activeStudents = 0,
    inactiveStudents = 0,
    avgReadiness = 0,
    weakStudents = 0,
  } = stats;

  const cards = [
    { title: 'Total Students', value: totalStudents },
    { title: 'Active (last 3 days)', value: activeStudents },
    { title: 'Inactive', value: inactiveStudents },
    { title: 'Avg Readiness', value: avgReadiness },
    { title: 'Weak Students', value: weakStudents },
  ];

  return (
    <div className="admin-stats-grid">
      {cards.map((card) => (
        <article key={card.title} className="admin-card">
          <p className="admin-card-label">{card.title}</p>
          <p className="admin-card-value">{card.value}</p>
        </article>
      ))}
    </div>
  );
}
