// Gantt Chart Engine — drag, dependencies, critical path, milestones

const DAY_PX = 14; // pixels per day
const ROW_H = 38;
const HEADER_H = 56;
const LABEL_W = 220;

// ── date helpers ─────────────────────────────────────────────────────────────
function parseDate(s) { return new Date(s + 'T00:00:00'); }
function fmt(d) { return d.toISOString().slice(0, 10); }
function diffDays(a, b) { return Math.round((b - a) / 86400000); }
function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }

function dateRange(tasks) {
  if (!tasks.length) {
    const now = new Date();
    return { min: now, max: addDays(now, 90) };
  }
  let min = parseDate(tasks[0].start), max = parseDate(tasks[0].end || tasks[0].start);
  tasks.forEach(t => {
    const s = parseDate(t.start), e = parseDate(t.end || t.start);
    if (s < min) min = s;
    if (e > max) max = e;
  });
  return { min: addDays(min, -5), max: addDays(max, 15) };
}

// ── critical path (longest path) ─────────────────────────────────────────────
function computeCriticalPath(tasks) {
  const byId = {};
  tasks.forEach(t => byId[t.id] = t);
  const es = {}, ef = {};
  const sorted = [...tasks].sort((a, b) => parseDate(a.start) - parseDate(b.start));
  sorted.forEach(t => {
    const start = parseDate(t.start);
    const end = parseDate(t.end || t.start);
    const dur = Math.max(0, diffDays(start, end));
    es[t.id] = start;
    ef[t.id] = addDays(start, dur);
    if (t.deps && t.deps.length) {
      t.deps.forEach(dep => {
        if (ef[dep] && ef[dep] > es[t.id]) {
          es[t.id] = ef[dep];
          ef[t.id] = addDays(ef[dep], dur);
        }
      });
    }
  });
  // find project end
  const projEnd = Object.values(ef).reduce((a, b) => b > a ? b : a, new Date(0));
  // backward pass
  const ls = {}, lf = {};
  tasks.forEach(t => { lf[t.id] = projEnd; ls[t.id] = addDays(projEnd, -Math.max(0, diffDays(parseDate(t.start), parseDate(t.end || t.start)))); });
  [...sorted].reverse().forEach(t => {
    const dur = Math.max(0, diffDays(parseDate(t.start), parseDate(t.end || t.start)));
    tasks.forEach(other => {
      if (other.deps && other.deps.includes(t.id)) {
        if (ls[other.id] && ls[other.id] < lf[t.id]) {
          lf[t.id] = ls[other.id];
          ls[t.id] = addDays(ls[other.id], -dur);
        }
      }
    });
  });
  const critical = new Set();
  tasks.forEach(t => {
    const float = diffDays(ef[t.id], lf[t.id]);
    if (Math.abs(float) <= 1) critical.add(t.id);
  });
  return critical;
}

// ── Gantt header (month/week ticks) ─────────────────────────────────────────
function GanttHeader({ minDate, totalDays }) {
  const months = [];
  const weeks = [];
  let cur = new Date(minDate);
  while (diffDays(minDate, cur) < totalDays) {
    const x = diffDays(minDate, cur) * DAY_PX;
    if (cur.getDate() === 1) {
      months.push({ x, label: cur.toLocaleString('default', { month: 'short', year: '2-digit' }) });
    }
    if (cur.getDay() === 1) {
      weeks.push({ x });
    }
    cur = addDays(cur, 1);
  }
  return (
    <g>
      {/* week ticks */}
      {weeks.map((w, i) => (
        <line key={i} x1={w.x} y1={24} x2={w.x} y2={HEADER_H} stroke="#e2e8f0" strokeWidth={1} />
      ))}
      {/* month labels */}
      {months.map((m, i) => (
        <g key={i}>
          <line x1={m.x} y1={0} x2={m.x} y2={HEADER_H} stroke="#cbd5e1" strokeWidth={1} />
          <text x={m.x + 6} y={20} fontSize={11} fill="#64748b" fontFamily="'Space Mono', monospace" fontWeight="600">
            {m.label}
          </text>
        </g>
      ))}
      {/* today line label */}
    </g>
  );
}

// ── Dependency arrows ────────────────────────────────────────────────────────
function DependencyArrows({ tasks, rowMap, minDate, criticalSet }) {
  const arrows = [];
  tasks.forEach(task => {
    if (!task.deps || !task.deps.length) return;
    task.deps.forEach(depId => {
      const from = tasks.find(t => t.id === depId);
      if (!from) return;
      const fromRow = rowMap[from.id];
      const toRow = rowMap[task.id];
      if (fromRow === undefined || toRow === undefined) return;
      const fromEnd = parseDate(from.end || from.start);
      const toStart = parseDate(task.start);
      const x1 = diffDays(minDate, fromEnd) * DAY_PX + (from.type === 'milestone' ? 8 : 0);
      const y1 = fromRow * ROW_H + ROW_H / 2;
      const x2 = diffDays(minDate, toStart) * DAY_PX + (task.type === 'milestone' ? 8 : 0);
      const y2 = toRow * ROW_H + ROW_H / 2;
      const isCrit = criticalSet.has(from.id) && criticalSet.has(task.id);
      const mid = (x1 + x2) / 2;
      const path = `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
      arrows.push(
        <path key={`${depId}->${task.id}`} d={path}
          fill="none" stroke={isCrit ? '#ef4444' : '#94a3b8'}
          strokeWidth={isCrit ? 2 : 1.5} strokeDasharray={isCrit ? '' : '4,3'}
          markerEnd={`url(#arrow-${isCrit ? 'crit' : 'norm'})`}
          opacity={0.85}
        />
      );
    });
  });
  return <g>{arrows}</g>;
}

// ── Task bar ─────────────────────────────────────────────────────────────────
function TaskBar({ task, rowIndex, minDate, missionColor, isCritical, isSelected, onSelect, onDragStart, onResizeStart }) {
  const start = parseDate(task.start);
  const end = parseDate(task.end || task.start);
  const x = diffDays(minDate, start) * DAY_PX;
  const w = Math.max(task.type === 'milestone' ? 0 : 8, diffDays(start, end) * DAY_PX);
  const y = rowIndex * ROW_H + 8;
  const h = ROW_H - 16;
  const color = missionColor;
  const critColor = '#ef4444';
  const barColor = isCritical ? critColor : color;

  if (task.type === 'milestone') {
    const mx = x + 8;
    const my = rowIndex * ROW_H + ROW_H / 2;
    return (
      <g className="task-group" onClick={() => onSelect(task.id)} style={{ cursor: 'pointer' }}>
        <polygon
          points={`${mx},${my - 9} ${mx + 9},${my} ${mx},${my + 9} ${mx - 9},${my}`}
          fill={isCritical ? critColor : '#1e293b'}
          stroke={isSelected ? '#f59e0b' : 'none'}
          strokeWidth={2}
          filter={isSelected ? 'drop-shadow(0 0 4px #f59e0b)' : ''}
        />
        {task.progress === 100 && (
          <text x={mx} y={my + 1} textAnchor="middle" fontSize={9} fill="white" dominantBaseline="middle">✓</text>
        )}
      </g>
    );
  }

  return (
    <g className="task-group" onClick={() => onSelect(task.id)}>
      {/* background track */}
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={isCritical ? '#fee2e2' : '#e8f4fd'} />
      {/* progress fill */}
      <rect x={x} y={y} width={w * (task.progress / 100)} height={h} rx={4}
        fill={barColor} opacity={0.9} />
      {/* bar outline */}
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill="none"
        stroke={isSelected ? '#f59e0b' : (isCritical ? '#ef4444' : color)}
        strokeWidth={isSelected ? 2 : 1}
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, task); }}
      />
      {/* resize handle right */}
      <rect x={x + w - 5} y={y + 2} width={5} height={h - 4} rx={2}
        fill={barColor} opacity={0.6} style={{ cursor: 'ew-resize' }}
        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, task); }}
      />
      {/* label */}
      {w > 30 && (
        <text x={x + 6} y={y + h / 2 + 1} fontSize={10} fill={task.progress > 50 ? 'white' : '#1e293b'}
          dominantBaseline="middle" fontFamily="'DM Sans', sans-serif" style={{ pointerEvents: 'none' }}>
          {task.name.length > Math.floor(w / 7) ? task.name.slice(0, Math.floor(w / 7) - 1) + '…' : task.name}
        </text>
      )}
      {/* progress % */}
      {w > 50 && (
        <text x={x + w - 8} y={y + h / 2 + 1} fontSize={9} fill={task.progress > 80 ? 'white' : '#64748b'}
          dominantBaseline="middle" textAnchor="end" fontFamily="'Space Mono', monospace" style={{ pointerEvents: 'none' }}>
          {task.progress}%
        </text>
      )}
    </g>
  );
}

// ── Calendar event strip ─────────────────────────────────────────────────────
function CalendarEventStrip({ events, minDate, totalDays, svgHeight }) {
  return (
    <g opacity={0.7}>
      {events.map((ev, i) => {
        const start = ev.start?.date || ev.start?.dateTime?.slice(0, 10);
        const end = ev.end?.date || ev.end?.dateTime?.slice(0, 10);
        if (!start) return null;
        const x = Math.max(0, diffDays(minDate, parseDate(start)) * DAY_PX);
        const w = Math.max(8, diffDays(parseDate(start), parseDate(end || start)) * DAY_PX);
        return (
          <g key={i}>
            <rect x={x} y={2} width={w} height={8} rx={2} fill="#f59e0b" opacity={0.5} />
          </g>
        );
      })}
    </g>
  );
}

// ── Main GanttChart ──────────────────────────────────────────────────────────
function GanttChart({ mission, allMissions, showAllMissions, calendarEvents, onTaskUpdate, tweaks }) {
  const [selectedId, setSelectedId] = React.useState(null);
  const [dragging, setDragging] = React.useState(null); // { task, startX, origStart, origEnd, mode }
  const [scrollX, setScrollX] = React.useState(0);
  const svgRef = React.useRef();
  const containerRef = React.useRef();

  const tasks = mission ? mission.tasks : [];
  const allTasks = showAllMissions
    ? allMissions.flatMap(m => m.tasks.map(t => ({ ...t, _missionId: m.id, _missionColor: m.color })))
    : tasks.map(t => ({ ...t, _missionColor: mission?.color || '#0ea5e9' }));

  const { min: minDate, max: maxDate } = React.useMemo(() => dateRange(allTasks), [allTasks]);
  const totalDays = Math.max(60, diffDays(minDate, maxDate));
  const svgW = totalDays * DAY_PX + LABEL_W;
  const svgH = Math.max(200, allTasks.length * ROW_H + HEADER_H + 30);

  const criticalSet = React.useMemo(() => computeCriticalPath(allTasks), [allTasks]);
  const rowMap = React.useMemo(() => {
    const m = {};
    allTasks.forEach((t, i) => { m[t.id] = i; });
    return m;
  }, [allTasks]);

  // today marker
  const todayX = diffDays(minDate, new Date()) * DAY_PX;

  // ── drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = React.useCallback((e, task) => {
    e.preventDefault();
    setDragging({ task, startX: e.clientX, origStart: task.start, origEnd: task.end, mode: 'move' });
  }, []);

  const handleResizeStart = React.useCallback((e, task) => {
    e.preventDefault();
    setDragging({ task, startX: e.clientX, origStart: task.start, origEnd: task.end, mode: 'resize' });
  }, []);

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = e.clientX - dragging.startX;
      const daysDelta = Math.round(dx / DAY_PX);
      if (daysDelta === 0) return;
      const origS = parseDate(dragging.origStart);
      const origE = parseDate(dragging.origEnd || dragging.origStart);
      let newStart = fmt(addDays(origS, daysDelta));
      let newEnd;
      if (dragging.mode === 'move') {
        newEnd = fmt(addDays(origE, daysDelta));
      } else {
        newEnd = fmt(addDays(origE, daysDelta));
        if (parseDate(newEnd) <= parseDate(newStart)) newEnd = newStart;
      }
      onTaskUpdate(dragging.task.id, { start: newStart, end: newEnd });
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, onTaskUpdate]);

  const selectedTask = allTasks.find(t => t.id === selectedId);

  return (
    <div className="gantt-wrapper" ref={containerRef}>
      {/* Task detail tooltip */}
      {selectedTask && (
        <TaskDetail task={selectedTask} missionColor={selectedTask._missionColor}
          onClose={() => setSelectedId(null)}
          onUpdate={(updates) => { onTaskUpdate(selectedTask.id, updates); setSelectedId(null); }}
          criticalSet={criticalSet}
        />
      )}
      <div className="gantt-container">
        {/* Left label panel */}
        <div className="gantt-labels" style={{ minWidth: LABEL_W, width: LABEL_W }}>
          <div className="gantt-label-header">
            <span>Task</span>
            <span style={{marginLeft:'auto', fontSize:10, color:'#94a3b8'}}>Assignee</span>
          </div>
          <div className="gantt-label-rows">
            {allTasks.map((task, i) => {
              const isCrit = criticalSet.has(task.id);
              return (
                <div key={task.id} className={`gantt-label-row ${selectedId === task.id ? 'selected' : ''} ${isCrit ? 'critical' : ''}`}
                  onClick={() => setSelectedId(task.id === selectedId ? null : task.id)}
                  style={{ height: ROW_H, borderLeft: `3px solid ${task._missionColor || '#0ea5e9'}` }}>
                  <span className={`task-type-icon ${task.type}`}>
                    {task.type === 'milestone' ? '◆' : '▬'}
                  </span>
                  <span className="label-name">{task.name}</span>
                  <span className="label-assignee">{task.assignee || '—'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SVG gantt area */}
        <div className="gantt-scroll" onScroll={e => setScrollX(e.target.scrollLeft)}>
          <svg ref={svgRef} width={totalDays * DAY_PX} height={svgH}
            style={{ display: 'block', userSelect: 'none' }}>
            <defs>
              <marker id="arrow-norm" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
              </marker>
              <marker id="arrow-crit" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
              </marker>
            </defs>

            {/* Calendar events strip */}
            <g transform={`translate(0, 0)`}>
              <CalendarEventStrip events={calendarEvents} minDate={minDate} totalDays={totalDays} svgHeight={svgH} />
            </g>

            {/* Header */}
            <g transform={`translate(0, 0)`}>
              <rect width={totalDays * DAY_PX} height={HEADER_H} fill="#f8fafc" />
              <GanttHeader minDate={minDate} totalDays={totalDays} />
            </g>

            {/* Row backgrounds */}
            <g transform={`translate(0, ${HEADER_H})`}>
              {allTasks.map((_, i) => (
                <rect key={i} x={0} y={i * ROW_H} width={totalDays * DAY_PX} height={ROW_H}
                  fill={i % 2 === 0 ? '#fafafa' : '#f1f5f9'} />
              ))}
              {/* week grid lines */}
              {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => (
                <line key={i} x1={i * 7 * DAY_PX} y1={0} x2={i * 7 * DAY_PX} y2={allTasks.length * ROW_H}
                  stroke="#e2e8f0" strokeWidth={1} />
              ))}
            </g>

            {/* Today line */}
            {todayX >= 0 && todayX <= totalDays * DAY_PX && (
              <g transform={`translate(${todayX}, 0)`}>
                <line x1={0} y1={0} x2={0} y2={svgH} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,4" opacity={0.8} />
                <rect x={-18} y={HEADER_H - 18} width={36} height={16} rx={3} fill="#f59e0b" />
                <text x={0} y={HEADER_H - 7} textAnchor="middle" fontSize={9} fill="white" fontFamily="'Space Mono', monospace" fontWeight="700">TODAY</text>
              </g>
            )}

            {/* Dependencies */}
            <g transform={`translate(0, ${HEADER_H})`}>
              <DependencyArrows tasks={allTasks} rowMap={rowMap} minDate={minDate} criticalSet={criticalSet} />
            </g>

            {/* Task bars */}
            <g transform={`translate(0, ${HEADER_H})`}>
              {allTasks.map((task, i) => (
                <TaskBar key={task.id} task={task} rowIndex={i} minDate={minDate}
                  missionColor={task._missionColor || '#0ea5e9'}
                  isCritical={criticalSet.has(task.id)}
                  isSelected={selectedId === task.id}
                  onSelect={setSelectedId}
                  onDragStart={handleDragStart}
                  onResizeStart={handleResizeStart}
                />
              ))}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Task Detail Panel ────────────────────────────────────────────────────────
function TaskDetail({ task, missionColor, onClose, onUpdate, criticalSet }) {
  const [form, setForm] = React.useState({ ...task });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="task-detail-panel">
      <div className="task-detail-header" style={{ borderLeft: `4px solid ${missionColor}` }}>
        <span className="task-detail-title">{task.type === 'milestone' ? '◆' : '▬'} {task.name}</span>
        {criticalSet.has(task.id) && <span className="critical-badge">CRITICAL PATH</span>}
        <button className="icon-btn" onClick={onClose}>×</button>
      </div>
      <div className="task-detail-body">
        <label>Name <input value={form.name} onChange={e => set('name', e.target.value)} /></label>
        <label>Assignee <input value={form.assignee || ''} onChange={e => set('assignee', e.target.value)} /></label>
        <div className="form-row">
          <label>Start <input type="date" value={form.start} onChange={e => set('start', e.target.value)} /></label>
          <label>End <input type="date" value={form.end || form.start} onChange={e => set('end', e.target.value)} /></label>
        </div>
        <label>Progress
          <div className="progress-row">
            <input type="range" min={0} max={100} value={form.progress} onChange={e => set('progress', +e.target.value)} />
            <span>{form.progress}%</span>
          </div>
        </label>
        <div className="task-detail-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onUpdate(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  GanttChart, TaskDetail, TaskBar, DependencyArrows, GanttHeader,
  DAY_PX, ROW_H, HEADER_H, LABEL_W,
  parseDate, fmt, diffDays, addDays, dateRange, computeCriticalPath,
});
