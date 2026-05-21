import { fireEvent, render, screen } from '@testing-library/vue'
import LayerTable from './LayerTable.vue'
import type { LayerSummary } from '../types/registry'

test('expands layer history on click', async () => {
  const layers: LayerSummary[] = [
    {
      digest: 'sha256:b77a',
      mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
      size: 33554432,
      history: 'RUN apk add --no-cache ca-certificates'
    }
  ]

  render(LayerTable, { props: { layers } })

  expect(screen.queryByText('RUN apk add --no-cache ca-certificates')).toBeNull()
  await fireEvent.click(screen.getByText('sha256:b77a'))
  expect(screen.getByText('RUN apk add --no-cache ca-certificates')).toBeTruthy()
})
