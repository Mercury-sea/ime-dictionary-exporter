# 使用 GitHub Pages 发布词库工具

适用于「多平台输入法自定义词库导出器」1.2.0 及以后版本。发布后，使用者可以直接打开网址，在 Mac 或 Windows 浏览器中编辑词库和导出输入法文件，无需安装 Node.js。

本教程中的 `YOUR-USERNAME` 和 `ime-dictionary-exporter` 是示例，请按自己的账号与仓库名替换。当前交付的是发布配置与文件，尚未生成实际 GitHub Pages 网址。

## 推荐：从源码自动构建并发布

### 上传源码

解压 `ime-dictionary-exporter-source-1.2.0.zip`，按 [项目上传GitHub教程](项目上传GitHub教程.md)把源码上传到自己的 GitHub 仓库。公开分享可使用 Public 仓库；GitHub Free 支持公开仓库的 Pages。[GitHub Pages 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

确认仓库里有 `package.json`、`src` 和 `.github/workflows/pages.yml`，默认分支为 `main`。

### 开启 Pages

进入该仓库的 **Settings → Pages**，在 **Build and deployment → Source** 选择 **GitHub Actions**。

不要再粘贴另一份工作流；源码包已经附带完整配置。[自定义工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

### 运行第一次发布

进入 **Actions → Deploy GitHub Pages → Run workflow**，选择 `main`，运行。

工作流会安装依赖、检查类型、运行测试、构建网页，然后发布 `dist`。如果首次上传时因尚未开启 Pages 而失败，完成上一步后重新运行即可。

### 打开网址

等待 `build` 和 `deploy` 都成功。网址会显示在工作流的部署结果和 **Settings → Pages** 中。普通项目通常为：

```text
https://YOUR-USERNAME.github.io/ime-dictionary-exporter/
```

以 GitHub 实际显示的网址为准。打开后确认可以看到词库、拖动方案和下载输入法包。Mac 用户选择目标格式“苹果 · macOS”可导出 `.plist`；文件生成与实际系统导入是两个环节，仍应在自己的设备上试导入。

### 后续更新

以后将修改推送到 `main`，工作流会重新构建并更新同一个网址。无需手动上传 HTML。若使用其他分支，需要同时调整 `pages.yml` 的推送分支和部署条件，并检查 `github-pages` 环境的分支限制。

网站更新不会自动替换 Releases 中的下载包；需要更新下载包时，请另行发布新版本。也不要修改 `dist/index.html` 后指望它覆盖源码：自动发布时会从 `src` 重新生成它。

## pages ZIP 的用途

`ime-dictionary-exporter-pages-1.2.0.zip` 是已构建的静态文件，方便需要手动部署时使用。按上述源码自动发布流程，不需要再上传这个 ZIP，也不需要第二个仓库。仅希望普通用户在线使用时，发布 Pages 即可，Release 是可选的本地下载入口。

## 保存、备份与迁移

访问网址需要下载网页；词库编辑和导出在浏览器中进行，没有用于上传词库的接口。每位使用者保存的是自己浏览器中的词库，修改不会写回 GitHub 仓库，也不会同步给其他人。

网址与下载的本地 HTML 各自保存数据。迁移步骤：原位置点击 **备份 JSON** → 打开新位置 → **批量添加 → 从 JSON 备份恢复**。恢复会替换新位置的全部方案，并恢复备份中的方案顺序。

同一网址正常更新程序会继续读取原有保存数据；修改域名、仓库路径、浏览器或清理数据前应先备份。未启用本地存储时会显示临时会话提示，关闭前请下载 JSON。

网页包含随程序分发的默认词库，发布后这些预置内容可被访问者读取。来源与署名保留在 README 和 [词库来源](词库来源.md)中。

## 常见问题

| 情况 | 检查位置 |
|---|---|
| 找不到 Deploy GitHub Pages | 确认 `pages.yml` 已提交到默认分支；Actions 被禁用时先启用工作流 |
| 提示找不到 Pages 站点 | 在 Settings → Pages 选择 GitHub Actions 后重新运行 |
| 部署权限或环境检查失败 | 保留配置中的 `pages: write`、`id-token: write` 和 `github-pages` 环境，检查仓库策略是否允许 main 部署 |
| build 失败 | 查看第一个失败步骤的日志，解决依赖、类型或测试错误后重新推送 |
| 网址显示 404 | 使用 Pages 设置页给出的地址，确认部署成功；分支发布时检查根目录是否有 `index.html` |
| 打开后仍是旧界面 | 等待本轮部署成功，再刷新页面；本项目没有注册离线缓存服务 |
| 网站修改没有出现在下载包中 | 重新构建并更新 Release 附件，两个发布入口分别更新 |
| 本地文件中的词库没有出现在网址中 | 从本地文件下载完整 JSON，再到网址恢复 |
