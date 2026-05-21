<script setup lang="ts">
import { reactive } from 'vue'
import type { NewRegistryConnection } from '../types/registry'

const emit = defineEmits<{
  save: [connection: NewRegistryConnection]
  cancel: []
}>()

const form = reactive<NewRegistryConnection>({
  name: '',
  registryUrl: '',
  username: '',
  secret: '',
  rememberSecret: false
})

function submit() {
  emit('save', { ...form })
}
</script>

<template>
  <dialog class="connection-dialog" open>
    <form class="connection-dialog__form" @submit.prevent="submit">
      <h2>Add Connection</h2>
      <label>
        Name
        <input v-model="form.name" class="input" type="text" required />
      </label>
      <label>
        Registry URL
        <input v-model="form.registryUrl" class="input" type="text" required />
      </label>
      <label>
        Username
        <input v-model="form.username" class="input" type="text" required />
      </label>
      <label>
        Secret
        <input v-model="form.secret" class="input" type="password" required />
      </label>
      <label class="connection-dialog__checkbox">
        <input v-model="form.rememberSecret" type="checkbox" />
        Remember secret
      </label>
      <div class="connection-dialog__actions">
        <button class="button" type="button" @click="$emit('cancel')">Cancel</button>
        <button class="button button-primary" type="submit">Save</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.connection-dialog {
  border: 0;
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
  max-width: 520px;
  padding: 0;
}

.connection-dialog__form {
  display: grid;
  gap: 14px;
  padding: 24px;
}

.connection-dialog__form label {
  display: grid;
  gap: 6px;
  font-size: 14px;
}

.connection-dialog__checkbox {
  align-items: center;
  display: flex;
}

.connection-dialog__actions {
  display: flex;
  gap: 10px;
  justify-content: end;
}
</style>
