function renderStatuses(regs) {
  const el = document.getElementById('statuses')
  el.innerHTML = regs.map(r => {
    const s = r.status || {}
    const cls = s.in_progress ? 'status-syncing' : (s.success ? 'status-ok' : 'status-bad')
    const state = s.in_progress ? 'syncing' : (s.success ? 'ok' : (s.error_message || 'failed'))
    const when = s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : 'never'
    const dur = s.duration_ms ? `${s.duration_ms} ms` : '-'
    const err = s.error_message ? `<div>${s.error_message}</div>` : ''
    return `<div class="status-card ${cls}"><strong>${r.name}</strong><br/>${r.base_url}<br/>state: ${state}<br/>last: ${when}<br/>duration: ${dur}${err}</div>`
  }).join('')
}

async function loadStatuses() {
  const regs = await fetch('/api/registries').then(r => r.json())
  renderStatuses(regs)
}

loadStatuses()
setInterval(loadStatuses, 10000)
