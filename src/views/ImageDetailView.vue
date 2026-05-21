<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ManifestDetail from '../components/ManifestDetail.vue'
import TagList from '../components/TagList.vue'
import type { TagSummary } from '../types/registry'

const props = defineProps<{ imageName: string | string[] }>()

const imageNameText = computed(() => Array.isArray(props.imageName) ? props.imageName.join('/') : props.imageName)
const selectedTag = ref('v1.8.2')
const tags: TagSummary[] = [
  { name: 'v1.8.2', digest: 'sha256:9f2a8d', mediaType: 'OCI Image', size: 88604672, created: '2026-05-18' },
  { name: 'latest', digest: 'sha256:9f2a8d', mediaType: 'OCI Image', size: 88604672, created: '2026-05-18' },
  { name: 'v1.8.1', digest: 'sha256:5ad18c', mediaType: 'OCI Image', size: 87975526, created: '2026-05-10' }
]
</script>

<template>
  <div class="page">
    <header class="page__header">
      <div class="title-row">
        <RouterLink class="button" to="/">Back to Images</RouterLink>
        <div>
          <h1>{{ imageNameText }}</h1>
          <p>Harbor Prod - 12 tags</p>
        </div>
      </div>
      <button class="button">Refresh</button>
    </header>

    <main class="content">
      <TagList :tags="tags" :selected-tag="selectedTag" @select="selectedTag = $event" />
      <ManifestDetail />
    </main>
  </div>
</template>

<style scoped>
.page__header {
  align-items: center;
  background: #111827;
  color: white;
  display: flex;
  height: 72px;
  justify-content: space-between;
  padding: 0 24px;
}

.title-row {
  align-items: center;
  display: flex;
  gap: 18px;
}

h1 {
  font-size: 20px;
  margin: 0;
}

p {
  color: #9ca3af;
  margin: 3px 0 0;
}

.content {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: flex;
  height: calc(100vh - 116px);
  margin: 22px;
  overflow: hidden;
}
</style>
