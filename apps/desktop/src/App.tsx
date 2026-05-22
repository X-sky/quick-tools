import { useState } from "react"

import JsonFormatterPage from "./pages/JsonFormatterPage"
import QrCodeGenPage from "./pages/QrCodeGenPage"
import WebExportPage from "./pages/WebExportPage"

type Page = "json-formatter" | "qr-code-gen" | "web-export"

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: "json-formatter", label: "JSON Formatter", icon: "{ }" },
  { id: "qr-code-gen", label: "QR Code", icon: "⊞" },
  { id: "web-export", label: "Web Export", icon: "↗" }
]

export default function App() {
  const [activePage, setActivePage] = useState<Page>("json-formatter")

  return (
    <div className="flex h-screen w-full overflow-hidden bg-stone-100 dark:bg-stone-950">
      {/* Sidebar */}
      <nav className="flex w-52 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-sm font-bold text-white shadow-sm">
            Q
          </div>
          <span className="text-sm font-semibold tracking-tight text-stone-800 dark:text-stone-100">
            Quick Tools
          </span>
        </div>

        {/* Nav items */}
        <ul className="mt-2 flex flex-col gap-0.5 px-3">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                  activePage === item.id
                    ? "bg-rose-50 font-medium text-rose-700 shadow-sm dark:bg-rose-950/40 dark:text-rose-300"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                }`}>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-mono ${
                    activePage === item.id
                      ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-500"
                  }`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Bottom spacer */}
        <div className="mt-auto border-t border-stone-100 px-5 py-3 dark:border-stone-800">
          <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-600">
            Desktop v0.1.0
          </span>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activePage === "json-formatter" && <JsonFormatterPage />}
        {activePage === "qr-code-gen" && <QrCodeGenPage />}
        {activePage === "web-export" && <WebExportPage />}
      </main>
    </div>
  )
}
