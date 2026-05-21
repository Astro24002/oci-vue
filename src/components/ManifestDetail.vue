<script setup lang="ts">
import LayerTable from './LayerTable.vue'
import type { LayerSummary } from '../types/registry'

const layers: LayerSummary[] = [
  {
    digest: 'sha256:b77a',
    mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
    size: 33554432,
    history: 'RUN apk add --no-cache ca-certificates'
  },
  {
    digest: 'sha256:401c',
    mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
    size: 19713228,
    history: 'COPY . /app'
  }
]
</script>

<template>
  <section class="detail">
    <header class="detail__header">
      <div>
        <h2>v1.8.2</h2>
        <p>application/vnd.oci.image.manifest.v1+json</p>
      </div>
      <div class="actions">
        <button class="button">Copy Digest</button>
        <button class="button">Copy Manifest JSON</button>
      </div>
    </header>

    <div class="cards">
      <div><span>Digest</span><strong>sha256:9f2a8d</strong></div>
      <div><span>Size</span><strong>84.5 MB</strong></div>
      <div><span>Created</span><strong>2026-05-18</strong></div>
      <div><span>Schema</span><strong>2</strong></div>
    </div>

    <LayerTable :layers="layers" />

    <pre class="json">{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.manifest.v1+json",
  "layers": []
}</pre>
  </section>
</template>

<style scoped>
.detail {
  flex: 1;
  overflow: auto;
  padding: 18px 20px;
}

.detail__header,
.actions {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

h2 {
  margin: 0;
}

p {
  color: #64748b;
  margin: 3px 0 0;
}

.cards {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 16px 0;
}

.cards div {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
}

.cards span {
  color: #64748b;
  display: block;
  font-size: 11px;
  text-transform: uppercase;
}

.json {
  background: #0f172a;
  border-radius: 12px;
  color: #d1d5db;
  margin-top: 14px;
  overflow: auto;
  padding: 16px;
}
</style>
