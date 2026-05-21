import { invoke } from '@tauri-apps/api/core'
import type { NewRegistryConnection, RegistryConnection } from '../types/registry'

export function listConnections(): Promise<RegistryConnection[]> {
  return invoke('list_connections')
}

export function saveConnection(input: NewRegistryConnection): Promise<RegistryConnection> {
  return invoke('save_connection', { input })
}
