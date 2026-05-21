import type { ImageSummary, RegistryConnection } from '../types/registry'

export interface RegistryState {
  connections: RegistryConnection[]
  selectedConnectionId: string | null
  images: ImageSummary[]
}

export const registryState: RegistryState = {
  connections: [],
  selectedConnectionId: null,
  images: [
    {
      name: 'platform/api',
      latestTag: 'v1.8.2',
      digest: 'sha256:9f2a8d',
      mediaType: 'OCI Image',
      size: 88604672,
      updated: '2026-05-18'
    },
    {
      name: 'infra/charts/nginx',
      latestTag: '0.4.1',
      digest: 'sha256:69abc4',
      mediaType: 'Helm Chart',
      size: 319488,
      updated: '2026-05-16'
    }
  ]
}
