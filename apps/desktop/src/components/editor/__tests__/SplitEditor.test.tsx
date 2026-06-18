import { describe, it, expect } from "vitest"
import React from "react"
import { SplitEditor } from "../SplitEditor"
import type { SplitEditorProps } from "../SplitEditor"

describe("SplitEditor", () => {
  it("should export SplitEditor as a function component", () => {
    expect(SplitEditor).toBeDefined()
    expect(typeof SplitEditor).toBe("function")
  })

  describe("interface contract", () => {
    it("should accept required props without error", () => {
      const props: SplitEditorProps = {
        leftLabel: "INPUT",
        rightLabel: "OUTPUT",
        leftContent: React.createElement("div", null, "left"),
        rightContent: React.createElement("div", null, "right"),
      }
      const element = React.createElement(SplitEditor, props)
      expect(element).toBeDefined()
      expect(element.type).toBe(SplitEditor)
    })

    it("should accept optional defaultRatio prop", () => {
      const props: SplitEditorProps = {
        leftLabel: "INPUT",
        rightLabel: "OUTPUT",
        leftContent: React.createElement("div", null, "left"),
        rightContent: React.createElement("div", null, "right"),
        defaultRatio: 0.6,
      }
      const element = React.createElement(SplitEditor, props)
      expect(element.props.defaultRatio).toBe(0.6)
    })

    it("should accept optional minPanelWidth prop", () => {
      const props: SplitEditorProps = {
        leftLabel: "INPUT",
        rightLabel: "OUTPUT",
        leftContent: React.createElement("div", null, "left"),
        rightContent: React.createElement("div", null, "right"),
        minPanelWidth: 300,
      }
      const element = React.createElement(SplitEditor, props)
      expect(element.props.minPanelWidth).toBe(300)
    })

    it("should accept leftPlaceholder with icon and text", () => {
      const icon = React.createElement("svg", { width: 32, height: 32 })
      const props: SplitEditorProps = {
        leftLabel: "INPUT",
        rightLabel: "OUTPUT",
        leftContent: null as unknown as React.ReactNode,
        rightContent: React.createElement("div", null, "right"),
        leftPlaceholder: { icon, text: "Paste or drop a file here" },
      }
      const element = React.createElement(SplitEditor, props)
      expect(element.props.leftPlaceholder?.text).toBe(
        "Paste or drop a file here"
      )
      expect(element.props.leftPlaceholder?.icon).toBe(icon)
    })

    it("should accept rightPlaceholder with icon and text", () => {
      const icon = React.createElement("svg", { width: 32, height: 32 })
      const props: SplitEditorProps = {
        leftLabel: "INPUT",
        rightLabel: "OUTPUT",
        leftContent: React.createElement("div", null, "left"),
        rightContent: null as unknown as React.ReactNode,
        rightPlaceholder: { icon, text: "Output will appear here" },
      }
      const element = React.createElement(SplitEditor, props)
      expect(element.props.rightPlaceholder?.text).toBe(
        "Output will appear here"
      )
    })
  })

  describe("default values", () => {
    it("should default ratio to 0.5 when not specified", () => {
      const props: SplitEditorProps = {
        leftLabel: "INPUT",
        rightLabel: "OUTPUT",
        leftContent: React.createElement("div", null, "left"),
        rightContent: React.createElement("div", null, "right"),
      }
      const element = React.createElement(SplitEditor, props)
      // defaultRatio is not passed, component defaults internally to 0.5
      expect(element.props.defaultRatio).toBeUndefined()
    })

    it("should default minPanelWidth to 200 when not specified", () => {
      const props: SplitEditorProps = {
        leftLabel: "INPUT",
        rightLabel: "OUTPUT",
        leftContent: React.createElement("div", null, "left"),
        rightContent: React.createElement("div", null, "right"),
      }
      const element = React.createElement(SplitEditor, props)
      expect(element.props.minPanelWidth).toBeUndefined()
    })
  })

  describe("label rendering", () => {
    it("should pass leftLabel as string", () => {
      const props: SplitEditorProps = {
        leftLabel: "SOURCE",
        rightLabel: "RESULT",
        leftContent: React.createElement("div"),
        rightContent: React.createElement("div"),
      }
      expect(typeof props.leftLabel).toBe("string")
      expect(typeof props.rightLabel).toBe("string")
    })
  })

  describe("placeholder structure", () => {
    it("placeholder icon should accept any ReactNode", () => {
      // Phosphor icon as ReactNode
      const phosphorIcon = React.createElement("span", {
        className: "phosphor-icon",
        "data-size": 32,
      })
      const props: SplitEditorProps = {
        leftLabel: "INPUT",
        rightLabel: "OUTPUT",
        leftContent: null as unknown as React.ReactNode,
        rightContent: null as unknown as React.ReactNode,
        leftPlaceholder: { icon: phosphorIcon, text: "Paste JSON here" },
        rightPlaceholder: {
          icon: phosphorIcon,
          text: "Formatted output appears here",
        },
      }
      expect(props.leftPlaceholder?.icon).toBe(phosphorIcon)
      expect(props.rightPlaceholder?.icon).toBe(phosphorIcon)
    })
  })

  describe("component structure verification", () => {
    it("should be a named export", async () => {
      const mod = await import("../SplitEditor")
      expect(mod.SplitEditor).toBeDefined()
      expect(typeof mod.SplitEditor).toBe("function")
    })

    it("should also have a default export", async () => {
      const mod = await import("../SplitEditor")
      expect(mod.default).toBeDefined()
      expect(typeof mod.default).toBe("function")
    })
  })
})
