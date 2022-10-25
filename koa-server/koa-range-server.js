/*
 * @Author: Youzege
 * @Date: 2022-10-25 10:56:31
 * @LastEditors: Youzege
 * @LastEditTime: 2022-10-25 11:02:21
 */
const Koa = require("koa");
const cors = require("@koa/cors");
const serve = require("koa-static");
const range = require("koa-range");

const PORT = 3000;
const app = new Koa();

// 注册中间件
app.use(cors());
app.use(range);
app.use(serve("."));

app.listen(PORT, () => {
  console.log(`应用已经启动：http://localhost:${PORT}/`);
});
