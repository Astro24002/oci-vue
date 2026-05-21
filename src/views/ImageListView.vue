<script setup lang="ts">
import AppShell from '../components/AppShell.vue'
import ConnectionDialog from '../components/ConnectionDialog.vue'
import ImageTable from '../components/ImageTable.vue'
import RegistrySelector from '../components/RegistrySelector.vue'
import { registryState } from '../stores/registryStore'
</script>

<template>
  <AppShell>
    <template #header>
      <RegistrySelector
        :connections="registryState.connections"
        :selectedConnectionId="registryState.selectedConnectionId"
        @add="() => {}"
      />
    </template>

    <section class="images-page">
      <div class="images-page__title">
        <div>
          <p class="eyebrow">Registry Browser</p>
          <h1>Images</h1>
        </div>
      </div>

      <ImageTable :images="registryState.images" />
    </section>

    <ConnectionDialog />
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
