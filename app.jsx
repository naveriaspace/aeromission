// Main App — state management, layout, Google auth integration

const VIEWS = ['gantt', 'resources', 'dashboard', 'calendar'];

// ── Dashboard summary cards ──────────────────────────────────────────────────
function DashboardView({ missions, calendarEvents }) {
  const totalTasks = missions.reduce((s, m) => s + m.tasks.length, 0);
  const completedTasks = missions.reduce((s, m) => s + m.tasks.filter(t => t.progress === 100).length, 0);
  const criticalTasks = missions.reduce((s, m) => s + m.tasks.filter(t => t.critical).length, 0);
  const activeMissions = missions.filter(m => m.status === 'Active').length;

  const upcomingMilestones = missions.flatMap(m =>
    m.tasks.filter(t => t.type === 'milestone' && t.progress < 100)
      .map(t => ({ ...t, missionName: m.name, missionColor: m.color }))
  ).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 6);

  const upcoming = calendarEvents.filter(ev => {
    const d = new Date(ev.start?.date || ev.start?.dateTime);
    return d >= new Date() && d <= new Date(Date.now() + 30 * 86400000);
  }).slice(0, 5);

  return (
    <div className="dashboard-view">
      <div className="dash-stats">
        <StatCard label="Active Missions" value={activeMissions} color="#0ea5e9" icon="🚀" />
        <StatCard label="Total Tasks" value={totalTasks} color="#6366f1" icon="📋" />
        <StatCard label="Completed" value={`${completedTasks}/${totalTasks}`} color="#22c55e" icon="✓" />
        <StatCard label="Critical Tasks" value={criticalTasks} color="#ef4444" icon="⚡" />
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-title">Upcoming Milestones</div>
          {upcomingMilestones.length === 0 && <div className="empty-state">No upcoming milestones</div>}
          {upcomingMilestones.map(m => (
            <div key={m.id} className="milestone-row">
              <span className="milestone-diamond" style={{ color: m.missionColor }}>◆</span>
              <div className="milestone-info">
                <span className="milestone-name">{m.name}</span>
                <span className="milestone-mission">{m.missionName}</span>
              </div>
              <span className="milestone-date">{m.start}</span>
            </div>
          ))}
        </div>

        <div className="dash-card">
          <div className="dash-card-title">Mission Status</div>
          {missions.map((m, i) => {
            const done = m.tasks.filter(t => t.progress === 100).length;
            const total = m.tasks.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <div key={m.id} className="mission-progress-row">
                <span className="mission-dot" style={{ background: m.color }}></span>
                <div className="mission-progress-info">
                  <span className="mission-prog-name">{m.name}</span>
                  <div className="mini-progress-track">
                    <div className="mini-progress-fill" style={{ width: `${pct}%`, background: m.color }} />
                  </div>
                </div>
                <span className="mission-prog-pct">{pct}%</span>
              </div>
            );
          })}
        </div>

        <div className="dash-card">
          <div className="dash-card-title">Calendar (Next 30 Days)</div>
          {upcoming.length === 0 && <div className="empty-state">No calendar events</div>}
          {upcoming.map((ev, i) => (
            <div key={i} className="cal-event-row">
              <span className="cal-event-dot"></span>
              <div className="cal-event-info">
                <span className="cal-event-name">{ev.summary}</span>
                <span className="cal-event-date">{ev.start?.date || ev.start?.dateTime?.slice(0,10)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// ── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({ missions, calendarEvents, onSyncToCalendar, syncing }) {
  const now = new Date('2026-05-01');
  const [month, setMonth] = React.useState({ y: now.getFullYear(), m: now.getMonth() });

  const firstDay = new Date(month.y, month.m, 1);
  const lastDay = new Date(month.y, month.m + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const allMilestones = missions.flatMap(mi =>
    mi.tasks.filter(t => t.type === 'milestone')
      .map(t => ({ date: t.start, label: t.name, color: mi.color, source: 'mission' }))
  );
  const allDeadlines = missions.flatMap(mi =>
    mi.tasks.filter(t => t.type === 'task')
      .map(t => ({ date: t.end || t.start, label: t.name + ' (end)', color: mi.color + '99', source: 'task' }))
  );
  const calMapped = calendarEvents.map(ev => ({
    date: ev.start?.date || ev.start?.dateTime?.slice(0,10),
    label: ev.summary,
    color: '#f59e0b',
    source: 'calendar',
  }));

  const events = [...allMilestones, ...allDeadlines, ...calMapped];
  const byDate = {};
  events.forEach(ev => {
    if (!ev.date) return;
    if (!byDate[ev.date]) byDate[ev.date] = [];
    byDate[ev.date].push(ev);
  });

  const monthName = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' });
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="calendar-view">
      <div className="cal-header">
        <button className="icon-btn" onClick={() => setMonth(p => ({ y: p.m === 0 ? p.y - 1 : p.y, m: p.m === 0 ? 11 : p.m - 1 }))}>‹</button>
        <span className="cal-month-title">{monthName}</span>
        <button className="icon-btn" onClick={() => setMonth(p => ({ y: p.m === 11 ? p.y + 1 : p.y, m: p.m === 11 ? 0 : p.m + 1 }))}>›</button>
        <button className={`btn-primary small ${syncing ? 'loading' : ''}`} onClick={onSyncToCalendar} style={{ marginLeft: 'auto' }}>
          {syncing ? 'Syncing…' : '↑ Sync to Calendar'}
        </button>
      </div>
      <div className="cal-grid">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty"></div>;
          const dateStr = `${month.y}-${String(month.m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const dayEvs = byDate[dateStr] || [];
          const isToday = dateStr === '2026-05-01';
          return (
            <div key={i} className={`cal-cell ${isToday ? 'today' : ''}`}>
              <span className="cal-day-num">{d}</span>
              {dayEvs.slice(0, 3).map((ev, j) => (
                <div key={j} className="cal-event-chip" style={{ background: ev.color }} title={ev.label}>
                  {ev.source === 'calendar' ? '📅 ' : ev.source === 'mission' ? '◆ ' : ''}
                  {ev.label.length > 12 ? ev.label.slice(0,12) + '…' : ev.label}
                </div>
              ))}
              {dayEvs.length > 3 && <div className="cal-more">+{dayEvs.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AddTaskModal ──────────────────────────────────────────────────────────────
function AddTaskModal({ mission, onSave, onClose }) {
  const [form, setForm] = React.useState({
    name: '', type: 'task', start: new Date().toISOString().slice(0,10),
    end: new Date(Date.now() + 7*86400000).toISOString().slice(0,10),
    progress: 0, assignee: '', deps: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span>Add Task</span><button className="icon-btn" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <label>Task Name <input value={form.name} onChange={e => set('name', e.target.value)} /></label>
          <label>Type
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="task">Task</option>
              <option value="milestone">Milestone</option>
            </select>
          </label>
          <label>Assignee <input value={form.assignee} onChange={e => set('assignee', e.target.value)} /></label>
          <div className="form-row">
            <label>Start <input type="date" value={form.start} onChange={e => set('start', e.target.value)} /></label>
            {form.type === 'task' && <label>End <input type="date" value={form.end} onChange={e => set('end', e.target.value)} /></label>}
          </div>
          <label>Progress
            <div className="progress-row">
              <input type="range" min={0} max={100} value={form.progress} onChange={e => set('progress', +e.target.value)} />
              <span>{form.progress}%</span>
            </div>
          </label>
          {mission && mission.tasks.length > 0 && (
            <label>Dependencies
              <select multiple value={form.deps} onChange={e => set('deps', [...e.target.selectedOptions].map(o => o.value))}
                style={{ height: 80 }}>
                {mission.tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => form.name && onSave(form)}>Add Task</button>
        </div>
      </div>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ config, onSave, onClose }) {
  const [form, setForm] = React.useState({ ...config });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span>⚙️ Google API Settings</span><button className="icon-btn" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="settings-note">
            <b>Setup:</b> Create a project in <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Google Cloud Console</a>,
            enable Drive API + Calendar API, create OAuth 2.0 credentials (Web App), add
            <code>https://accounts.google.com</code> as authorized origin, and paste below.
          </div>
          <label>OAuth Client ID
            <input value={form.clientId} onChange={e => set('clientId', e.target.value)}
              placeholder="xxx.apps.googleusercontent.com" />
          </label>
          <label>API Key
            <input value={form.apiKey} onChange={e => set('apiKey', e.target.value)}
              placeholder="AIzaSy..." />
          </label>
          <label>Master Drive File ID
            <input value={form.masterFileId || ''} onChange={e => set('masterFileId', e.target.value)}
              placeholder="Paste the Drive file ID of your AeroMission_Data.json" />
          </label>
          <div className="settings-note" style={{marginTop:8}}>
            Leave File ID blank to create a new file on first save. Only users with Drive access to that file can load data.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(form)}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  DashboardView, StatCard, CalendarView, AddTaskModal, SettingsModal,
});
