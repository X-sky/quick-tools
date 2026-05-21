import React, { useState } from "react"

import JsonFormatterPage from "./pages/JsonFormatterPage"
import QrCodeGenPage from "./pages/QrCodeGenPage"
import WebExportPage from "./pages/WebExportPage"

type Page = "json-formatter" | "qr-code-gen" | "web-export"

const navItems: { id: Page; label: string }[] = [
  { id: "json-formatter", label: "JSON Formatter" },
  { id: "qr-code-gen", label: "QR Code Generator" },
  { id: "web-export", label: "Web Export" }
]

export default function App() {
  const [activePage, setActivePage] = useState<Page>("json-formatter")

  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-900">
      <nav className="flex w-56 flex-col border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          Quick Tools
        </h1>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`cursor-pointer rounded px-3 py-2 text-sm ${
                activePage === item.id
                  ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                  : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}>
              {item.label}
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 overflow-auto p-6">
        {activePage === "json-formatter" && <JsonFormatterPage />}
        {activePage === "qr-code-gen" && <QrCodeGenPage />}
        {activePage === "web-export" && <WebExportPage />}
      </main>
    </div>
  )
}
