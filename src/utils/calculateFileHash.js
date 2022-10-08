/*
 * @Author: Youzege
 * @Date: 2022-10-07 17:41:46
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-08 18:09:49
 */


/**
 * 使用分片和web-work 全量计算hash值
 * @param chunks 分片列表
 * @returns 
 */
 export async function calcHashByWebWorker(chunks) {
  return new Promise(resolve => {
    // web-worker 防止卡顿主线程'
    const worker = new Worker(new URL('../worker/hash.worker.js', import.meta.url));
    // 向worker 发送 chunks 片段
    worker.postMessage({ chunks });
    worker.onmessage = e => {
      const { hash } = e.data;
      if (hash) {
        resolve({ hashValue: hash });
      }
    };
  });
}