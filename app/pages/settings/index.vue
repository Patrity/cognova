<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

navigateTo('/settings/account', { replace: true })
</script>

<template>
  <div />
</template>
