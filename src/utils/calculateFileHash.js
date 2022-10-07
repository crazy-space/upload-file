/*
 * @Author: Youzege
 * @Date: 2022-10-07 17:41:46
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-07 23:35:34
 */


/**
 * 使用分片和web-work 全量计算hash值
 * @param file {File}
 * @returns 
 */
 export async function calcHashByWebWorker(file, size) {
  let chunks = [];
  let uploadFile = 0;
  while (uploadFile < file.size) {
    chunks.push({ file: file.slice(uploadFile, uploadFile + size) });
    uploadFile += size;
  }

  return new Promise(resolve => {
    // web-worker 防止卡顿主线程'
    const workder = new Worker(new URL('../worker/hash.worker.js', import.meta.url));
    workder.postMessage({ chunks });
    workder.onmessage = e => {
      const { progress, hash } = e.data;
      if (hash) {
        console.log(hash)
        resolve({ hashValue: hash, progress });
      }
    };
  });
}