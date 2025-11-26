export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2)

export const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
}
