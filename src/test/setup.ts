import { vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((command: string) => {
    if (command === 'list_connections') return Promise.resolve([])
    if (command === 'list_images') return Promise.resolve({ items: [], page: 1, pageSize: 20, total: 0 })
    if (command === 'list_tags') return Promise.resolve([])
    return Promise.resolve(undefined)
  })
}))
