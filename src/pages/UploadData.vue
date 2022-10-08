<!--
 * @Author: Youzege
 * @Date: 2022-10-06 23:10:34
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-08 20:20:55
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
      <!-- 文件列表 -->
      <n-scrollbar style="max-height: 100px; margin:10px 0">
        <div class="file-container">
          <n-gradient-text type="info" :size="16">
            待传列表
          </n-gradient-text>
          <div class="file-list" v-for="file in fileList" :key="file.name">
            <!-- 列表 item -->
            <div class="file-list__item">
              {{ file.name }}
            </div>
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
        <n-button-group size="small">
          <n-button type="info" tertiary round @click="uploadFile">
            <template #icon>
              <n-icon><FileUpload /></n-icon>
            </template>
            开始上传
          </n-button>
          <n-button type="Warning" tertiary @click="uploadPause">
            <template #icon>
              <n-icon><PauseUpload /></n-icon>
            </template>
            中断上传
          </n-button>
          <n-button type="Primary" tertiary round @click="uploadResume">
            <template #icon>
              <n-icon><ResumeUpload /></n-icon>
            </template>
            断点续传
          </n-button>
        </n-button-group>
      </div>
      <n-scrollbar style="max-height: 100px; margin:10px 0" v-if="false">
        <div class="file-container">
          <n-gradient-text type="info" :size="14">
            上传列表
          </n-gradient-text>
          <div class="file-list" v-for="file in fileList" :key="file.name">
            <!-- 列表 item -->
            <div class="file-list__item">
              {{ file.name }}
            </div>
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
        </div>
      </n-scrollbar>
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
  useMessage,
  NButtonGroup
} from 'naive-ui'
import { ref, computed } from 'vue'
import Upload from '../components/Upload/Upload.vue'
import { Icon } from '@vicons/utils'
import {
  CloudUploadOutlined as Clound,
  DeleteForeverOutlined as Delete,
  FileUploadOutlined as FileUpload,
  MotionPhotosPauseOutlined as PauseUpload,
  RestartAltFilled as ResumeUpload
} from '@vicons/material'
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
const fileHash = ref([])

// 文件切片清单
const chunksMap = ref([])

// 请求完成列表 
const doneList = ref([])

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
let source = CancelToken.source()

/**
 * 1. 上传事件
 */
const uploadFile = async () => {
  if (fileList.value.length === 0) {
    return
  }
  fileList.value.forEach(async (file, index) => {
    const filename = file.name
    // 获得分片
    const chunks = createFileChunk(file)
    // 计算文件hash
    const { hashValue } = await calcHashByWebWorker(chunks)
    fileHash.value[index] = hashValue

    // 文件是否存在?
    const { uploaded, uploadedList } = await verify(filename, hashValue)
    // 判断文件是否存在,如果不存在，获取已经上传的切片
    if (uploaded) {
      status.value = STATUS.done
      message.success('秒传: 上传成功')
      return
    }
    // 组装上传文件清单
    chunksMap.value[index] = chunks.map((chunk, index) => {
      const chunkName = hashValue + '-' + index
      return {
        fileHash: hashValue,
        chunk: chunk.file,
        index,
        percent: 0,
        hash: chunkName,
        size: chunk.file.size
      }
    })
    // 传入已经存在的切片清单
    await uploadChunks(filename, chunksMap.value[index], uploadedList, index)
  })
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
const verify = async (filename, hash) => {
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
const uploadChunks = async (filename, chunkMap, uploadedList, currentIndex) => {
  // 1. 过滤出待传片段
  const list = chunkMap
    .filter(chunk => uploadedList.indexOf(chunk.hash) == -1)
    .map(({ chunk, hash, index }, i) => {
      const form = new FormData()
      form.append('chunk', chunk)
      form.append('hash', hash)
      form.append('filename', filename)
      form.append('fileHash', fileHash.value[currentIndex])
      return { form, index, status: STATUS.wait }
    })
    
  // 2. 请求 & 合并
  try {
    status.value = STATUS.uploading
    const ret = await sendRequest(list, 4, 3, currentIndex)
    if (ret && uploadedList.length + list.length === chunksMap.value[currentIndex].length) {
      // 上传完成列表 和 待传片段列表 = 总片段数 发送合并请求
      const chunksSize = new Array(chunksMap.value[currentIndex].length).fill(chunkSize)
      chunksSize[0] = 0
      await mergeRequest(filename, chunksSize, currentIndex)
      status.value = STATUS.done
      message.success('上传成功!')
    }
  } catch (e) {
    status.value = STATUS.error
    message.error('上传失败!')
  }
}

/**
 * 5. 上传文件请求
 * @param list 待传片段
 * @param max 并发数量
 * @retryTimes 重试次数
 */
const sendRequest = async (list, max = 4, retryTimes = 3, currentIndex) => {
  return new Promise((resolve, reject) => {
    const len = list.length
    let counter = 0
    const retryArr = new Array(len).fill(0)
    const start = async () => {
      if (counter === len && counter === 0) {
        resolve(true)
      }
      // 上传请求, 控制请求数量
      while (counter < len && max > 0) {
        // 占用通道
        max--
        // 状态: wait或者error 需要重新发送上传请求
        const upIndex = list.findIndex(
          v => v.status == STATUS.wait || v.status == STATUS.error
        )
        if (upIndex == -1) {
          // 没有等待的请求，结束
          resolve(true)
          return
        }
        list[upIndex].status = STATUS.uploading

        const form = list[upIndex].form
        const index = list[upIndex].index
        if (typeof retryArr[index] == 'number') {
          console.log(index, `第${retryArr[index] + 1}次上传`)
        }
        try {
          await chunkUpload({
            url: '/upload',
            method: 'post',
            data: form,
            currentIndex,
            source
          })
          list[upIndex].status = STATUS.done
          max++ // 释放通道
          counter++
          if (counter === len) {
            resolve(true)
          } else {
            console.log(allPercent.value)
            start()
          }
        } catch (e) {
          // 报错后--重试上传
          list[upIndex].status = STATUS.error
          if (typeof retryArr[index] !== 'number') {
            retryArr[index] = 0
          }
          // 重试次数累加
          retryArr[index]++
          // 重复次数过多 终止上传
          if (retryArr[index] > retryTimes) {
            return reject()
          }
          console.log(index, retryArr[index], e, '次报错')

          // 释放当前占用的通道，但是counter不累加
          max++

          // 重试次数内, 重新发送请求
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
const chunkUpload = async ({ url, method, data, currentIndex, source }) => {
  const res = await request({
    url,
    method,
    data,
    onUploadProgress: createProgress(
      chunksMap.value[currentIndex]
    ), // 传入监听上传进度回调
    cancelToken: source.token
  })
  return res
}

/**
 * 进度
 */
const createProgress = (item) => {
  return (e) => {
    item.percent = parseInt(String((e.loaded / e.total) * 100))
  }
}

const allPercent = computed(() => {
  const chunksMapA = chunksMap.value
  const loaded = chunksMapA
    .map(list => list)
    .map(({ size, percent }) => {
      console.log('size * percent', size , percent)
      return size * percent
    })
    .reduce((pre, next) => pre + next);
  console.log('loaded', loaded)
  return loaded
})

/**
 * 6.发送合并请求
 */
const mergeRequest = async (filename, size, currentIndex) => {
  await request({
    url: '/merge',
    method: 'post',
    data: {
      filename,
      size,
      fileHash: fileHash.value[currentIndex]
    }
  })
}

/**
 * 7. 中断请求
 */
const uploadPause = () => {
  status.value = STATUS.pause
  source.cancel()
  source = CancelToken.source()
}

/**
 * 8. 断点续传
 */
const uploadResume = async () => {
  status.value = STATUS.uploading
  fileList.value.forEach(async (file, index) => {
    const filename = file.name
    const { uploadedList } = await verify(filename, fileHash.value[index])
    // 上传切片
    await uploadChunks(filename, chunksMap.value, uploadedList, index)
  })
}

const deleteFiles = file => {
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
    // width: 8rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.btn-group {
  display: flex;
  justify-content: center;
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
  font-size: 1.4rem;
}
</style>
