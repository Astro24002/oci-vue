import { reactive } from 'vue'
import { listConnections, listImages, listTags, saveConnection } from '../api/tauri'
import type { ImageSummary, NewRegistryConnection, RegistryConnection, TagSummary } from '../types/registry'

export const registryState = reactive({
  connections: [] as RegistryConnection[],
  selectedConnectionId: null as string | null,
  images: [] as ImageSummary[],
  tags: [] as TagSummary[],
  loading: false,
  error: null as string | null
})

export async function loadConnections() {
  registryState.connections = await listConnections()
  registryState.selectedConnectionId = registryState.connections[0]?.id ?? null
}

export async function createConnection(input: NewRegistryConnection) {
  const connection = await saveConnection(input)
  registryState.connections.push(connection)
  registryState.selectedConnectionId = connection.id
}

export async function loadImages(page = 1, pageSize = 20, search = '') {
  if (!registryState.selectedConnectionId) return
  registryState.loading = true
  registryState.error = null
  try {
    const result = await listImages(registryState.selectedConnectionId, page, pageSize, search)
    registryState.images = result.items
  } catch (error) {
    registryState.error = error instanceof Error ? error.message : 'Failed to load images'
  } finally {
    registryState.loading = false
  }
}

export async function loadTags(imageName: string) {
  if (!registryState.selectedConnectionId) return
  registryState.tags = await listTags(registryState.selectedConnectionId, imageName)
}
