import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import adminRoutes from "./routes/adminRoutes";
import apiKeyRoutes from "./routes/apiKeyRoutes";
import adminPasteRoutes from "./routes/adminPasteRoutes";
import userPasteRoutes from "./routes/userPasteRoutes";
import s3ConfigRoutes from "./routes/s3ConfigRoutes";
import systemRoutes from "./routes/systemRoutes";
import { DbTables, ApiStatus } from "./constants";
import { createErrorResponse } from "./utils/common";
import { registerAdminFilesRoutes } from "./routes/adminFilesRoutes";
import { registerUserFilesRoutes } from "./routes/userFilesRoutes";
import { registerS3UploadRoutes } from "./routes/s3UploadRoutes";
import { registerFileViewRoutes } from "./routes/fileViewRoutes";
import { authMiddleware } from "./middlewares/authMiddleware";
import { apiKeyFileMiddleware } from "./middlewares/apiKeyMiddleware";

// 创建一个Hono应用实例
const app = new Hono();

// 注册中间件
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*", // 允许所有来源，生产环境中可以设置为特定的域名
    allowHeaders: ["Content-Type", "Authorization", "X-API-KEY"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

// 文件API路由的中间件（确保在路由注册前添加）
app.use("/api/admin/files/*", authMiddleware);
app.use("/api/user/files/*", apiKeyFileMiddleware);

// 注册路由
app.route("/", adminRoutes);
app.route("/", apiKeyRoutes);
app.route("/", adminPasteRoutes);
app.route("/", userPasteRoutes);
app.route("/", s3ConfigRoutes);
app.route("/", systemRoutes);

// 注册文件相关路由
registerAdminFilesRoutes(app);
registerUserFilesRoutes(app);
registerS3UploadRoutes(app);
registerFileViewRoutes(app);

// 健康检查路由
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// 全局错误处理
app.onError((err, c) => {
  console.error(`[错误] ${err.message}`, err.stack);

  if (err instanceof HTTPException) {
    const status = err.status || ApiStatus.INTERNAL_ERROR;
    const message = err.message || "服务器内部错误";
    return c.json(createErrorResponse(status, message), status);
  }

  return c.json(createErrorResponse(ApiStatus.INTERNAL_ERROR, "服务器内部错误"), ApiStatus.INTERNAL_ERROR);
});

// 404路由处理
app.notFound((c) => {
  return c.json(createErrorResponse(ApiStatus.NOT_FOUND, "未找到请求的资源"), ApiStatus.NOT_FOUND);
});

// 将应用导出为默认值
export default app;
