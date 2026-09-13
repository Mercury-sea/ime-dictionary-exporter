# 发布本项目：简版

项目：多平台输入法自定义词库导出器 / **Multi-platform IME Custom Dictionary Exporter**。建议仓库名：`ime-dictionary-exporter`。

你已经会创建仓库和上传文件，只需要区分以下三个入口：

| 入口 | 放什么、给谁用 |
|---|---|
| 仓库源码 | 可修改的程序；其他人可以下载、修改、构建 |
| GitHub Pages | 已构建的网页；普通用户直接打开网址使用 |
| Release | 某个版本的发布页；可以附上可直接使用的 ZIP，按需提供 |

**Pages 不依赖 Release，也不需要另开仓库。** Release 依据标签对应到某个版本的源码；GitHub 会自动附上该版本的源码下载链接，其他附件由维护者上传。[GitHub Release 说明](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)

## 你现在怎么发

1. 解压 `ime-dictionary-exporter-source-1.2.0.zip`，把里面的项目文件上传到同一个源码仓库的 `main` 分支。
2. 在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 在 **Actions → Deploy GitHub Pages** 手动运行一次，成功后使用 GitHub 显示的网址。之后推送 `main` 会自动更新网页。[Pages 工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

做到这里，别人就能通过网址使用，已经可以分享。

## 想提供本地下载时，再发 Release

在同一仓库创建 Release，标签例如 `v1.2.0`，对应此次上传的代码，附上 `ime-dictionary-exporter-offline-1.2.0.zip`。使用者解压后双击“打开词库.html”即可。

不必再手动上传一份 source ZIP，GitHub 会自动提供该标签下的源码压缩包；采用上面的自动部署时，也不必上传 pages ZIP。

只有想把完整的三包构建结果都留作附件时，才需要把它们全部上传。`SHA256SUMS.txt` 记录了三份配套包的校验和。

## 只让用户下载源码，也可以吗？

可以。但当前源码包没有构建好的 HTML，使用者需要安装 Node.js 22 或以上版本，在源码根目录执行：

```powershell
npm.cmd ci
npm.cmd run build
```

再打开 `dist/index.html`。以上是 Windows PowerShell 命令；Mac 终端使用 `npm ci`、`npm run build`。

如果希望“下载源码 ZIP 后也能直接打开”，也可以把构建好的 HTML 提交到仓库；以后更新程序时需同步更新它。当前项目默认通过 Pages 或 Release 使用包提供成品。

更详细的步骤见 [GitHubPages发布教程](GitHubPages发布教程.md)；Git 命令操作见 [PowerShell-Git上传GitHub说明书](PowerShell-Git上传GitHub说明书.md)。
