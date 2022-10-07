<!--
 * @Author: Youzege
 * @Date: 2022-10-06 20:39:53
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-07 23:07:01
-->
<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <UploadData />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import UploadData from './pages/UploadData.vue'
import { darkTheme, NConfigProvider, NMessageProvider } from 'naive-ui'
import { ref } from 'vue'

const theme = ref('null')
theme.value = darkTheme
</script>

<style lang="scss" scoped>
.n-config-provider {
  height: 100%;
}
</style>
