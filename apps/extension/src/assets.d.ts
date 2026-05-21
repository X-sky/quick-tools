declare module "*.ttf" {
  const url: string
  export default url
}

declare module "*.ttc" {
  const url: string
  export default url
}

declare module "*.otf" {
  const url: string
  export default url
}

declare module "*.wasm" {
  const url: string
  export default url
}

declare module "data-url:*" {
  const value: string
  export default value
}
