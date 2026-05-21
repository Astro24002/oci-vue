<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ManifestDetail from '../components/ManifestDetail.vue'
import TagList from '../components/TagList.vue'
import { loadTags, registryState } from '../stores/registryStore'

const props = defineProps<{ imageName: string | string[] }>()

const imageNameText = computed(() => Array.isArray(props.imageName) ? props.imageName.join('/') : props.imageName)
const selectedTag = ref('')

onMounted(async () => {
  await loadTags(imageNameText.value)
  selectedTag.value = registryState.tags[0]?.name ?? ''
})
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
      <TagList :tags="registryState.tags" :selected-tag="selectedTag" @select="selectedTag = $event" />
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
