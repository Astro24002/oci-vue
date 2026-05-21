<template>
  <dialog class="connection-dialog" open>
    <form class="connection-dialog__form" method="dialog">
      <h2>Add Connection</h2>
      <label>
        Name
        <input class="input" type="text" />
      </label>
      <label>
        Registry URL
        <input class="input" type="text" />
      </label>
      <label>
        Username
        <input class="input" type="text" />
      </label>
      <label>
        Secret
        <input class="input" type="password" />
      </label>
      <label class="connection-dialog__checkbox">
        <input type="checkbox" />
        Remember secret
      </label>
      <div class="connection-dialog__actions">
        <button class="button" type="button">Cancel</button>
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
