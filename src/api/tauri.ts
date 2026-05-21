import { invoke } from '@tauri-apps/api/core'
import type { NewRegistryConnection, PagedImages, RegistryConnection, TagSummary } from '../types/registry'

export function listConnections(): Promise<RegistryConnection[]> {
  return invoke('list_connections')
}

export function saveConnection(input: NewRegistryConnection): Promise<RegistryConnection> {
  return invoke('save_connection', { input })
}

export function listImages(connectionId: string, page: number, pageSize: number, search?: string): Promise<PagedImages> {
  return invoke('list_images', { connectionId, page, pageSize, search: search || null })
}

export function listTags(connectionId: string, imageName: string): Promise<TagSummary[]> {
  return invoke('list_tags', { connectionId, imageName })
}
