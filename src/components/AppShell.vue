<template>
  <div class="shell">
    <header class="shell__header">
      <strong class="brand">OCI Vue</strong>
      <slot name="header" />
    </header>
    <main class="shell__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}

.shell__header {
  align-items: center;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  justify-content: space-between;
  padding: 20px 28px;
}

.brand {
  font-size: 18px;
  letter-spacing: 0.02em;
}

.shell__main {
  padding: 24px 28px 32px;
}
</style>
