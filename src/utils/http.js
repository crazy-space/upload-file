/*
 * @Author: Youzege
 * @Date: 2022-10-07 18:52:12
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-08 16:01:39
 */
import axios from 'axios'

const service = axios.create({
  baseURL: 'http://localhost:4001'
})

service.interceptors.request.use((req) => {
  return req
})

service.interceptors.response.use((res) => {
  return res.data
})

export default service