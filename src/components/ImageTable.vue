<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { ImageSummary } from '../types/registry'

defineProps<{ images: ImageSummary[] }>()

function formatSize(size?: number | null): string {
  if (!size) return 'unknown'
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="image-table">
    <div class="image-table__head">
      <span>Image</span>
      <span>Latest Tag</span>
      <span>Media Type</span>
      <span>Size</span>
      <span>Updated</span>
      <span class="right">Action</span>
    </div>
    <div v-for="image in images" :key="image.name" class="image-table__row">
      <span>
        <strong>{{ image.name }}</strong>
        <small>{{ image.digest ?? 'digest unknown' }}</small>
      </span>
      <span><mark>{{ image.latestTag ?? 'unknown' }}</mark></span>
      <span>{{ image.mediaType ?? 'unknown' }}</span>
      <span>{{ formatSize(image.size) }}</span>
      <span>{{ image.updated ?? 'unknown' }}</span>
      <RouterLink class="detail-link" :to="`/images/${image.name}`">Detail</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.image-table__head,
.image-table__row {
  display: grid;
  grid-template-columns: 1.5fr 160px 150px 130px 130px 90px;
  align-items: center;
}

.image-table__head {
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.image-table__head span,
.image-table__row span,
.detail-link {
  padding: 14px 16px;
}

.image-table__row {
  border-bottom: 1px solid #eef2f7;
  font-size: 14px;
}

small {
  color: #64748b;
  display: block;
  margin-top: 3px;
}

mark {
  background: #dbeafe;
  border-radius: 999px;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
}

.detail-link {
  color: #2563eb;
  font-weight: 700;
  text-align: right;
  text-decoration: none;
}

.right {
  text-align: right;
}
</style>
