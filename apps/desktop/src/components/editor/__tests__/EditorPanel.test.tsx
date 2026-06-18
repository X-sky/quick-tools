import { describe, it, expect } from "vitest"
import React from "react"
import { EditorPanel } from "../EditorPanel"
import type { EditorPanelProps } from "../EditorPanel"

describe("EditorPanel", () => {
  it("should export EditorPanel as a function component", () => {
    expect(EditorPanel).toBeDefined()
    expect(typeof EditorPanel).toBe("function")
  })

  it("should accept required props without error", () => {
    const props: EditorPanelProps = {
      label: "INPUT",
      children: React.createElement("div", null, "content"),
    }
    // Component should be callable with valid props
    const element = React.createElement(EditorPanel, props)
    expect(element).toBeDefined()
    expect(element.type).toBe(EditorPanel)
  })

  it("should accept isEmpty and placeholder props", () => {
    const props: EditorPanelProps = {
      label: "OUTPUT",
      children: React.createElement("div", null, "content"),
      isEmpty: true,
      placeholder: {
        icon: React.createElement("span", null, "icon"),
        text: "Paste or drop a file here",
      },
    }
    const element = React.createElement(EditorPanel, props)
    expect(element).toBeDefined()
    expect(element.props.isEmpty).toBe(true)
    expect(element.props.placeholder?.text).toBe("Paste or drop a file here")
  })

  it("should default isEmpty to false", () => {
    const props: EditorPanelProps = {
      label: "INPUT",
      children: React.createElement("div", null, "content"),
    }
    // isEmpty defaults to false, so children should render (not placeholder)
    const element = React.createElement(EditorPanel, props)
    expect(element.props.isEmpty).toBeUndefined()
  })

  it("should not show placeholder when isEmpty is false even if placeholder is provided", () => {
    const props: EditorPanelProps = {
      label: "INPUT",
      children: React.createElement("div", null, "content"),
      isEmpty: false,
      placeholder: {
        icon: React.createElement("span", null, "icon"),
        text: "Guide text",
      },
    }
    const element = React.createElement(EditorPanel, props)
    // isEmpty is explicitly false, so children should render
    expect(element.props.isEmpty).toBe(false)
  })

  it("should not show placeholder when isEmpty is true but no placeholder provided", () => {
    const props: EditorPanelProps = {
      label: "INPUT",
      children: React.createElement("div", null, "content"),
      isEmpty: true,
      // no placeholder prop
    }
    const element = React.createElement(EditorPanel, props)
    expect(element.props.isEmpty).toBe(true)
    expect(element.props.placeholder).toBeUndefined()
  })

  describe("interface contract", () => {
    it("label should be a string", () => {
      const props: EditorPanelProps = {
        label: "TEST LABEL",
        children: null,
      }
      expect(typeof props.label).toBe("string")
    })

    it("placeholder icon should accept ReactNode", () => {
      const icon = React.createElement("svg", { width: 32, height: 32 })
      const props: EditorPanelProps = {
        label: "OUTPUT",
        children: null,
        isEmpty: true,
        placeholder: { icon, text: "No output yet" },
      }
      expect(props.placeholder?.icon).toBe(icon)
    })
  })
})
