/**
 * Chinese error messages for web-export operations.
 * These are preserved from the original implementation and should be
 * used by the app layer when reporting errors to users.
 */

export const ERROR_NO_CONTENT = "当前页面没有可导出的正文内容。"

export const ERROR_RESTRICTED_PAGE =
  "当前页面属于浏览器受限页面，扩展无法读取内容。请在普通 http/https 网页中使用导出功能。"

export const ERROR_EXTRACTION_FAILED =
  "当前页面正文提取失败。请在普通网页中重试。"

export const ERROR_NO_ACTIVE_TAB = "未找到可导出的活动标签页。"
