Dream Diary Backend (Rebuilt)

运行步骤

1. 在 backend 目录创建 .env（或直接用默认值）：

PORT=3000
JWT_SECRET=changeme
DB_FILE=./backend/data/dreams.sqlite
CLIENT_ORIGIN=http://localhost:5173

2. 安装与启动：

cd backend
npm install --registry=https://registry.npmjs.org
npm run dev

数据库结构（课程设计）

- users：用户
- dreams：文章/梦境，外键 users(id)
- tags：标签词表
- dream_tags：多对多关联（dreams↔tags）
- comments：评论（dream_id, user_id 外键）
- reactions：点赞/表情（去重约束）
- attachments：附件（仅存文件路径/URL）

主要接口

- POST /auth/register  注册
- POST /auth/login     登录
- GET  /dreams         列表（鉴权）
- GET  /dreams/:id     详情
- POST /dreams         新建（含标签）
- PUT  /dreams/:id     更新（含标签替换）
- DELETE /dreams/:id   删除
- GET  /tags           标签+使用次数
- POST /tags           新建标签
- GET  /comments/dream/:dreamId   某梦境评论
- POST /comments       新增评论（dream_id, content）
- DELETE /comments/:id 删除评论（作者）


