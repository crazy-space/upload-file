<!--
 * @Author: Youzege
 * @Date: 2022-10-06 20:42:54
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-08 17:05:10
-->
<template>
  <div class="upload-container" @click="handleUpload">
    <!-- 选择获取 -->
    <div class="upload-select" v-if="type === 'select'">
      <slot></slot>
    </div>
    <!-- 拖拽 -->
    <div class="upload-drag" v-else @drop="dropChange" @dragover="dragOver">
      <slot></slot>
    </div>
    <!-- 拉取文件 -->
    <input
      ref="fileInput"
      class="upload-input"
      type="file"
      :accept="accept"
      :multiple="multiple"
      @change="inputChange"
    />
  </div>
</template>

<script></script>

<script setup>
import { pluckValueFromRange } from 'naive-ui/es/date-picker/src/utils'
import { ref } from 'vue'

// Props配置
const props = defineProps({
  type: {
    type: String,
    default: 'select'
  },
  multiple: {
    type: Boolean,
    default: false
  },
  accept: {
    type: String,
    default: '*'
  }
})
// Emit配置
const emits = defineEmits(['up-files'])

// -------- 变量 ---------
const fileInput = ref(null)

/**
 * 点击事件 - 触发Input事件
 *  - 触发文件选择
 */
const handleUpload = () => {
  fileInput.value.click()
}

/**
 * 更改事件 - Input Change事件触发
 *  - 获取选择的文件
 *  - up-sucess 回调 返回选择的文件
 */
const inputChange = value => {
  const { files } = value.target
  const fileList = [...files]
  emits('up-files', fileList)
  reUpload(value)
}

/**
 * 拖拽事件 - Drop Change事件触发
 *  - 获取选择的文件
 *  - up-sucess 回调 返回选择的文件
 */
const dropChange = e => {
  e.stopPropagation()
  e.preventDefault()
  const { files } = e.dataTransfer
  const fileList = [...files]
  emits('up-files', fileList)
  reUpload(e)
}

/**
 * 拖拽结束事件 - DragOver Change事件触发
 *  - 拖拽结束
 */
const dragOver = e => {
  e.preventDefault()
}

/**
 * 浏览器阻止重复上传
 */
const reUpload = (value) => {
  value.target.value = ''
}
</script>

<style lang="scss" scoped>
.upload-container {
  display: inline-block;
}

.upload-select {
  width: 100%;
}
.upload-drag {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 20rem;
  height: 15rem;
  border-radius: 0.1rem;
  border: 1px dashed #777;
  transition: all 0.3s;
  cursor: pointer;
  &:hover {
    border-color: #999;
  }
}

.upload-input {
  display: none;
}
</style>
