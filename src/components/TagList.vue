<script setup lang="ts">
import type { TagSummary } from '../types/registry'

defineProps<{
  tags: TagSummary[]
  selectedTag: string
}>()

defineEmits<{ select: [tag: string] }>()
</script>

<template>
  <aside class="tags">
    <h2>Tags / References</h2>
    <input class="input" placeholder="Search tag" />
    <button
      v-for="tag in tags"
      :key="tag.name"
      class="tag"
      :class="{ selected: tag.name === selectedTag }"
      @click="$emit('select', tag.name)"
    >
      <strong>{{ tag.name }}</strong>
      <small>{{ tag.digest ?? 'digest unknown' }}</small>
    </button>
  </aside>
</template>

<style scoped>
.tags {
  background: #fbfdff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  width: 360px;
}

.tag {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  text-align: left;
}

.tag.selected {
  background: #eff6ff;
  border-color: #2563eb;
}

small {
  color: #64748b;
  display: block;
  margin-top: 5px;
}
</style>
