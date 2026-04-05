# Plank - 平板支撑助手

专注、高效的平板支撑训练 PWA。

## 功能

- 🕐 **计时系统** — 预设 30s/60s/90s/2min，支持自定义 10-600 秒
- 💨 **呼吸引导** — 4-2-4 节奏（吸气→屏息→呼气）
- 📊 **训练统计** — 今日/本周/累计时长
- 🎉 **完成庆祝** — 粒子动画 + 鼓励文案
- ☁️ **云端同步** — Supabase 匿名认证，离线优先
- 📱 **PWA** — 可添加到主屏幕，离线可用

## 技术栈

- Vanilla HTML/CSS/JS（无框架）
- Vite 构建
- Supabase 后端
- Playwright E2E 测试

## 项目结构

```
├── src/
│   ├── core/
│   │   └── app.js          # 主应用逻辑
│   ├── lib/
│   │   ├── supabase.js     # Supabase 客户端
│   │   ├── auth.js         # 认证模块
│   │   └── database.js     # 数据库操作
│   └── styles/
│       └── main.css        # 样式
├── tests/
│   ├── test-app.js         # 主应用测试
│   └── test-login-flow.js  # 登录流程测试
├── supabase-sql/           # 数据库迁移 SQL
├── index.html              # 入口 HTML
├── sw.js                   # Service Worker
└── manifest.json            # PWA 配置
```

## 开发

```bash
npm install
npm run dev      # 启动开发服务器 (localhost:23366)
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
npm test         # 运行 Playwright 测试
```

## 环境变量

复制 `.env.example` 为 `.env` 并配置：

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 文档

- [功能列表](./FEATURES.md)
- [产品计划](./PLAN.md)
- [AI 代理工作规范](./AGENTS.md)
