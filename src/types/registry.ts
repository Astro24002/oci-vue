export interface RegistryConnection {
  id: string
  name: string
  registryUrl: string
  username: string
  rememberSecret: boolean
}

export interface NewRegistryConnection {
  name: string
  registryUrl: string
  username: string
  secret: string
  rememberSecret: boolean
}

export interface ImageSummary {
  name: string
  latestTag?: string | null
  digest?: string | null
  mediaType?: string | null
  size?: number | null
  updated?: string | null
}

export interface PagedImages {
  items: ImageSummary[]
  page: number
  pageSize: number
  total?: number | null
}

export interface TagSummary {
  name: string
  digest?: string | null
  mediaType?: string | null
  size?: number | null
  created?: string | null
}

export interface LayerSummary {
  digest: string
  mediaType?: string | null
  size?: number | null
  history?: string | null
}
