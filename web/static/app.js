const state = {
  artifacts: [],
  registries: [],
  registryMap: {},
  expandedKey: null,
  tagsCache: {}
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search)
  return params.get(name) || ''
}

function setQueryParam(name, value) {
  const url = new URL(window.location.href)
  if (value) {
    url.searchParams.set(name, value)
  } else {
    url.searchParams.delete(name)
  }
  window.history.replaceState({}, '', url)
}

async function loadRegistries() {
  const regs = await fetch('/api/registries').then(r => r.json())
  state.registries = regs
  state.registryMap = Object.fromEntries(regs.map(r => [r.id, r]))

  const initialQ = getQueryParam('q')
  if (initialQ) {
    document.getElementById('q').value = initialQ
  }
}

async function loadArtifacts() {
  const q = document.getElementById('q').value || ''
  const url = `/api/artifacts?q=${encodeURIComponent(q)}&page=1&page_size=500`
  const data = await fetch(url).then(r => r.json())
  state.artifacts = data.items || []
  setQueryParam('q', q.trim())
  renderArtifacts()
}

function renderArtifacts() {
  const selectedRegistry = getSelectedRegistryFilterValue()
  const list = state.artifacts
    .filter(a => !selectedRegistry || a.registry_id === selectedRegistry)
  const groups = new Map()
  const abnormalRegistryIDs = new Set()
  const healthyRegistryIDs = new Set()

  list.forEach(a => {
    const st = state.registryMap[a.registry_id]?.status || {}
    const isAbnormal = st.in_progress ? false : (st.success === false && !!st.error_message)
    const gk = isAbnormal ? 'abnormal' : 'healthy'
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk).push(a)
    if (isAbnormal) {
      abnormalRegistryIDs.add(a.registry_id)
    } else {
      healthyRegistryIDs.add(a.registry_id)
    }
  })

  const container = document.getElementById('repoGroups')
  const sections = []
  const healthy = groups.get('healthy') || []
  const abnormal = groups.get('abnormal') || []

  if (abnormal.length) {
    sections.push(renderGroup(`Abnormal Registries (${abnormalRegistryIDs.size})`, abnormal, true))
  }
  sections.push(renderGroup(`Healthy Registries (${healthyRegistryIDs.size})`, healthy, false))
  container.innerHTML = sections.join('')

  mountRegistryFilters(selectedRegistry)

  document.querySelectorAll('.repoBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = `${btn.dataset.reg}::${btn.dataset.repo}`
      if (state.expandedKey === key) {
        state.expandedKey = null
      } else {
        state.expandedKey = key
      }
      renderArtifacts()
      if (state.expandedKey === key && !state.tagsCache[key]) {
        loadTags(btn.dataset.reg, btn.dataset.repo, key, false)
      }
    })
  })

  document.querySelectorAll('.copyImageBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(btn.dataset.ref)
    })
  })
}

function renderGroup(title, artifacts, bad) {
  const rows = artifacts.map(a => {
    const key = `${a.registry_id}::${a.repository}`
    const expanded = state.expandedKey === key
    const cachedTags = state.tagsCache[key]
    const ref = `${extractHost(state.registryMap[a.registry_id]?.base_url || '')}/${a.repository}:latest`
    const mainRow = `<tr>
      <td>${state.registryMap[a.registry_id]?.name || a.registry_id}</td>
      <td><button data-reg="${a.registry_id}" data-repo="${a.repository}" class="repoBtn repo-link">${a.repository}</button></td>
      <td>${a.tag_count}</td>
      <td>${a.updated_at ? new Date(a.updated_at).toLocaleString() : ''}</td>
      <td><span class="repo-action"><button class="copyImageBtn" data-ref="${ref}">Copy image</button></span></td>
    </tr>`

    if (!expanded) {
      return mainRow
    }

    const tagsTable = renderExpandedTags(cachedTags)
    const expandRow = `<tr class="tag-expand-row"><td colspan="5"><div class="tag-panel">${tagsTable}</div></td></tr>`
    return mainRow + expandRow
  }).join('')

  return `<section class="repo-group">
    <div class="repo-group-title ${bad ? 'bad' : ''}">${title}</div>
    <table>
      <thead><tr><th><span class="registry-filter-head">Registry <select class="registryFilter"></select></span></th><th>Repository</th><th>Tags</th><th>Updated</th><th>Action</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">No repositories</td></tr>'}</tbody>
    </table>
  </section>`
}

function getSelectedRegistryFilterValue() {
  const fromUrl = getQueryParam('registry')
  if (fromUrl) return fromUrl
  const first = document.querySelector('.registryFilter')
  return first ? first.value : ''
}

function mountRegistryFilters(selected) {
  const options = [
    '<option value="">All registries</option>',
    ...state.registries.map(r => `<option value="${r.id}">${r.name}</option>`),
  ].join('')
  document.querySelectorAll('.registryFilter').forEach(sel => {
    sel.innerHTML = options
    sel.value = selected || ''
    sel.onchange = () => {
      const value = sel.value
      setQueryParam('registry', value)
      renderArtifacts()
    }
  })
}

function renderExpandedTags(tags) {
  if (!tags) {
    return '<div class="muted">Loading tags...</div>'
  }

  const total = Number.isInteger(tags.tag_count) ? tags.tag_count : (tags.tags || []).length
  const syncAt = formatTagTime(tags.repo_last_synced_at)
  const fetchedAt = formatTagTime(tags.fetched_at)
  const source = tags.from_cache ? '缓存' : '最新'
  const stale = tags.stale === true
  const rowsData = tags.tags || []

  const meta = `<div class="tag-meta">
    <span>Tags 总数: <strong>${total}</strong></span>
    <span>镜像仓库最新同步时间: <strong>${syncAt}</strong></span>
    <span>页面最后刷新时间: <strong>${fetchedAt}</strong></span>
    <span>数据来源: <strong>${source}</strong></span>
    ${stale ? '<span>状态: <strong>旧缓存</strong></span>' : ''}
    <button class="refreshTagsBtn" data-reg="${tags.registry_id || ''}" data-repo="${tags.repository || ''}">刷新</button>
  </div>`

  if (!rowsData.length) {
    return `${meta}<div class="muted">No tags found.</div>`
  }

  const rows = rowsData.map((t, idx) => {
    const updatedAt = formatTagTime(t.created_at)
    return `<tr>
      <td>${idx + 1}</td>
      <td><code>${t.image_ref}</code></td>
      <td>${t.tag}</td>
      <td>${updatedAt}</td>
      <td>
        <button class="copyBtn" data-ref="${t.image_ref}">Copy</button>
      </td>
    </tr>`
  }).join('')

  return `${meta}<table class="tag-table"><thead><tr><th>#</th><th>Image Ref</th><th>Tag</th><th>Updated At</th><th>Copy</th></tr></thead><tbody>${rows}</tbody></table>`
}

function formatTagTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 2000) {
    return '-'
  }
  return d.toLocaleString()
}

function extractHost(baseURL) {
  return baseURL.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

async function loadTags(registryId, repo, key, forceRefresh) {
  let url = `/api/tags?registry_id=${encodeURIComponent(registryId)}&repository=${encodeURIComponent(repo)}`
  if (forceRefresh) {
    url += '&force_refresh=true'
  }
  const payload = await fetch(url).then(r => r.json())
  payload.registry_id = registryId
  payload.repository = repo
  state.tagsCache[key] = payload
  renderArtifacts()

  document.querySelectorAll('.copyBtn').forEach(btn => btn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(btn.dataset.ref)
  }))

  document.querySelectorAll('.refreshTagsBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reg = btn.dataset.reg
      const repository = btn.dataset.repo
      const cacheKey = `${reg}::${repository}`
      await loadTags(reg, repository, cacheKey, true)
    })
  })
}

document.getElementById('search').addEventListener('click', loadArtifacts)

setInterval(() => {
  loadArtifacts()
  if (state.expandedKey) {
    const parts = state.expandedKey.split('::')
    if (parts.length === 2) {
      loadTags(parts[0], parts[1], state.expandedKey, false)
    }
  }
}, 10000)

loadRegistries().then(loadArtifacts)
