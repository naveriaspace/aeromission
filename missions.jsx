// Mission sidebar and data model

const MISSION_STATUSES = ['Planning', 'Active', 'Hold', 'Complete', 'Cancelled'];
const STATUS_COLORS = {
  Planning: '#6366f1',
  Active: '#0ea5e9',
  Hold: '#f59e0b',
  Complete: '#22c55e',
  Cancelled: '#ef4444',
};
const PHASE_COLORS = ['#0ea5e9','#6366f1','#f59e0b','#22c55e','#ec4899','#14b8a6','#f97316'];

function missionColor(idx) {
  return PHASE_COLORS[idx % PHASE_COLORS.length];
}

// ─── Default seed data ──────────────────────────────────────────────────────
function makeSeedData() {
  const now = new Date('2026-05-01');
  const d = (offset) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().slice(0, 10);
  };
  return {
    version: 1,
    lastSaved: now.toISOString(),
    missions: [
      {
        id: 'm1', name: 'HAWK-7 UAV Campaign', color: '#0ea5e9',
        status: 'Active', description: 'Long-endurance MALE UAV field campaign',
        startDate: d(0), endDate: d(120),
        tasks: [
          { id: 't1', name: 'Requirements Freeze', type: 'milestone', start: d(0), end: d(0), progress: 100, deps: [], critical: true, assignee: 'Eng Team', calendarEventId: null },
          { id: 't2', name: 'Airframe Integration', type: 'task', start: d(2), end: d(28), progress: 60, deps: ['t1'], critical: true, assignee: 'Assembly', calendarEventId: null },
          { id: 't3', name: 'Avionics Install', type: 'task', start: d(10), end: d(35), progress: 40, deps: ['t1'], critical: false, assignee: 'Avionics', calendarEventId: null },
          { id: 't4', name: 'Ground Comms Test', type: 'task', start: d(36), end: d(50), progress: 0, deps: ['t2','t3'], critical: true, assignee: 'GCS Team', calendarEventId: null },
          { id: 't5', name: 'EMC Clearance', type: 'task', start: d(36), end: d(45), progress: 0, deps: ['t3'], critical: false, assignee: 'Test Lab', calendarEventId: null },
          { id: 't6', name: 'First Flight Readiness Review', type: 'milestone', start: d(52), end: d(52), progress: 0, deps: ['t4','t5'], critical: true, assignee: 'PM', calendarEventId: null },
          { id: 't7', name: 'Flight Test Phase 1', type: 'task', start: d(55), end: d(90), progress: 0, deps: ['t6'], critical: true, assignee: 'Test Pilots', calendarEventId: null },
          { id: 't8', name: 'Payload Integration', type: 'task', start: d(20), end: d(55), progress: 25, deps: ['t1'], critical: false, assignee: 'Payload', calendarEventId: null },
          { id: 't9', name: 'Operational Handover', type: 'milestone', start: d(110), end: d(110), progress: 0, deps: ['t7','t8'], critical: true, assignee: 'Ops', calendarEventId: null },
        ],
        resources: [
          { id: 'r1', name: 'Lead Engineer', type: 'person', availability: 100 },
          { id: 'r2', name: 'Avionics Engineer', type: 'person', availability: 80 },
          { id: 'r3', name: 'HAWK-7 Airframe', type: 'vehicle', availability: 100 },
          { id: 'r4', name: 'Ground Control Station', type: 'equipment', availability: 100 },
          { id: 'r5', name: 'Campaign Budget', type: 'budget', availability: 100, value: 4200000 },
        ],
      },
      {
        id: 'm2', name: 'SENTINEL-3 Surveillance', color: '#6366f1',
        status: 'Planning', description: 'High-altitude ISR UAV deployment',
        startDate: d(30), endDate: d(200),
        tasks: [
          { id: 't10', name: 'System Design Review', type: 'milestone', start: d(30), end: d(30), progress: 0, deps: [], critical: true, assignee: 'Systems', calendarEventId: null },
          { id: 't11', name: 'Sensor Suite Procurement', type: 'task', start: d(31), end: d(75), progress: 0, deps: ['t10'], critical: false, assignee: 'Procurement', calendarEventId: null },
          { id: 't12', name: 'Platform Modifications', type: 'task', start: d(40), end: d(100), progress: 0, deps: ['t10'], critical: true, assignee: 'Assembly', calendarEventId: null },
          { id: 't13', name: 'Integration & Test', type: 'task', start: d(101), end: d(140), progress: 0, deps: ['t11','t12'], critical: true, assignee: 'I&T Team', calendarEventId: null },
          { id: 't14', name: 'Acceptance Review', type: 'milestone', start: d(145), end: d(145), progress: 0, deps: ['t13'], critical: true, assignee: 'PM', calendarEventId: null },
        ],
        resources: [
          { id: 'r6', name: 'Systems Engineer', type: 'person', availability: 100 },
          { id: 'r7', name: 'SENTINEL Platform', type: 'vehicle', availability: 100 },
          { id: 'r8', name: 'Sensor Budget', type: 'budget', availability: 100, value: 2800000 },
        ],
      },
    ],
    calendarEvents: [],
  };
}

// ─── MissionSidebar component ───────────────────────────────────────────────
function MissionSidebar({ missions, activeMissionId, onSelect, onAdd, onDelete, collapsed, onToggle }) {
  return (
    <aside className={`mission-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && <span className="sidebar-title">MISSIONS</span>}
        <button className="icon-btn" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="mission-list">
            {missions.map((m, i) => (
              <div
                key={m.id}
                className={`mission-item ${m.id === activeMissionId ? 'active' : ''}`}
                onClick={() => onSelect(m.id)}
              >
                <span className="mission-dot" style={{ background: m.color || missionColor(i) }}></span>
                <div className="mission-item-text">
                  <span className="mission-name">{m.name}</span>
                  <span className="mission-status" style={{ color: STATUS_COLORS[m.status] || '#64748b' }}>
                    {m.status}
                  </span>
                </div>
                <button className="icon-btn delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(m.id); }} title="Delete mission">×</button>
              </div>
            ))}
          </div>
          <button className="add-mission-btn" onClick={onAdd}>+ New Mission</button>
        </>
      )}
    </aside>
  );
}

// ─── NewMissionModal ────────────────────────────────────────────────────────
function NewMissionModal({ onSave, onClose }) {
  const [form, setForm] = React.useState({
    name: '', status: 'Planning', description: '',
    startDate: new Date().toISOString().slice(0,10),
    endDate: new Date(Date.now() + 90*86400000).toISOString().slice(0,10),
    color: '#0ea5e9',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>New Mission</span>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label>Mission Name
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. HAWK-7 Campaign" />
          </label>
          <label>Status
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {MISSION_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>Description
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
          </label>
          <div className="form-row">
            <label>Start Date <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></label>
            <label>End Date <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></label>
            <label>Color <input type="color" value={form.color} onChange={e => set('color', e.target.value)} /></label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => form.name && onSave(form)}>Create Mission</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  MissionSidebar, NewMissionModal, makeSeedData,
  MISSION_STATUSES, STATUS_COLORS, PHASE_COLORS, missionColor,
});
