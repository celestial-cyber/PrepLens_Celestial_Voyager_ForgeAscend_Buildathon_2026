function formatLastActive(lastActiveAt) {
  if (!lastActiveAt) return 'N/A';
  return new Date(lastActiveAt).toLocaleDateString();
}

export default function StudentTable({ students = [], onSelect }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Total Activities</th>
            <th>Readiness</th>
            <th>Last Active</th>
            <th>Status</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 && (
            <tr>
              <td colSpan="7" className="admin-table-empty">
                No students found. Once student profiles are available, they will appear here.
              </td>
            </tr>
          )}
          {students.map((student) => {
            const activeCutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
            const isActive = (student.lastActiveAt || 0) >= activeCutoff;
            const isWeak = (student.readinessScore || 0) < 40 || !isActive || (student.streakDays || 0) <= 1;
            return (
              <tr
                key={student.uid || student.id}
                className="admin-table-row"
                onClick={() => onSelect && onSelect(student)}
              >
                <td>{student.name}</td>
                <td>{student.email || 'N/A'}</td>
                <td>{student.totalActivities ?? 0}</td>
                <td>{student.readinessScore ?? 0}</td>
                <td>{formatLastActive(student.lastActiveAt)}</td>
                <td>{isActive ? 'Active' : 'Inactive'}</td>
                <td>{isWeak ? <span className="admin-risk-badge">Flagged</span> : 'Normal'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
