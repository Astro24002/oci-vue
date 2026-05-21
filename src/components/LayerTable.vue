<script setup lang="ts">
import { ref } from 'vue'
import type { LayerSummary } from '../types/registry'

defineProps<{ layers: LayerSummary[] }>()

const expanded = ref<string | null>(null)

function formatSize(size?: number | null): string {
  if (!size) return 'unknown'
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function toggle(digest: string) {
  expanded.value = expanded.value === digest ? null : digest
}
</script>

<template>
  <div class="layers">
    <h3>Layers</h3>
    <div v-for="(layer, index) in layers" :key="layer.digest" class="layer">
      <button class="layer__summary" @click="toggle(layer.digest)">
        <span>#{{ index + 1 }}</span>
        <strong>{{ layer.digest }}</strong>
        <span>{{ layer.mediaType ?? 'unknown' }}</span>
        <span>{{ formatSize(layer.size) }}</span>
      </button>
      <pre v-if="expanded === layer.digest" class="layer__history">{{ layer.history ?? 'history not available' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.layers {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
}

.layer {
  border-top: 1px solid #eef2f7;
}

.layer__summary {
  align-items: center;
  background: white;
  border: 0;
  display: grid;
  gap: 12px;
  grid-template-columns: 48px 1.2fr 1fr 100px;
  padding: 11px 0;
  text-align: left;
  width: 100%;
}

.layer__history {
  background: #eff6ff;
  border-radius: 8px;
  color: #1e3a8a;
  margin: 0 0 10px 60px;
  overflow: auto;
  padding: 10px;
}
</style>
