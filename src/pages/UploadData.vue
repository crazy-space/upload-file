<!--
 * @Author: Youzege
 * @Date: 2022-10-06 23:10:34
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-08 00:33:09
-->
<template>
  <n-layout>
    <n-layout-header>
      <n-gradient-text type="info">
        <span>上传</span>
      </n-gradient-text>
    </n-layout-header>

    <n-layout-content content-style="padding: 24px;">
      <!-- 上传组件~ -->
      <Upload type="drag" @up-files="getFiles" :multiple="true">
        <div class="content">
          <n-icon size="48">
            <clound />
          </n-icon>
          <p>点击上传或者将文件拖拽到这</p>
        </div>
      </Upload>
      <!-- 文件列表 - 文件进度 -->
      <n-scrollbar style="max-height: 80px; margin:10px 0">
        <div class="file-container">
          <div class="file-list" v-for="file in fileList" :key="file.name">
            <!-- 列表 item -->
            <div class="file-list__item">
              {{ file.name }}
            </div>
            <!-- 进度 -->
            <n-progress
              class="file-list__progress"
              type="line"
              color="#70c0e8"
              :percentage="0"
              :indicator-placement="'inside'"
              processing
            />
            <!-- delete -->
            <n-button
              quaternary
              circle
              color="#70c0e8"
              @click="deleteFiles(file)"
            >
              <template #icon>
                <n-icon><delete /></n-icon>
              </template>
            </n-button>
          </div>
          <n-gradient-text type="info" v-if="fileList.length === 0">
            <span>似乎还没有文件</span>
          </n-gradient-text>
        </div>
      </n-scrollbar>
      <div class="btn-group">
        <n-button strong secondary type="info" @click="uploadFile">
          开始上传
        </n-button>
        <n-button strong secondary type="warning" @click="uploadPause">
          中断上传
        </n-button>
        <n-button strong secondary type="Primary" @click="uploadResume">
          断点续传
        </n-button>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script>
/**
 * 请求状态
 */
const STATUS = {
  wait: 'wait',
  pause: 'pause',
  uploading: 'uploading',
  error: 'error',
  done: 'done'
}
</script>

<script setup>
import {
  NSpace,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NGradientText,
  NButton,
  NIcon,
  NProgress,
  NScrollbar,
  useMessage 
} from 'naive-ui'
import { ref } from 'vue'
import Upload from '../components/Upload/Upload.vue'
import { Icon } from '@vicons/utils'
import {
  CloudUploadOutlined as Clound,
  DeleteForeverOutlined as Delete
} from '@vicons/material'
import SparkMD5 from 'spark-md5'
import { calcHashByWebWorker } from '../utils/calculateFileHash'
import request from '../utils/http'
import axios from 'axios'

const message = useMessage()

// 分片Size
const chunkSize = 2 * 1024 * 1024

// 当前文件列表
const fileList = ref([])
// 当前状态
const status = ref(STATUS.wait)
// 文件Hash
const fileHash = ref('')

// 文件切片清单
const chunksMap = ref([])
// 请求列表
const requestList = ref([])

/**
 * 获取文件 Upload 回调
 */
const getFiles = value => {
  let files = [...value]
  if (fileList.value.length > 0) {
    let exsit
    files.forEach(file => {
      exsit = fileList.value.find(item => item.name === file.name)
    })
    if (exsit) {
      return
    }
  }
  fileList.value = fileList.value.concat(files)
  status.value = STATUS.wait
}

/**
 * 中断请求
 */
const CancelToken = axios.CancelToken
const source = CancelToken.source()

/**
 * 1. 上传事件
 */
const uploadFile = async () => {
  if (fileList.value.length === 0) {
    return
  }
  const file = fileList.value[0]
  const filename = file.name
  // 获得分片
  const chunks = createFileChunk(file)
  // 计算文件hash
  const { hashValue } = await calcHashByWebWorker(file, chunkSize)
  fileHash.value = hashValue

  // 文件是否存在?
  const { uploaded, uploadedList } = await hasFile(filename, hashValue)
  // 判断文件是否存在,如果不存在，获取已经上传的切片
  if (uploaded) {
    status.value = STATUS.done
    message.success(
      '秒传: 上传成功'
    )
    return
  }
  // 组装上传文件清单
  chunksMap.value = chunks.map((chunk, index) => {
    const chunkName = hashValue + '-' + index
    return {
      fileHash: hashValue,
      chunk: chunk.file,
      index,
      hash: chunkName,
      progress: uploadedList.indexOf(chunkName) > -1 ? 100 : 0,
      size: chunk.file.size
    }
  })
  // 传入已经存在的切片清单
  await uploadChunks(filename, chunksMap.value, uploadedList)
}

/**
 * 2. 生成chunk片段
 * @param file 文件
 */
const createFileChunk = file => {
  const chunks = []
  let cur = 0
  while (cur < file.size) {
    chunks.push({ file: file.slice(cur, cur + chunkSize) })
    cur += chunkSize
  }
  return chunks
}

/**
 * 3. 判断文件是否存在
 * @param filename 文件名
 * @param hash 文件hash值
 */
const hasFile = async (filename, hash) => {
  const data = await request({
    url: '/verify',
    method: 'post',
    data: {
      filename,
      hash
    }
  })
  return data
}

/**
 * 4. 文件切片
 * @param filename 文件名
 * @param chunkMap 文件切片清单
 * @param uploadedList 待传列表
 */
const uploadChunks = async (filename, chunkMap, uploadedList) => {
  // 1. 获取待传片段
  const list = chunkMap
    .filter(chunk => uploadedList.indexOf(chunk.hash) == -1)
    .map(({ chunk, hash, index }, i) => {
      const form = new FormData()
      form.append('chunk', chunk)
      form.append('hash', hash)
      form.append('filename', filename)
      form.append('fileHash', fileHash.value)
      return { form, index, status: STATUS.wait }
    })

  // 2. 请求 & 合并
  try {
    status.value = STATUS.uploading
    const ret = await sendRequest(list, 4)
    if (ret && uploadedList.length + list.length === chunksMap.value.length) {
      // 上传列表 和 待传列表 = 总片段 发送合并请求
      const chunksSize = new Array(chunksMap.value.length).fill(chunkSize)
      chunksSize[0] = 0
      await mergeRequest(filename, chunksSize)
      status.value = STATUS.done
      message.success(
        '上传成功!'
      )
    }
  } catch (e) {
    // alert('亲 上传失败了,考虑重试下呦');
    status.value = STATUS.error
    console.log(e, '------错误文件')
    message.error(
      '上传失败!'
    )
  }
}

/**
 * 5. 上传文件请求
 * @param list 待传片段
 * @param max 并发数量
 * @retryTimes 重试次数
 */
const sendRequest = async (list, max = 4, retryTimes = 3) => {
  return new Promise((resolve, reject) => {
    const len = list.length
    let counter = 0
    const retryArr = new Array(len).fill(0)
    const start = async () => {
      if (counter === len && counter === 0) {
        resolve(true)
      }
      // 有请求，有通道
      while (counter < len && max > 0) {
        max-- // 占用通道
        // 等待或者error 需要重传
        const i = list.findIndex(
          v => v.status == STATUS.wait || v.status == STATUS.error
        )
        if (i == -1) {
          // 没有等待的请求，结束
          resolve(true)
          return
        }
        list[i].status = STATUS.uploading

        const form = list[i].form
        const index = list[i].index
        if (typeof retryArr[index] == 'number') {
          console.log(index, `第${retryArr[index] + 1}次上传`)
        }
        try {
          await chunkUpload({
            url: '/upload',
            method: 'post',
            data: form,
            onUploadProgress: createProgresshandler(chunksMap.value[index]),
            source
          })
          list[i].status = STATUS.done
          max++ // 释放通道
          counter++
          if (counter === len) {
            resolve(true)
          } else {
            start()
          }
        } catch (e) {
          // 初始值
          list[i].status = STATUS.error
          if (typeof retryArr[index] !== 'number') {
            retryArr[index] = 0
          }
          // 次数累加
          retryArr[index]++
          // 一个请求报错3次的
          if (retryArr[index] > retryTimes) {
            return reject() // 考虑abort所有别的
          }
          console.log(index, retryArr[index], e, '次报错')
          // 3次报错以内的 重启
          chunksMap.value[index].progress = -1 // 报错的进度条
          max++ // 释放当前占用的通道，但是counter不累加

          start()
        }
      }
    }

    start()
  })
}

/**
 * 单独封装 分片请求
 *
 */
const chunkUpload = async ({ url, method, data, onUploadProgress, source }) => {
  const res = await request({
    url,
    method,
    data,
    cancelToken: source.token
  })
  return res
}

/**
 * 6.创建上传进度
 * @param item
 */
const createProgresshandler = item => {
  return e => {
    item.progress = parseInt(String((e.loaded / e.total) * 100))
  }
}

/**
 * 7.发送合并请求
 */
const mergeRequest = async (filename, size) => {
  await request({
    url: '/merge',
    method: 'post',
    data: {
      filename,
      size,
      fileHash: fileHash.value
    }
  })
}

/**
 * 8. 中断请求
 */
const uploadPause = () => {
  status.value = STATUS.pause
  source.cancel(' Pause ')
}

/**
 * 9. 断点续传
 */
const uploadResume = async () => {
  status.value = STATUS.uploading
  const filename = fileList.value[0].name
  const { uploadedList } = await hasFile(filename, fileHash.value)
  // 上传切片
  await uploadChunks(filename, chunksMap.value, uploadedList)
}

const deleteFiles = (file) => {
  fileList.value = fileList.value.filter(item => item.name !== file.name)
}
</script>

<style lang="scss" scoped>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.file-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  width: 20rem;
  // height: 10rem;
  transition: all 0.1s;
}

.file-list {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
  width: 100%;
  height: 1.2rem;

  &__item {
    width: 8rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &__progress {
    width: 8rem;
  }
}

.btn-group {
  display: flex;
  justify-content: space-between;
}

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
  font-size: 1.6rem;
}
</style>
