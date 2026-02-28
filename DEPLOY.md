# 部署到公网（Vercel）

按下面步骤把「双人减肥打卡记录」部署到公网，你和朋友在不同地方都能用同一地址打开，并通过 Supabase 同步数据。

---

## 方式一：不用 GitHub，直接上传 ZIP（推荐，无需梯子）

适合本机连不上 GitHub 时使用。

### 1. 准备 ZIP（不要包含 node_modules）

**方法 A：在资源管理器中手动排除 node_modules**

1. 打开文件夹：`C:\Users\XingYu\Desktop\双人减肥打卡记录`
2. 按 **Ctrl + A** 全选
3. 按住 **Ctrl**，再点一下 **node_modules** 文件夹，取消勾选它（其他都保持选中）
4. 在选中项上 **右键** → **发送到** → **压缩(zipped)文件夹**
5. 得到 `双人减肥打卡记录.zip`（或你起的名字），记住保存位置

**方法 B：用命令行打 zip（PowerShell）**

在 PowerShell 里执行（会生成到桌面，且自动排除 node_modules）：

```powershell
cd C:\Users\XingYu\Desktop\双人减肥打卡记录
$files = Get-ChildItem -Exclude node_modules
Compress-Archive -Path $files -DestinationPath "C:\Users\XingYu\Desktop\double-checkin.zip" -Force
```

桌面会多一个 `double-checkin.zip`。

---

### 2. 在 Vercel 上传并部署

1. 打开 [vercel.com](https://vercel.com)，用 **邮箱** 或 GitHub 登录
2. 点右上角 **Add New…** → **Project**
3. 在页面里找 **“Deploy without Git”** 或 **“Upload”** 或 **“Continue with ZIP”** 等入口（若只看到 Git 仓库列表，往下滚动或看上方 Tab 是否有 “Upload”）
4. **上传** 刚准备好的 zip 文件（拖进去或点选文件）
5. 项目名称可保持默认（如 `double-checkin`）
6. **Framework Preset** 选 **Vite**；**Build Command** 留空或填 `npm run build`；**Output Directory** 填 `dist`
7. **先不要点 Deploy**，先配置环境变量（见下一步）；若已经点了 Deploy，部署完再补环境变量并 Redeploy 即可

---

### 3. 配置环境变量（Supabase）

**若在上传页有 “Environment Variables” 或 “Configure”：**

- 点开，添加两条：

| 名称 Name | 值 Value |
|-----------|----------|
| `VITE_SUPABASE_URL` | 你的 Supabase 项目 URL，如 `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | 你的 Supabase **anon public** 密钥（一长串字符） |

- 环境选择 **Production**（或全选），保存后再点 **Deploy**。

**若上传时没有环境变量入口，部署完成后：**

1. 进入该项目的 **Dashboard**
2. 顶部点 **Settings** → 左侧 **Environment Variables**
3. 添加同上两条变量（Name / Value）
4. 保存后，点 **Deployments** → 最新一次部署右侧 **⋯** → **Redeploy**，勾选 **Use existing Build Cache** 可省略，直接 **Redeploy**

---

### 4. 拿到链接并分享

- 部署成功后，在 **Deployments** 里点开最新一次，或项目首页会显示 **Visit** 链接，例如：`https://double-checkin-xxx.vercel.app`
- 把这个链接发给朋友；你俩都打开同一链接，你点「邀请伙伴」拿邀请码，朋友点「加入伙伴」输入邀请码即可绑定。

---

## 方式二：通过 GitHub 部署（需能访问 GitHub）

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
