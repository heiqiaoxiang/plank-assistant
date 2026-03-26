# Supabase SQL 执行指南

## 执行顺序

| 顺序 | 文件 | 说明 |
|------|------|------|
| 1 | `01-schema.sql` | 创建表结构 |
| 2 | `02-rls.sql` | 配置行级安全策略 |
| 3 | `03-triggers.sql` | 创建触发器 |
| 4 | `04-functions.sql` | 创建排行榜函数 |

## 执行步骤

1. 登录 Supabase Dashboard → SQL Editor → New Query
2. 按顺序执行每个 SQL 文件，点击 Run
3. 启用匿名登录：Authentication → Providers → Anonymous logins → Enable
4. 获取密钥：Settings → API → 复制 Project URL 和 anon public key

## 验证

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

应看到：`profiles`, `sessions`, `user_stats`, `leaderboard`

## 排行榜刷新

```sql
SELECT refresh_leaderboard();
```

或设置定时任务（Supabase → Database → Cron Jobs）：每小时执行一次