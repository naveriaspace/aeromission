// Resource allocation panel — people, vehicles, equipment, budget

const RESOURCE_TYPE_ICONS = {
  person: '👤',
  vehicle: '✈️',
  equipment: '⚙️',
  budget: '💰',
  ground: '📡',
};

const RESOURCE_TYPE_COLORS = {
  person: '#6366f1',
  vehicle: '#0ea5e9',
  equipment: '#f59e0b',
  budget: '#22c55e',
  ground: '#ec4899',
};

// ── compute task load per resource ───────────────────────────────────────────
function computeResourceLoad(tasks, resources) {
  // For each resource: find tasks assigned to them by name, count overlap days
  return resources.map(res => {
    const assigned = tasks.filter(t =>
      t.assignee && t.assignee.toLowerCase().includes(res.name.toLowerCase().split(' ')[0].toLowerCase())
    );
    const totalDays = assigned.reduce((sum, t) => {
      const s = new Date(t.start), e = new Date(t.end || t.start);
      return sum + Math.max(0, Math.round((e - s) / 86400000));
    }, 0);
    const load = Math.min(100, Math.round((totalDays / 90) * 100));
    return { ...res, load, taskCount: assigned.length };
  });
}

// ── ResourceBar ──────────────────────────────────────────────────────────────
function ResourceBar({ resource, color }) {
  const load = resource.load || 0;
  const overloaded = load > 80;
  return (
    <div className="resource-bar-row">
      <div className="resource-bar-label">
        <span className="resource-icon">{RESOURCE_TYPE_ICONS[resource.type] || '🔧'}</span>
        <div className="resource-info">
          <span className="resource-name">{resource.name}</span>
          <span className="resource-type-tag" style={{ color: RESOURCE_TYPE_COLORS[resource.type] || color }}>
            {resource.type}
          </span>
        </div>
        <div className="resource-stats">
          {resource.type === 'budget' && resource.value && (
            <span className="budget-val">${(resource.value / 1e6).toFixed(1)}M</span>
          )}
          <span className={`load-pct ${overloaded ? 'overloaded' : ''}`}>{load}%</span>
        </div>
      </div>
      <div className="resource-track">
        <div className="resource-fill"
          style={{
            width: `${load}%`,
            background: overloaded
              ? 'linear-gradient(90deg, #ef4444, #f97316)'
              : `linear-gradient(90deg, ${color}cc, ${color})`,
          }}
        />
      </div>
    </div>
  );
}

// ── Resource Heatmap (timeline view) ─────────────────────────────────────────
function ResourceHeatmap({ tasks, resources, startDate, days = 60 }) {
  const start = new Date(startDate + 'T00:00:00');
  const CELL_W = 18;
  const CELL_H = 28;
  const weeks = Math.ceil(days / 7);

  // Build week-by-week load per resource
  const heatData = resources.map(res => {
    return Array.from({ length: weeks }, (_, wi) => {
      const wStart = new Date(start.getTime() + wi * 7 * 86400000);
      const wEnd = new Date(wStart.getTime() + 7 * 86400000);
      const activeTasks = tasks.filter(t => {
        const ts = new Date(t.start), te = new Date(t.end || t.start);
        const assigneeMatch = t.assignee && t.assignee.toLowerCase().includes(
          res.name.toLowerCase().split(' ')[0].toLowerCase()
        );
        return assigneeMatch && ts < wEnd && te > wStart;
      });
      return Math.min(1, activeTasks.length / 2);
    });
  });

  const totalW = weeks * CELL_W + 100;
  const totalH = resources.length * CELL_H + 30;

  return (
    <div className="resource-heatmap">
      <div className="panel-subtitle">Resource Load Heatmap</div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={totalW} height={totalH} style={{ display: 'block' }}>
          {/* Week headers */}
          {Array.from({ length: weeks }, (_, wi) => {
            const wDate = new Date(start.getTime() + wi * 7 * 86400000);
            return (
              <text key={wi} x={100 + wi * CELL_W + CELL_W / 2} y={16}
                textAnchor="middle" fontSize={8} fill="#94a3b8"
                fontFamily="'Space Mono', monospace">
                {wDate.toLocaleDateString('en', { month: 'numeric', day: 'numeric' })}
              </text>
            );
          })}
          {/* Resource rows */}
          {resources.map((res, ri) => (
            <g key={res.id}>
              <text x={95} y={30 + ri * CELL_H + CELL_H / 2}
                textAnchor="end" fontSize={10} fill="#475569"
                dominantBaseline="middle" fontFamily="'DM Sans', sans-serif">
                {res.name.length > 12 ? res.name.slice(0, 12) + '…' : res.name}
              </text>
              {heatData[ri].map((load, wi) => {
                const heat = load;
                const r = Math.round(heat * 239 + (1 - heat) * 226);
                const g = Math.round(heat * 68 + (1 - heat) * 232);
                const b = Math.round(heat * 68 + (1 - heat) * 240);
                const fill = heat > 0 ? `rgb(${r},${g},${b})` : '#f1f5f9';
                return (
                  <rect key={wi}
                    x={100 + wi * CELL_W + 1} y={30 + ri * CELL_H + 2}
                    width={CELL_W - 2} height={CELL_H - 4} rx={2}
                    fill={fill} opacity={0.9}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── AddResourceModal ─────────────────────────────────────────────────────────
function AddResourceModal({ onSave, onClose }) {
  const [form, setForm] = React.useState({ name: '', type: 'person', availability: 100, value: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span>Add Resource</span><button className="icon-btn" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <label>Name <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Lead Engineer" /></label>
          <label>Type
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              {Object.keys(RESOURCE_TYPE_ICONS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>Availability %
            <input type="number" min={0} max={100} value={form.availability} onChange={e => set('availability', +e.target.value)} />
          </label>
          {form.type === 'budget' && (
            <label>Budget Value ($)
              <input type="number" value={form.value} onChange={e => set('value', +e.target.value)} placeholder="e.g. 2500000" />
            </label>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => form.name && onSave(form)}>Add Resource</button>
        </div>
      </div>
    </div>
  );
}

// ── ResourcePanel ────────────────────────────────────────────────────────────
function ResourcePanel({ mission, onAddResource, onDeleteResource }) {
  const [showHeatmap, setShowHeatmap] = React.useState(false);
  const [showAdd, setShowAdd] = React.useState(false);

  if (!mission) return <div className="empty-panel">Select a mission to view resources.</div>;

  const enriched = computeResourceLoad(mission.tasks, mission.resources);

  const grouped = {};
  enriched.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  return (
    <div className="resource-panel">
      {showAdd && (
        <AddResourceModal
          onSave={(r) => { onAddResource(r); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}
      <div className="panel-header">
        <span className="panel-title">Resources</span>
        <div className="panel-actions">
          <button className={`tab-btn ${showHeatmap ? 'active' : ''}`} onClick={() => setShowHeatmap(v => !v)}>
            Heatmap
          </button>
          <button className="btn-primary small" onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
      </div>

      {showHeatmap && (
        <ResourceHeatmap
          tasks={mission.tasks}
          resources={mission.resources}
          startDate={mission.startDate}
          days={diffDays(parseDate(mission.startDate), parseDate(mission.endDate))}
        />
      )}

      <div className="resource-groups">
        {Object.entries(grouped).map(([type, resources]) => (
          <div key={type} className="resource-group">
            <div className="resource-group-title">
              {RESOURCE_TYPE_ICONS[type]} {type.charAt(0).toUpperCase() + type.slice(1)}s
            </div>
            {resources.map(res => (
              <div key={res.id} className="resource-item">
                <ResourceBar resource={res} color={mission.color || '#0ea5e9'} />
                <button className="icon-btn delete-btn small" onClick={() => onDeleteResource(res.id)} title="Remove">×</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  ResourcePanel, ResourceBar, ResourceHeatmap, AddResourceModal,
  computeResourceLoad, RESOURCE_TYPE_ICONS, RESOURCE_TYPE_COLORS,
});
