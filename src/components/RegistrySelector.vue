<script setup lang="ts">
import type { RegistryConnection } from '../types/registry'

defineProps<{
  connections: RegistryConnection[]
  selectedConnectionId: string | null
}>()

defineEmits<{
  (event: 'add'): void
}>()
</script>

<template>
  <div class="registry-selector">
    <label class="registry-selector__label" for="registry">Registry</label>
    <select id="registry" class="input registry-selector__select">
      <option v-if="!connections.length" value="">No connections</option>
      <option v-for="connection in connections" :key="connection.id" :value="connection.id">
        {{ connection.name }}
      </option>
    </select>
    <button class="button button-primary" type="button" @click="$emit('add')">Add</button>
  </div>
</template>

<style scoped>
.registry-selector {
  align-items: end;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr auto;
  min-width: 360px;
}

.registry-selector__label {
  color: #cbd5e1;
  display: block;
  font-size: 12px;
  font-weight: 700;
  grid-column: 1 / -1;
  text-transform: uppercase;
}

.registry-selector__select {
  min-width: 280px;
}
</style>
