import { render, screen } from '@testing-library/vue'
import ImageTable from './ImageTable.vue'
import { router } from '../router'
import type { ImageSummary } from '../types/registry'

test('renders image rows and latest tag', async () => {
  router.push('/')
  await router.isReady()

  const images: ImageSummary[] = [
    {
      name: 'platform/api',
      latestTag: 'v1.8.2',
      digest: 'sha256:9f2a8d',
      mediaType: 'OCI Image',
      size: 88604672,
      updated: '2026-05-18'
    }
  ]

  render(ImageTable, { props: { images }, global: { plugins: [router] } })

  expect(screen.getByText('platform/api')).toBeTruthy()
  expect(screen.getByText('v1.8.2')).toBeTruthy()
  expect(screen.getByText('84.5 MB')).toBeTruthy()
})
