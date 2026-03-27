export function isExtensionContextInvalid(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "")

  return message.includes("Extension context invalidated")
}

export function hasRuntimeContext() {
  try {
    return Boolean(chrome?.runtime?.id)
  } catch {
    return false
  }
}
