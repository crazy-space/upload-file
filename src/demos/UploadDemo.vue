<!--
 * @Author: Youzege
 * @Date: 2022-10-06 23:10:56
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-06 23:11:04
-->
<template>
  <!-- select 用法 -->
  <Upload @up-files="getFiles" :multiple="true" :accept="'.jpg,.png'">
    <n-button>
      <template #icon>
        <n-icon>
          <clound />
        </n-icon>
      </template>
      点击上传文件
    </n-button>
  </Upload>

  <!-- drag 用法 -->
  <Upload type="drag" @up-files="getFiles" :multiple="true">
    <div class="content">
      <n-icon size=48>
        <clound />
      </n-icon>
      <p>点击上传或者将文件拖拽到这</p>
    </div>
  </Upload>
</template>

<script setup>
  import { ref } from 'vue'
  import Upload from './components/Upload/Upload.vue'
  import { Icon } from '@vicons/utils'
  import { CloudUploadOutlined as Clound } from '@vicons/material'
  import { NButton, NIcon } from 'naive-ui'

  let fileList = ref([])

  const getFiles = (value) => {
    fileList.value = fileList.value.concat(...value)
    console.log(fileList.value)
  }
</script>

<style lang='scss' scoped>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
