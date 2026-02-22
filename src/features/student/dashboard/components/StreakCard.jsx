function dayKey(offset) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

function toDayKey(item) {
  if (!item?.createdAt) return '';
  const date = new Date(item.createdAt);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export default function StreakCard({ streakDays, activities = [] }) {
  const activeDays = new Set(activities.map(toDayKey).filter(Boolean));
  const lastWeek = Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const key = dayKey(offset);
    return { key, active: activeDays.has(key) };
  });

  return (
    <section className="dashboard-section dashboard-section-hover">
      <h3 className="dashboard-section-title">Study Streak</h3>
      <p className="streak-value">{streakDays} days</p>
      <p className="streak-note">Keep your streak alive by logging at least one session daily.</p>
      <div className="streak-heatmap" aria-label="Weekly streak view">
        {lastWeek.map((day) => (
          <span
            key={day.key}
            className={`streak-cell ${day.active ? 'streak-cell-active' : ''}`}
            title={day.key}
          />
        ))}
      </div>
    </section>
  );
}
