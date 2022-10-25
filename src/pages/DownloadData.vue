<!--
 * @Author: Youzege
 * @Date: 2022-10-18 10:39:37
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-25 16:26:56
-->
<template>
  <n-layout>
    <n-layout-header>
      <n-gradient-text type="info">
        <span>下载</span>
      </n-gradient-text>
    </n-layout-header>

    <n-layout-content content-style="padding: 24px;">
      <div class="download-box">
        <n-input
          v-model:value="downloadUrl"
          type="text"
          placeholder="下载url"
        />
        <n-button class="download-box__btn" @click="downloadFile">
          👉下载
        </n-button>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script setup>
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NGradientText,
  NButton,
  NInput
} from 'naive-ui'
import { saveAs } from 'file-saver'
import request from '../utils/http'
import { ref } from 'vue'
import asyncPool from 'tiny-async-pool'

/**
 * saveAs
 * @param type 类型 Blob/File/Url
 * @param options 可选参数配置项
 */
const handleDownload = async () => {
  const res = await request({
    url:
      'http://192.168.200.53:8088/dgp-server-web-nr/rest/bms/v1/file/download?fileId=21027',
    method: 'GET',
    responseType: 'blob' // 文件流
  })

  blobToFile(res.data, '下载.prj')
}

const blobToFile = (blob, filename) => {
  saveAs(blob, filename)
}

/**
 * 分片下载
 * - 参数
 *  - 分块大小
 *  - 并发数
 *  - 切片请求重试次数
 *
 *
 * 1. 获取文件大小
 * 2. 控制下载并发
 * 3. 指定范围的文件
 * 4. 文件合并
 * 5. 文件下载事件
 * 6. 文件保存
 */

// ------------------------参数----------------------------
/**
 * 下载url
 */
const downloadUrl = ref('/qjtp.jpg')

/**
 * 分块大小
 */
const chunkSize = 2 * 1024 * 1024

/**
 * 并发数
 */
const concurrency = 3

/**
 * 请求重试次数
 */
const errRetry = 3

/**
 * 分块数量
 */

// ------------------------方法----------------------------
/**
 * 获取文件大小
 */
const getContentLength = async url => {
  const res = await request({
    url: downloadUrl.value,
    method: 'HEAD'
  })
  return res.headers['content-length']
}

/**
 * 并发控制
 */
const ReqAsyncPool = async (...args) => {
  const allArray = []
  for await (const ms of asyncPool(...args)) {
    allArray.push(ms)
  }

  return allArray
}

/**
 * 文件范围控制
 */
const getBinaryContent = async (start, end) => {
  const res = await request({
    url: downloadUrl.value,
    method: 'GET',
    headers: {
      Range: `bytes=${start}-${end}`
    },
    responseType: 'arraybuffer'
  })
  return { buffer: res.data }
}

/**
 * 文件合并
 */
const concatenate = arrays => {
  if (!arrays.length) return null
  let totalLength = arrays.reduce((acc, value) => acc + value.length, 0)
  let result = new Uint8Array(totalLength)
  let length = 0
  for (let array of arrays) {
    result.set(array, length)
    length += array.length
  }
  console.log(result)
  return result
}

/**
 * 下载
 */
const downloadFile = async () => {
  const url = downloadUrl.value
  // 1. 文件大小
  const contentLength = await getContentLength(url)

  // 2. 文件分片数量
  const chunks =
    typeof chunkSize === 'number' ? Math.ceil(contentLength / chunkSize) : 1

  // 3. 并发请求
  const res = await ReqAsyncPool(
    concurrency,
    [...new Array(chunks).keys()],
    i => {
      let start = i * chunkSize
      let end = i + 1 == chunks ? contentLength - 1 : (i + 1) * chunkSize - 1
      return getBinaryContent(start, end, i)
    }
  )

  const sortedBuffers = res.map(item => new Uint8Array(item.buffer))
  const concatenateData = concatenate(sortedBuffers)
  fileSave({
    name: 'qjtp.jpg',
    sortedBuffers: concatenateData,
    mime: 'image/jpeg'
  })
}

/**
 * 文件保存
 */
const fileSave = ({
  name,
  sortedBuffers,
  mime = 'application/octet-stream'
}) => {
  const blob = new Blob([sortedBuffers], { type: mime })
  // 使用 saveAs
  saveAs(blob, name)
}
</script>

<style lang="scss" scoped>
.n-layout {
  height: 100%;
}
.n-layout-header {
  box-sizing: border-box;
  background: rgba(128, 128, 128, 0.2);
  height: 5rem;
  padding: 1.4rem;
}

.n-layout-content {
  display: flex;
  justify-content: center;
  height: calc(100% - 5rem);
  background: rgba(128, 128, 128, 0.4);
  user-select: none;
}

.n-gradient-text {
  font-size: 1.4rem;
}

.download-box {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  align-items: center;

  &__btn{
    margin-top: 10px;
  }
}
</style>
