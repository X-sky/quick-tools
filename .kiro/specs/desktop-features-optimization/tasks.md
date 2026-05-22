# Implementation Plan: Desktop Features Optimization

## Overview

将桌面端应用（Tauri 2.x + React 18 + Vite + Tailwind CSS）的三个核心功能页面（JSON Formatter、QR Code Generator、Web Export）从 placeholder 升级为生产可用的完整实现。实现策略为：先搭建共享基础设施（通用组件、hooks、lib 工具），再并行实现三个功能页面，最后集成验证。

## Tasks

- [x] 1. 搭建共享基础设施（通用组件、hooks、lib 工具）
  - [x] 1.1 安装新增依赖并配置 vitest 测试环境
    - 在 `apps/desktop/package.json` 中添加所有新增依赖（CodeMirror 6 套件、turndown、marked、satori、resvg-wasm、pdf-lib、qrcode.react、fast-check、vitest）
    - 创建 `apps/desktop/vitest.config.ts` 配置文件
    - _Requirements: 全部（基础设施）_

  - [x] 1.2 实现 ResizableSplitPane 可拖拽分栏组件
    - 创建 `apps/desktop/src/components/ResizableSplitPane.tsx`
    - 通过 CSS flex-basis + pointer 事件实现拖拽调整
    - 支持 horizontal/vertical 方向、defaultRatio、minRatio、maxRatio 配置
    - _Requirements: 2.4, 11.2_

  - [x] 1.3 实现 Toast 轻量提示组件和 useToast hook
    - 创建 `apps/desktop/src/components/Toast.tsx`
    - 创建 `apps/desktop/src/hooks/useToast.ts`
    - 支持 success/error/info 类型，默认 2000ms 自动消失
    - _Requirements: 5.2, 7.4_

  - [x] 1.4 实现 useDebounce hook
    - 创建 `apps/desktop/src/hooks/useDebounce.ts`
    - 支持可配置延迟时间（默认 300ms）
    - _Requirements: 2.2_

  - [x] 1.5 实现 useHistory 通用历史记录 hook
    - 创建 `apps/desktop/src/hooks/useHistory.ts`
    - 封装 StorageAdapter 的 CRUD 操作（add、remove、search、clear）
    - 支持泛型、maxItems 限制、按时间倒序排列
    - _Requirements: 9.1, 9.2, 15.1, 15.2_

  - [x] 1.6 实现 HistoryPanel 通用历史记录侧边栏组件
    - 创建 `apps/desktop/src/components/HistoryPanel.tsx`
    - 支持搜索过滤、选择、删除、自定义渲染
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 15.2, 15.3, 15.4_

  - [x] 1.7 实现 batch-parser 批量内容解析工具
    - 创建 `apps/desktop/src/lib/batch-parser.ts`
    - 实现 `parseBatchContent(text, level)` 和 `parseBatchUrls(text)` 函数
    - 每行 trim 后非空即为一条记录，验证容量/URL 格式
    - _Requirements: 8.2, 8.5, 14.1_

  - [x] 1.8 实现 history-filter 历史记录搜索过滤工具
    - 创建 `apps/desktop/src/lib/history-filter.ts`
    - 实现 `filterHistory(items, query)` 大小写不敏感过滤
    - _Requirements: 9.3_

- [x] 2. 实现 JSON Formatter 功能页面
  - [x] 2.1 实现 CodeMirrorEditor 组件
    - 创建 `apps/desktop/src/components/CodeMirrorEditor.tsx`
    - 集成 CodeMirror 6 扩展：lang-json、foldGutter、lineNumbers、highlightActiveLine、bracketMatching、search、lint
    - 支持 light/dark 主题切换（@codemirror/theme-one-dark）
    - 支持 readOnly、placeholder、diagnostics props
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 实现 json-linter JSON 语法检查模块
    - 创建 `apps/desktop/src/lib/json-linter.ts`
    - 实现 CodeMirror lint 源，解析失败时返回包含 from/to 位置的 Diagnostic
    - 在错误位置显示红色下划线标记
    - _Requirements: 2.3_

  - [x] 2.3 编写 json-linter 属性测试
    - **Property 1: JSON 语法检查诊断位置有效性**
    - **Validates: Requirements 2.3**
    - 创建 `apps/desktop/src/lib/__tests__/json-linter.property.test.ts`
    - 验证：对任意包含语法错误的 JSON 字符串，诊断的 from/to 满足 `0 <= from <= to <= input.length`

  - [x] 2.4 实现 DiffViewer JSON 对比组件
    - 创建 `apps/desktop/src/components/DiffViewer.tsx`
    - 使用 @codemirror/merge 扩展实现行级差异高亮（新增绿色、删除红色、修改黄色）
    - _Requirements: 3.1, 3.2_

  - [x] 2.5 编写 JSON Diff 属性测试
    - **Property 2: JSON Diff 正确性**
    - **Validates: Requirements 3.2**
    - 创建 `apps/desktop/src/lib/__tests__/json-diff.property.test.ts`
    - 验证：A === B 时 diff 为空；A !== B 时 diff 包含至少一个变更

  - [x] 2.6 实现 file-opener 文件打开模块
    - 创建 `apps/desktop/src/platform/file-opener.ts`
    - 使用 @tauri-apps/plugin-dialog 和 @tauri-apps/plugin-fs 实现文件选择和读取
    - 过滤 .json 文件类型
    - _Requirements: 4.2, 4.5_

  - [x] 2.7 重写 JsonFormatterPage 页面
    - 重写 `apps/desktop/src/pages/JsonFormatterPage.tsx`
    - 实现分栏布局（ResizableSplitPane + 左右 CodeMirrorEditor）
    - 实现 format/diff 模式切换
    - 集成 useDebounce 实现 300ms 实时格式化预览
    - 集成文件拖拽（drop 事件 + readTextFile）
    - 集成文件打开/保存（file-opener + FileDownloader）
    - 集成剪贴板读写（ClipboardAccess）
    - 集成 Ctrl+S / Cmd+S 快捷键保存
    - 顶部工具栏：格式化 | 压缩 | Diff 对比 | 打开文件 | 保存文件 | 复制结果 | 从剪贴板粘贴
    - 底部状态栏：错误信息 / 文件路径 / 字符数统计
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

- [x] 3. Checkpoint — JSON Formatter 完成验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 实现 QR Code Generator 功能页面
  - [x] 4.1 实现 qr-capacity 二维码容量计算模块
    - 创建 `apps/desktop/src/lib/qr-capacity.ts`
    - 实现 `calculateQrCapacity(content, level)` 返回 charCount、maxCapacity、percentage、isOverCapacity
    - 实现 `validateQrContent(content, level)` 验证内容是否超限
    - _Requirements: 6.4, 6.5_

  - [x] 4.2 编写 qr-capacity 属性测试
    - **Property 3: 二维码容量计算与验证**
    - **Validates: Requirements 6.4, 6.5**
    - 创建 `apps/desktop/src/lib/__tests__/qr-capacity.property.test.ts`
    - 验证：percentage 计算正确性、isOverCapacity 一致性、单调性

  - [x] 4.3 编写 batch-parser 属性测试
    - **Property 4: 批量内容解析与验证**
    - **Validates: Requirements 8.2, 8.5**
    - 创建 `apps/desktop/src/lib/__tests__/batch-parser.property.test.ts`
    - 验证：结果数量 = 非空行数、content = trim 后值、valid 与容量限制一致、顺序保持

  - [x] 4.4 实现 QrRenderer 二维码渲染组件
    - 创建 `apps/desktop/src/components/QrRenderer.tsx`
    - 使用 qrcode.react 的 QRCodeSVG 渲染二维码
    - 支持尺寸选择（128/256/512px）和纠错等级（L/M/Q/H）
    - 显示容量信息（字符数 + 占比）
    - 集成导出 PNG/SVG 和复制到剪贴板按钮
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4_

  - [x] 4.5 实现 BatchQrPanel 批量二维码组件
    - 创建 `apps/desktop/src/components/BatchQrPanel.tsx`
    - 多行文本输入区域，每行一条内容
    - 网格形式展示批量生成的二维码预览
    - 批量导出到文件夹（文件夹选择对话框 + 逐个生成 PNG）
    - 进度指示（已完成数/总数）
    - 超限行标记错误并继续处理其余行
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 4.6 重写 QrCodeGenPage 页面
    - 重写 `apps/desktop/src/pages/QrCodeGenPage.tsx`
    - 实现单个/批量模式切换
    - 集成 QrRenderer、BatchQrPanel、HistoryPanel
    - 集成 useHistory hook 实现历史记录持久化（storageKey: qr-history）
    - 历史记录侧边栏：按时间倒序、搜索过滤、点击重新渲染、删除
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 4.7 编写 history-filter 属性测试
    - **Property 5: 历史记录搜索过滤正确性**
    - **Validates: Requirements 9.3**
    - 创建 `apps/desktop/src/lib/__tests__/history-filter.property.test.ts`
    - 验证：返回项包含 query、未返回项不包含 query、相对顺序保持

- [x] 5. Checkpoint — QR Code Generator 完成验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. 实现 Web Export 功能页面
  - [x] 6.1 实现 turndown-config Turndown 配置模块
    - 创建 `apps/desktop/src/lib/turndown-config.ts`
    - 配置 headingStyle: atx、codeBlockStyle: fenced、bulletListMarker: -
    - 集成 turndown-plugin-gfm（表格、删除线、任务列表）
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 6.2 改造 content-extractor 集成 Turndown
    - 修改 `apps/desktop/src/platform/content-extractor.ts`
    - Readability 提取 article.content（HTML）后通过 Turndown 转换为结构化 Markdown
    - 返回的 markdown 字段为 Turndown 输出，plainText 保持为 textContent
    - _Requirements: 10.1, 10.7_

  - [x] 6.3 编写 Turndown 转换属性测试
    - **Property 6: Turndown HTML 元素保留**
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6**
    - 创建 `apps/desktop/src/lib/__tests__/turndown-config.property.test.ts`
    - 验证：h{N} → # 标记、a → [text](url)、img → ![alt](src)、pre/code → 围栏代码块、ul/li → - item

  - [x] 6.4 编写 Turndown round-trip 属性测试
    - **Property 7: Turndown 转换 round-trip 语义等价性**
    - **Validates: Requirements 10.7**
    - 在同一测试文件中追加 Property 7 测试
    - 验证：HTML → Markdown → HTML 后语义结构一致（标题层级数量、链接 href 集合、列表项数量）

  - [x] 6.5 实现 MarkdownPreview 预览组件
    - 创建 `apps/desktop/src/components/MarkdownPreview.tsx`
    - rendered 模式：marked 渲染 HTML 显示
    - source 模式：CodeMirrorEditor（readOnly + markdown 高亮）
    - 顶部显示元信息（标题、作者、摘要、抓取时间）
    - _Requirements: 11.1, 11.3, 11.4_

  - [x] 6.6 实现 pdf-png-renderer 渲染管线
    - 创建 `apps/desktop/src/lib/pdf-png-renderer.ts`
    - 实现 `renderToPng(markdown, source, options)` — marked → satori → resvg-wasm
    - 实现 `renderToPdf(markdown, source, options)` — 分页 → satori → resvg-wasm → pdf-lib
    - PNG：宽度 800px、高度自适应、顶部含标题和来源信息
    - PDF：A4 尺寸、首页含标题/来源 URL/抓取时间
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3_

  - [x] 6.7 实现 BatchUrlPanel 批量 URL 导出组件
    - 创建 `apps/desktop/src/components/BatchUrlPanel.tsx`
    - 多行 URL 输入区域
    - 格式选择（Markdown / PDF / PNG）
    - 依次处理每个 URL：提取 → 渲染 → 保存
    - 进度指示（已完成数/总数/当前 URL）
    - 单个失败不中断，完成后显示结果摘要
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 6.8 编写批量 URL 处理属性测试
    - **Property 8: 批量 URL 处理容错性**
    - **Validates: Requirements 14.2, 14.4**
    - 创建 `apps/desktop/src/lib/__tests__/batch-url.property.test.ts`
    - 验证：results.length === N、成功数 + 失败数 === N、失败结果含 error、不因单个失败中断

  - [x] 6.9 重写 WebExportPage 页面
    - 重写 `apps/desktop/src/pages/WebExportPage.tsx`
    - 实现左右分栏布局（左侧 URL 输入 + 操作区，右侧 MarkdownPreview）
    - 实现单个/批量模式切换
    - 集成导出按钮：导出 Markdown / 导出 PDF / 导出 PNG / 复制 PNG 到剪贴板
    - 集成 BatchUrlPanel
    - 集成 useHistory hook 实现导出历史持久化（storageKey: web-export-history）
    - 集成 HistoryPanel 显示导出历史
    - 错误处理：提取失败/渲染失败显示 Toast 提示
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4_

- [x] 7. Final Checkpoint — 全部功能集成验证
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 每个任务引用了具体的需求编号以确保可追溯性
- Checkpoints 确保增量验证，每个功能区域完成后进行检查
- Property tests 验证设计文档中定义的 8 个正确性属性
- 三个功能页面（JSON Formatter、QR Code Generator、Web Export）可在共享基础设施完成后并行开发
- 所有代码遵循项目现有风格：无分号、双引号、无尾逗号、Tailwind CSS 样式

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.7", "1.8"] },
    { "id": 2, "tasks": ["1.6", "2.1", "4.1", "6.1"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.6", "4.2", "4.3", "4.4", "6.2", "6.5"] },
    { "id": 4, "tasks": ["2.3", "2.5", "2.7", "4.5", "4.6", "4.7", "6.3", "6.4", "6.6"] },
    { "id": 5, "tasks": ["6.7", "6.8"] },
    { "id": 6, "tasks": ["6.9"] }
  ]
}
```
