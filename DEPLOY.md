# 部署到公网（Vercel）

按下面步骤把「双人减肥打卡记录」部署到公网，你和朋友在不同地方都能用同一地址打开，并通过 Supabase 同步数据。

---

## 前提

- 已按 README 配置好 **Supabase**（建表、匿名登录、拿到 URL 和 anon key）
- 本机已安装 **Git**（可从 [git-scm.com](https://git-scm.com) 下载）

---

## 一、把代码放到 GitHub

### 1. 在 GitHub 新建仓库

1. 打开 [github.com](https://github.com) 并登录
2. 右上角 **+** → **New repository**
3. 仓库名随意（如 `double-checkin`），选 **Public**，不勾选 “Add a README”
4. 点 **Create repository**

### 2. 在项目目录用 Git 推送

在 **命令提示符** 里进入项目目录，然后执行（把 `你的用户名` 和 `仓库名` 换成你自己的）：

```bash
cd C:\Users\XingYu\Desktop\双人减肥打卡记录

git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

首次推送若提示登录，按提示用 GitHub 账号或 Personal Access Token 即可。

---

## 二、用 Vercel 部署

### 1. 登录 Vercel

打开 [vercel.com](https://vercel.com)，用 GitHub 账号登录并授权。

### 2. 导入项目

1. 点 **Add New…** → **Project**
2. 在 **Import Git Repository** 里找到刚推送的仓库，点 **Import**

### 3. 配置构建设置（一般不用改）

- **Framework Preset**：选 **Vite**
- **Build Command**：`npm run build`
- **Output Directory**：`dist`
- **Install Command**：`npm install`

直接点 **Deploy** 会先部署一版，但还没有 Supabase，所以接下来要加环境变量再重新部署。

### 4. 配置 Supabase 环境变量

1. 在 Vercel 里打开你的项目
2. 顶部点 **Settings** → 左侧 **Environment Variables**
3. 添加两条（Production、Preview、Development 都可勾选）：

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | 你的 Supabase 项目 URL（如 `https://xxxx.supabase.co`） |
| `VITE_SUPABASE_ANON_KEY` | 你的 Supabase anon 公钥 |

4. 保存后，点 **Deployments** → 最新一次部署右侧 **⋯** → **Redeploy**，确认再部署一次

---

## 三、使用与分享

1. 部署完成后，Vercel 会给你一个地址，例如：  
   `https://double-checkin-xxx.vercel.app`
2. **你自己**：浏览器打开这个地址，输入昵称进入，点「邀请伙伴」，记下**邀请码**
3. **你朋友**：在**不同地方**用手机或电脑浏览器打开**同一个地址**，输入昵称进入，点「加入伙伴」，输入你的邀请码并确认绑定
4. 之后两人都能在同一程序里打卡、互评，数据在 Supabase 里同步

---

## 常见问题

- **打开页面空白**：检查 Vercel 的 Environment Variables 是否填对，且重新 Redeploy 过一次。
- **邀请码无效 / 绑定失败**：确认 Supabase 里已执行 `001_initial.sql`，且已开启 Anonymous 登录。
- **想用自己域名**：在 Vercel 项目 **Settings → Domains** 里添加域名并按提示解析即可。
