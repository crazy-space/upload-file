/*
 * @Author: Youzege
 * @Date: 2022-10-07 18:52:12
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-25 09:42:37
 */
import axios from 'axios'

const service = axios.create({
  baseURL: 'http://localhost:3000'
})

service.interceptors.request.use((req) => {
  return req
})

service.interceptors.response.use((res) => {
  return res
})

export default service