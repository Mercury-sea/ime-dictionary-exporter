# 使用 PowerShell 和 Git 上传项目到 GitHub

这是一份适用于不同项目的 Windows 教程：把电脑上的项目上传到 GitHub，之后继续提交更新；需要提供下载文件时，再创建发行版。适用于 Windows PowerShell 5.1 和较新的 PowerShell，无需管理员权限。

**仅上传文件需要 Git 和 GitHub 账号。** 是否需要 Python、Node.js 或其他开发工具，取决于项目本身的运行与构建要求。

示例统一使用 `D:\Projects\my-project` 和 `https://github.com/YOUR-USERNAME/my-project.git`。请替换为自己的实际目录及仓库地址。逐段执行，遇到报错先处理，再继续；不要复制终端前面的 `PS D:\...>` 提示符。

## 准备 Git

从 [Git for Windows 官网](https://gitforwindows.org/) 安装 Git，保留 Git Credential Manager（GCM）。安装后重新打开 PowerShell：

```powershell
git --version
```

出现版本号即可。如果提示无法识别 `git`，先重新打开终端，再检查安装和 PATH。

## 选择适合自己的入口

| 当前情况 | 从哪里开始 |
|---|---|
| 本地有项目文件，尚未使用 Git，GitHub 也没有对应仓库 | 按下文依次操作 |
| 本地项目已有 Git 记录 | 进入项目后先执行 `git status`、`git branch --show-current` 和 `git remote -v`，保留已有历史，跳过初始化 |
| GitHub 已有项目，想下载后继续编辑 | 使用下方的克隆步骤，再看“日常更新” |

已有 GitHub 仓库时，在用于存放项目的文件夹中克隆：

```powershell
Set-Location 'D:\Projects'
git clone 'https://github.com/YOUR-USERNAME/my-project.git'
Set-Location '.\my-project'
```

`git clone` 会创建项目文件夹并配置 `origin`，不必再次初始化或添加同名远程。推送需要对应仓库的写入权限。

## 进入本地项目目录

以下主流程以首次上传本地项目为例：

```powershell
Set-Location 'D:\Projects\my-project'
Get-ChildItem -Force
```

确认这里是整个项目的根目录。路径有中文或空格也放在英文单引号内。若只看到一个同名文件夹，需要再进入一层。

## 在 GitHub 创建空仓库

打开 [GitHub 新建仓库页面](https://github.com/new)，填写仓库名，例如 `my-project`。希望公开下载选择 `Public`，只供自己或获授权者访问选择 `Private`。

首次上传已有本地项目时，**不要让 GitHub 自动创建 README、.gitignore 或许可证文件**。创建完成后复制 HTTPS 仓库地址。这种空仓库流程与 [GitHub 官方上传说明](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)一致。

## 初始化 Git 并设置提交署名

在项目根目录执行：

```powershell
git init -b main
```

仅未使用 Git 的项目需要这一步。已有仓库请用 `git branch --show-current` 查看当前分支，后续命令中的 `main` 按实际分支替换。

为当前项目设置作者信息：

```powershell
git config user.name '妳希望显示的署名'
git config user.email '妳的提交邮箱'
```

这是提交记录中的署名，不是登录凭据。可从 GitHub **Settings → Emails** 复制自己的完整 `noreply` 邮箱。以上设置只影响当前仓库；详见 [提交署名](https://docs.github.com/en/get-started/git-basics/setting-your-username-in-git)及 [提交邮箱](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)说明。

## 选择文件并保存第一次提交

先检查项目已有的 `.gitignore`，它规定哪些未跟踪文件不加入 Git。没有时可在编辑器中新建，按项目需要填写；例如：

```gitignore
.env
.env.*
!.env.example
*.log
```

上述示例用于忽略本地环境配置与日志；只有不含实际密钥的 `.env.example` 才适合保留。依赖目录、构建产物和个人数据是否排除，应按项目要求决定，已有 `.gitignore` 不必覆盖。忽略规则不会自动移除已被 Git 跟踪的文件。

查看本次文件：

```powershell
git status --short
```

确认后加入暂存区，再核对文件清单与修改内容：

```powershell
git add .
git diff --cached --stat
git diff --cached
```

长内容进入翻页界面时按 `q` 退出。若误加入了文件，第一次提交前可以用下方命令取消跟踪，磁盘上的文件仍保留；随后补充忽略规则：

```powershell
git rm --cached -- '不需要提交的文件名'
```

保存本地版本：

```powershell
git commit -m '首次提交项目'
```

此时只是保存到了本地 Git，尚未上传到 GitHub。

## 连接远程仓库并上传

把地址换成刚才从 GitHub 复制的真实地址：

```powershell
git remote add origin 'https://github.com/YOUR-USERNAME/my-project.git'
git remote -v
```

核对地址后上传：

```powershell
git push -u origin main
```

`origin` 是远程仓库在本地的简称；`-u` 设置当前分支对应的远程分支，以后通常直接执行 `git push` 即可。

首次推送可能打开浏览器或 GCM 登录窗口。按提示登录有该仓库权限的账号，无需把 GitHub 密码写入命令。[GitHub 凭据管理说明](https://docs.github.com/en/get-started/git-basics/caching-your-github-credentials-in-git)

刷新 GitHub 仓库页面，检查文件和 README，再执行：

```powershell
git status
```

工作区没有待提交修改、分支与远程同步，即完成上传。上传源码后是否能直接运行，还取决于项目的使用说明。

## 日常更新

在原项目文件夹修改文件后，检查并提交：

```powershell
git status --short
git diff
```

确认改动符合预期，再执行：

```powershell
git add .
git diff --cached --stat
git commit -m '说明这次修改了什么'
git push
```

无需重复 `git init`、`git remote add` 或克隆。提交说明应描述实际改动。

如果也在 GitHub 网页、另一台电脑或与别人共同编辑，开始工作前先确认 `git status` 显示工作区干净，再同步远程更新：

```powershell
git pull --ff-only
```

若提示无法快进，说明本地与远程分别有新提交，需要先处理分支合并；这时不要继续套用首次上传流程。推送因远程更新被拒绝时，也应先检查双方提交。

## 可选：通过 Releases 提供下载文件

需要让使用者下载安装包、编译结果或整理好的 ZIP 时，在仓库的 **Releases** 页面创建发行版：选择或新建标签（例如 `v1.0.0`），选择包含对应源码的目标分支或提交，填写标题与版本说明，附上文件，然后发布。附件未准备好时先保存草稿。[GitHub 发行版说明](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

GitHub 自动生成的 `Source code` 压缩包是该标签下的源码。项目需要构建时，应另外上传构建好的使用包。后续 `git push` 不会自动替换已发布的附件；源码、版本标签与附件应对应同一版本。

## 常见问题

| 提示 | 处理方式 |
|---|---|
| `git` 无法识别 | 安装 Git 后重新打开 PowerShell，检查 PATH |
| `not a git repository` | 核对当前目录；仅首次创建本地仓库才需要初始化 |
| `Author identity unknown` | 设置当前仓库的 `user.name` 和 `user.email`，再提交 |
| `src refspec main does not match any` | 用 `git log -1`、`git branch --show-current` 检查是否已有提交、分支名是否正确 |
| `remote origin already exists` | 用 `git remote -v` 检查；正确则直接推送，需要更正时使用下面的命令 |
| `Repository not found` | 检查仓库地址、仓库是否存在以及账号是否有权限 |
| `Authentication failed` | 检查 GCM 登录的账号；GitHub 网页密码不能直接用作 Git HTTPS 密码 |
| `nothing to commit, working tree clean` | 没有新的修改需要提交；已有提交仍可推送 |
| 推送被拒绝，提示远程有新提交 | 已有关联历史时先获取、检查远程更新；首次上传若误建了带 README 的仓库，可克隆它，把项目文件复制进去（不复制原来的 `.git`），再提交 |
| 连接超时 | 本地提交仍在，网络恢复后再次推送即可 |

更正已有远程地址：

```powershell
git remote set-url origin 'https://github.com/YOUR-USERNAME/my-project.git'
git remote -v
```

本教程不要求强制推送、删除仓库或修改 PowerShell 执行策略。
