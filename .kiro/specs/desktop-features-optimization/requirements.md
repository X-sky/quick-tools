# 需求文档

## 简介

桌面端应用（Tauri 2.x + React 18）的三个核心功能页面（JSON Formatter、QR Code Generator、Web Export）目前仅为 placeholder 级别实现。本需求旨在充分利用桌面端特性（原生文件系统、大窗口空间、系统剪贴板深度集成、无浏览器限制的 HTTP 访问、本地持久化存储），将三个功能升级为生产可用的完整实现。

## 术语表

- **Desktop_App**: 基于 Tauri 2.x 构建的桌面端应用程序
- **JSON_Editor**: 桌面端 JSON 格式化页面中的代码编辑器组件，提供语法高亮和编辑功能
- **QR_Renderer**: 桌面端二维码生成页面中负责将文本内容渲染为二维码图像的组件
- **Web_Exporter**: 桌面端网页导出页面中负责提取网页内容并转换为目标格式的模块
- **Content_Extractor**: 平台适配层中负责从 URL 提取网页正文内容的接口实现
- **File_Downloader**: 平台适配层中负责文件保存（含对话框选择路径）的接口实现
- **Clipboard_Access**: 平台适配层中负责系统剪贴板读写的接口实现
- **Storage_Adapter**: 平台适配层中负责本地持久化存储的接口实现
- **Turndown_Converter**: 将 HTML 内容转换为 Markdown 格式的转换器（基于 Turndown 库）
- **CodeMirror_Editor**: 基于 CodeMirror 6 的代码编辑器，提供语法高亮、折叠、搜索等功能
- **Diff_Viewer**: 用于对比两段 JSON 文本差异的可视化组件

## 需求

### 需求 1: JSON Formatter — CodeMirror 编辑器集成

**用户故事:** 作为桌面端用户，我希望使用带语法高亮的专业代码编辑器来编辑 JSON，以便获得比纯文本框更好的编辑体验。

#### 验收标准

1. THE JSON_Editor SHALL 使用 CodeMirror 6 替代当前的 textarea，提供 JSON 语法高亮显示
2. THE JSON_Editor SHALL 提供代码折叠功能，允许用户折叠和展开 JSON 对象及数组节点
3. THE JSON_Editor SHALL 提供行号显示
4. THE JSON_Editor SHALL 提供括号匹配高亮
5. THE JSON_Editor SHALL 提供基于 Ctrl+F / Cmd+F 的搜索和替换功能
6. THE JSON_Editor SHALL 支持暗色模式，跟随系统主题自动切换

### 需求 2: JSON Formatter — 分栏布局与实时预览

**用户故事:** 作为桌面端用户，我希望在左侧编辑 JSON 的同时在右侧实时看到格式化结果，以便利用桌面端的大窗口空间提高工作效率。

#### 验收标准

1. THE Desktop_App SHALL 在 JSON Formatter 页面采用左右分栏布局，左侧为输入编辑器，右侧为格式化输出编辑器
2. WHEN 用户在左侧编辑器中修改内容, THE JSON_Editor SHALL 在 300ms 内自动更新右侧的格式化结果
3. WHEN 输入内容包含语法错误, THE JSON_Editor SHALL 在错误位置显示红色下划线标记，并在编辑器底部显示错误信息
4. THE JSON_Editor SHALL 提供可拖拽的分栏分隔条，允许用户调整左右面板宽度比例

### 需求 3: JSON Formatter — Diff 对比功能

**用户故事:** 作为桌面端用户，我希望对比两段 JSON 的差异，以便快速发现配置文件或 API 响应的变化。

#### 验收标准

1. WHEN 用户点击"Diff 对比"按钮, THE JSON_Editor SHALL 切换到 Diff 模式，显示左右两个编辑器用于输入待对比的 JSON
2. THE Diff_Viewer SHALL 以行级别高亮显示两段 JSON 之间的差异（新增行为绿色，删除行为红色，修改行为黄色）
3. WHEN 用户点击"退出对比"按钮, THE JSON_Editor SHALL 恢复到正常的编辑/预览分栏模式

### 需求 4: JSON Formatter — 文件系统集成

**用户故事:** 作为桌面端用户，我希望直接从文件系统打开和保存 JSON 文件，以便无需手动复制粘贴。

#### 验收标准

1. WHEN 用户将 JSON 文件拖拽到编辑器区域, THE JSON_Editor SHALL 读取文件内容并加载到输入编辑器中
2. WHEN 用户点击"打开文件"按钮, THE Desktop_App SHALL 弹出文件选择对话框（过滤 .json 文件），并将选中文件内容加载到编辑器
3. WHEN 用户点击"保存文件"按钮, THE File_Downloader SHALL 弹出保存对话框，将当前格式化结果保存为 .json 文件
4. WHEN 用户通过 Ctrl+S / Cmd+S 快捷键触发保存, THE File_Downloader SHALL 执行保存操作
5. IF 文件读取失败, THEN THE Desktop_App SHALL 显示包含错误原因的提示信息

### 需求 5: JSON Formatter — 剪贴板集成

**用户故事:** 作为桌面端用户，我希望一键复制格式化结果到剪贴板，以便快速在其他应用中使用。

#### 验收标准

1. WHEN 用户点击"复制结果"按钮, THE Clipboard_Access SHALL 将右侧格式化结果写入系统剪贴板
2. WHEN 复制成功, THE Desktop_App SHALL 显示短暂的成功提示（持续 2 秒后自动消失）
3. WHEN 用户点击"从剪贴板粘贴"按钮, THE Desktop_App SHALL 读取系统剪贴板文本内容并加载到输入编辑器

### 需求 6: QR Code Generator — 二维码渲染

**用户故事:** 作为桌面端用户，我希望输入文本后能看到实际生成的二维码图像，以便确认内容正确并使用。

#### 验收标准

1. WHEN 用户输入内容并点击"生成"按钮, THE QR_Renderer SHALL 将输入文本渲染为二维码 SVG 图像并显示在页面中
2. THE QR_Renderer SHALL 支持配置二维码尺寸（128px、256px、512px 三档可选）
3. THE QR_Renderer SHALL 支持配置纠错等级（L、M、Q、H 四级可选）
4. WHEN 输入内容超过二维码容量限制, THE QR_Renderer SHALL 显示明确的错误提示，说明内容过长
5. THE QR_Renderer SHALL 在二维码下方显示当前编码内容的字符数和预估容量占比

### 需求 7: QR Code Generator — 二维码导出与剪贴板

**用户故事:** 作为桌面端用户，我希望将生成的二维码保存为图片文件或复制到剪贴板，以便在其他场景中使用。

#### 验收标准

1. WHEN 用户点击"保存为 PNG"按钮, THE File_Downloader SHALL 弹出保存对话框，将当前二维码导出为 PNG 文件
2. WHEN 用户点击"保存为 SVG"按钮, THE File_Downloader SHALL 弹出保存对话框，将当前二维码导出为 SVG 文件
3. WHEN 用户点击"复制到剪贴板"按钮, THE Clipboard_Access SHALL 将当前二维码的 PNG 图像数据写入系统剪贴板
4. WHEN 导出或复制成功, THE Desktop_App SHALL 显示短暂的成功提示

### 需求 8: QR Code Generator — 批量生成

**用户故事:** 作为桌面端用户，我希望一次性为多条内容生成二维码并批量导出，以便高效处理大量二维码需求。

#### 验收标准

1. WHEN 用户切换到"批量模式", THE Desktop_App SHALL 显示多行文本输入区域，每行一条内容
2. WHEN 用户点击"批量生成"按钮, THE QR_Renderer SHALL 为每行非空内容生成对应的二维码，并以网格形式展示预览
3. WHEN 用户点击"批量导出"按钮, THE File_Downloader SHALL 弹出文件夹选择对话框，将所有二维码保存为独立的 PNG 文件到选定目录
4. THE Desktop_App SHALL 在批量导出过程中显示进度指示（已完成数/总数）
5. IF 批量内容中某一行超过容量限制, THEN THE QR_Renderer SHALL 在该行对应位置标记错误，并继续处理其余行

### 需求 9: QR Code Generator — 历史记录持久化

**用户故事:** 作为桌面端用户，我希望生成历史能持久化保存并支持搜索，以便随时找回之前生成过的二维码。

#### 验收标准

1. WHEN 用户生成一个新的二维码, THE Storage_Adapter SHALL 将该记录持久化到本地存储
2. THE Desktop_App SHALL 在侧边栏显示历史记录列表，按时间倒序排列
3. WHEN 用户在历史记录搜索框中输入关键词, THE Desktop_App SHALL 实时过滤显示包含该关键词的历史记录
4. WHEN 用户点击历史记录中的某一条, THE QR_Renderer SHALL 重新渲染该条记录对应的二维码
5. WHEN 用户点击历史记录条目的删除按钮, THE Storage_Adapter SHALL 从本地存储中移除该条记录

### 需求 10: Web Export — HTML 转 Markdown（Turndown 集成）

**用户故事:** 作为桌面端用户，我希望导出的 Markdown 是从 HTML 正确转换而来的结构化内容，而非纯文本。

#### 验收标准

1. WHEN Content_Extractor 从 URL 提取到 HTML 内容, THE Turndown_Converter SHALL 将 HTML 转换为格式正确的 Markdown
2. THE Turndown_Converter SHALL 保留标题层级（h1-h6 转为对应的 # 标记）
3. THE Turndown_Converter SHALL 保留链接（a 标签转为 `[text](url)` 格式）
4. THE Turndown_Converter SHALL 保留图片引用（img 标签转为 `![alt](src)` 格式）
5. THE Turndown_Converter SHALL 保留代码块（pre/code 标签转为围栏代码块）
6. THE Turndown_Converter SHALL 保留列表结构（ul/ol 转为对应的 Markdown 列表）
7. FOR ALL 有效的 HTML 输入, 经 Turndown_Converter 转换后的 Markdown 再经 Markdown 解析器解析 SHALL 保留原始文档的语义结构（round-trip 语义等价性）

### 需求 11: Web Export — 实时预览

**用户故事:** 作为桌面端用户，我希望在导出前预览提取到的内容，以便确认内容正确再保存。

#### 验收标准

1. WHEN Content_Extractor 成功提取页面内容, THE Web_Exporter SHALL 在页面右侧显示提取内容的 Markdown 渲染预览
2. THE Desktop_App SHALL 在 Web Export 页面采用左右分栏布局，左侧为 URL 输入和操作区，右侧为内容预览区
3. THE Web_Exporter SHALL 在预览区顶部显示提取到的元信息（标题、作者、摘要、抓取时间）
4. WHEN 用户切换预览模式（Markdown 源码 / 渲染预览）, THE Web_Exporter SHALL 在两种视图之间切换显示

### 需求 12: Web Export — PDF 导出

**用户故事:** 作为桌面端用户，我希望将网页内容导出为排版良好的 PDF 文件，以便离线阅读和分享。

#### 验收标准

1. WHEN 用户点击"导出 PDF"按钮, THE Web_Exporter SHALL 将提取的内容渲染为 PDF 格式并通过 File_Downloader 保存
2. THE Web_Exporter SHALL 在 PDF 中保留标题、正文段落、列表、代码块的排版结构
3. THE Web_Exporter SHALL 在 PDF 首页包含文章标题、来源 URL 和抓取时间
4. THE Web_Exporter SHALL 支持 A4 纸张尺寸的 PDF 输出
5. IF PDF 渲染失败, THEN THE Desktop_App SHALL 显示包含错误原因的提示信息

### 需求 13: Web Export — PNG 导出

**用户故事:** 作为桌面端用户，我希望将网页内容导出为长图 PNG，以便在社交媒体或即时通讯中分享。

#### 验收标准

1. WHEN 用户点击"导出 PNG"按钮, THE Web_Exporter SHALL 将提取的内容渲染为 PNG 图像并通过 File_Downloader 保存
2. THE Web_Exporter SHALL 生成宽度固定（默认 800px）、高度自适应内容的长图
3. THE Web_Exporter SHALL 在 PNG 图像顶部包含文章标题和来源信息
4. WHEN 用户点击"复制 PNG 到剪贴板"按钮, THE Clipboard_Access SHALL 将渲染的 PNG 图像数据写入系统剪贴板
5. IF PNG 渲染失败, THEN THE Desktop_App SHALL 显示包含错误原因的提示信息

### 需求 14: Web Export — 批量 URL 导出

**用户故事:** 作为桌面端用户，我希望一次性导出多个网页，以便批量收集和归档网页内容。

#### 验收标准

1. WHEN 用户切换到"批量模式", THE Desktop_App SHALL 显示多行 URL 输入区域，每行一个 URL
2. WHEN 用户点击"批量导出"按钮, THE Web_Exporter SHALL 依次提取每个 URL 的内容并导出为用户选定的格式
3. THE Desktop_App SHALL 在批量导出过程中显示进度指示（已完成数/总数/当前处理的 URL）
4. IF 批量导出中某个 URL 提取失败, THEN THE Web_Exporter SHALL 记录该错误并继续处理剩余 URL
5. WHEN 批量导出完成, THE Desktop_App SHALL 显示导出结果摘要（成功数、失败数、失败 URL 列表）

### 需求 15: Web Export — 导出历史与本地存储

**用户故事:** 作为桌面端用户，我希望查看之前的导出记录，以便快速重新导出或查找之前保存的内容。

#### 验收标准

1. WHEN 用户成功导出一个网页, THE Storage_Adapter SHALL 将导出记录（URL、标题、格式、时间）持久化到本地存储
2. THE Desktop_App SHALL 在 Web Export 页面显示导出历史列表，按时间倒序排列
3. WHEN 用户点击历史记录中的某一条, THE Web_Exporter SHALL 将该 URL 填入输入框并重新提取内容
4. WHEN 用户点击历史记录条目的删除按钮, THE Storage_Adapter SHALL 从本地存储中移除该条记录
