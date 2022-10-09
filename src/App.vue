<!--
 * @Author: Youzege
 * @Date: 2022-10-06 20:39:53
 * @LastEditors: luoyz
 * @LastEditTime: 2022-10-09 10:43:03
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
import { darkTheme, NConfigProvider, NMessageProvider, NButton } from 'naive-ui'
import { ref } from 'vue'

const theme = ref('null')
theme.value = darkTheme
</script>

<style lang="scss" scoped>
.n-config-provider {
  height: 100%;
}
</style>
