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
  MissionSidebar, NewMissionModal,
  MISSION_STATUSES, STATUS_COLORS, PHASE_COLORS, missionColor,
});
