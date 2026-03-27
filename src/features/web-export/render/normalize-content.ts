function isMeaningfulTextNode(node: ChildNode) {
  return node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
}

function isBlockElement(tagName: string) {
  return [
    "ADDRESS",
    "ARTICLE",
    "ASIDE",
    "BLOCKQUOTE",
    "DIV",
    "DL",
    "FIELDSET",
    "FIGCAPTION",
    "FIGURE",
    "FOOTER",
    "FORM",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HEADER",
    "HR",
    "LI",
    "MAIN",
    "NAV",
    "OL",
    "P",
    "PRE",
    "SECTION",
    "TABLE",
    "UL"
  ].includes(tagName)
}

function stripAttributes(element: Element) {
  const allowed = new Set(["href", "colspan", "rowspan"])

  Array.from(element.attributes).forEach((attribute) => {
    if (!allowed.has(attribute.name)) {
      element.removeAttribute(attribute.name)
    }
  })
}

function removeEmptyNodes(root: ParentNode) {
  Array.from(root.querySelectorAll("*")).forEach((element) => {
    const hasMeaningfulChild = Array.from(element.childNodes).some(
      (node) =>
        isMeaningfulTextNode(node) ||
        (node.nodeType === Node.ELEMENT_NODE &&
          (node as Element).tagName !== "BR" &&
          Boolean((node as Element).textContent?.trim()))
    )

    if (!hasMeaningfulChild && !["BR", "HR"].includes(element.tagName)) {
      element.remove()
    }
  })
}

function normalizeContainerElement(element: Element) {
  const tagName = element.tagName

  if (!["DIV", "SECTION", "ARTICLE", "SPAN"].includes(tagName)) {
    return
  }

  const childElements = Array.from(element.children)
  const hasBlockChildren = childElements.some((child) =>
    isBlockElement(child.tagName)
  )
  const text = element.textContent?.replace(/\s+/g, " ").trim() ?? ""

  if (!hasBlockChildren && text) {
    const paragraph = document.createElement("p")
    paragraph.innerHTML = element.innerHTML
    element.replaceWith(paragraph)
    return
  }

  if (!text && childElements.length === 0) {
    element.remove()
  }
}

function normalizeTables(root: ParentNode) {
  Array.from(root.querySelectorAll("table")).forEach((table) => {
    table.removeAttribute("width")
    table.removeAttribute("height")
  })
}

export function normalizeContentHtml(html: string) {
  const container = document.createElement("div")
  container.innerHTML = html

  container
    .querySelectorAll(
      "script, style, noscript, iframe, svg, canvas, form, button, input, aside, nav, footer, img, picture, video, audio, source"
    )
    .forEach((node) => node.remove())

  Array.from(container.querySelectorAll("*")).forEach((element) => {
    stripAttributes(element)
  })

  Array.from(container.querySelectorAll("*")).forEach((element) => {
    normalizeContainerElement(element)
  })

  normalizeTables(container)
  removeEmptyNodes(container)

  return container.innerHTML.trim() || "<p>No readable content found.</p>"
}
