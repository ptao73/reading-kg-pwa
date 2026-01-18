# 给 Claude Code 的完整项目创建指令

Claude Code，请帮我创建 Reading KG PWA 项目的所有文件。我已经有完整的代码，你只需要按照我提供的内容创建文件即可（不需要重写代码）。

## 步骤 1: 创建项目结构

```bash
mkdir reading-kg-pwa
cd reading-kg-pwa
mkdir -p src/app/login src/app/auth/callback src/components src/lib src/types
mkdir -p public supabase/migrations sync-script docs scripts .github/workflows
```

## 步骤 2: 创建所有文件

我会分批提供文件内容，请严格按照我提供的内容创建，不要修改。

### 第一批：配置文件

请创建以下文件（我会在后续消息中提供每个文件的完整内容）：

1. package.json
2. next.config.js
3. tsconfig.json
4. .gitignore
5. .env.example

### 第二批：数据库

6. supabase/migrations/20240101000000_initial_schema.sql

### 第三批：TypeScript 类型

7. src/types/database.ts

### 第四批：核心库文件

8. src/lib/supabase.ts
9. src/lib/auth-context.tsx
10. src/lib/events.ts
11. src/lib/books.ts
12. src/lib/offline-queue.ts

### 第五批：React 组件

13. src/components/ReadingFlow.tsx
14. src/components/BookSelector.tsx
15. src/components/EndedDialog.tsx
16. src/components/SyncStatus.tsx

### 第六批：应用页面

17. src/app/layout.tsx
18. src/app/page.tsx
19. src/app/globals.css
20. src/app/login/page.tsx
21. src/app/auth/callback/page.tsx

### 第七批：PWA 配置

22. public/manifest.json
23. public/404.html

### 第八批：Python 同步脚本

24. sync-script/sync.py
25. sync-script/requirements.txt
26. sync-script/.env.example

### 第九批：GitHub Actions

27. .github/workflows/deploy.yml

### 第十批：文档

28. README.md
29. YOUR_DEPLOYMENT_GUIDE.md

准备好了吗？请回复 "ready"，我将逐个提供文件内容。
