/*
 * @Author: Youzege
 * @Date: 2022-10-07 17:36:51
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-08 00:13:01
 */
self.importScripts('./spark-md5.js')

/**
 * webworker 防止卡住主线程
 * @param {*} event 
 */
self.onmessage = (event) => {
  const fileChunkList = event.data.chunks
  const spark = new (self).SparkMD5.ArrayBuffer()
  let percentage = 0
  let count = 0

  const loadNext = (index) => {
    const reader = new FileReader()
    reader.readAsArrayBuffer(fileChunkList[index].file)
    reader.onload = (e) => {
      count++
      spark.append(e.target?.result)
      if(count === fileChunkList.length) {
        self.postMessage({
          progress: 100,
          hash: spark.end()
        })
        self.close()
      } else {
        percentage += 100 / fileChunkList.length
        self.postMessage({
          progress: percentage
        })
        // 递归
        loadNext(count)
      }
    }
  }
  // 开始
  loadNext(0)
}