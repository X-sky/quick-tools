import React from "react"

import { WebExportApp } from "~features/web-export/WebExportApp"
import { initChromePlatform } from "~platform"

import "~style.css"

initChromePlatform()

function WebExportTab() {
  return <WebExportApp />
}

export default WebExportTab
