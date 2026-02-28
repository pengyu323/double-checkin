# 双人减肥打卡记录

两人互相监督的减肥打卡应用：每日打卡、互评、统计与成就。支持**异地好友**通过邀请码绑定，数据同步到云端。

## 功能概览

- **用户与伙伴**：昵称登录、邀请码绑定/加入伙伴、解绑（可异地）
- **每日打卡**：体重、体脂、运动、饮食、饮水量、睡眠、心情（当天有效，可修改当日）
- **互评**：次日对伙伴昨日打卡做 1–5 星完成度/努力度评分与评语
- **动态/对比**：打卡日历、本月统计、累计减重；双方对比、评分趋势
- **消息**：系统通知、待评分、历史评分
- **个人中心**：统计、成就墙、设置（解绑等）

## 技术栈

- React 18 + TypeScript、Vite、React Router 6
- **无配置**：仅用 localStorage，本地演示
- **配置 Supabase**：云端存储，两人异地通过邀请码真实绑定、数据同步

---

## 一、仅本地运行（不接 Supabase）

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173 ，输入昵称即可使用。邀请/加入伙伴为模拟，数据仅存本机。

---

## 二、接入 Supabase（异地好友真实绑定）

### 1. 创建项目

1. 打开 [supabase.com](https://supabase.com) 注册/登录，新建项目。
2. 进入 **Project Settings → API**，记下：
   - **Project URL**
   - **anon public** key

### 2. 开启匿名登录

在 Supabase 控制台：**Authentication → Providers → Anonymous**，打开 **Enable Anonymous Sign-In**。

### 3. 执行建表 SQL

在 **SQL Editor** 中新建查询，把项目里 `supabase/migrations/001_initial.sql` 的完整内容粘贴进去，点击 **Run**。这会创建表并配置行级安全(RLS)。

### 4. 配置前端环境变量

在项目根目录复制环境变量示例并填写：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon公钥
```

### 5. 启动前端

```bash
npm install
npm run dev
```

打开 http://localhost:5173 后：

- 两人各自用**不同设备/浏览器**打开，分别输入昵称进入。
- 其中一人点「邀请伙伴」，把**邀请码**发给对方。
- 对方点「加入伙伴」，输入该邀请码并「确认绑定」。
- 绑定后即可互相看到打卡与评分，数据在 Supabase 中同步。

---

## 构建与部署

```bash
npm run build
npm run preview
```

**部署到公网（两人异地使用）**：详见 **[DEPLOY.md](./DEPLOY.md)**，按步骤把项目推到 GitHub，用 Vercel 部署并配置 Supabase 环境变量即可。部署后把生成的链接发给朋友，对方打开同一链接、输入你的邀请码即可绑定。

---

## 说明

- 未配置 Supabase 时，应用自动使用本地模式，行为与原先一致。
- 配置 Supabase 后，登录为匿名登录，每人一个唯一邀请码，仅用于伙伴绑定，不涉及手机号或邮箱。
- 界面为移动端优先，主色活力橙 + 绿色，底部四栏：首页、动态、消息、我的。
