/**
 * 后端服务启动脚本
 * 开发：npm run dev（带 watch）
 * 生产：npm run start 或 node server.js，端口由环境变量 PORT 控制
 */
import app from './app.js'

const PORT = Number(process.env.PORT) || 3000
app.listen(PORT, () => console.log(`API http://localhost:${PORT}`))
