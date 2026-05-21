<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppShell from '../components/AppShell.vue'
import ConnectionDialog from '../components/ConnectionDialog.vue'
import ImageTable from '../components/ImageTable.vue'
import RegistrySelector from '../components/RegistrySelector.vue'
import { createConnection, loadConnections, loadImages, registryState } from '../stores/registryStore'
import type { NewRegistryConnection } from '../types/registry'

const showConnectionForm = ref(false)
const search = ref('')
const rowsPerPage = ref(20)

onMounted(async () => {
  await loadConnections()
  await loadImages(1, rowsPerPage.value, search.value)
})

watch([() => registryState.selectedConnectionId, rowsPerPage, search], () => {
  void loadImages(1, rowsPerPage.value, search.value)
})

async function saveConnection(input: NewRegistryConnection) {
  await createConnection(input)
  showConnectionForm.value = false
  await loadImages(1, rowsPerPage.value, search.value)
}
</script>

<template>
  <AppShell>
    <template #header>
        <RegistrySelector
          :connections="registryState.connections"
          :selectedConnectionId="registryState.selectedConnectionId"
          @add="showConnectionForm = true"
        />
    </template>

    <section class="images-page">
      <div class="images-page__title">
        <div>
          <p class="eyebrow">Registry Browser</p>
          <h1>Images</h1>
        </div>
        <div class="toolbar">
          <input v-model="search" class="input" placeholder="Search image name" />
          <select v-model="rowsPerPage" class="input">
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </div>

      <p v-if="registryState.error" class="error">{{ registryState.error }}</p>
      <p v-else-if="registryState.loading" class="status">Loading images...</p>
      <ImageTable :images="registryState.images" />
    </section>

    <ConnectionDialog v-if="showConnectionForm" @save="saveConnection" @cancel="showConnectionForm = false" />
  </AppShell>
</template>

<style scoped>
.images-page {
  display: grid;
  gap: 18px;
}

.images-page__title {
  align-items: end;
  display: flex;
  justify-content: space-between;
}

.toolbar {
  align-items: center;
  display: flex;
  gap: 10px;
}

.error,
.status {
  margin: 0;
}

.error {
  color: #b91c1c;
}

.eyebrow {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0 0 6px;
  text-transform: uppercase;
}

h1 {
  margin: 0;
}
</style>
