import { defineConfig, loadEnv, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { spawnSync } from "node:child_process"

function manualChunkId(id: string): string | undefined {
  if (id.includes("samvatsara-table.json")) return "samvatsara-data"
  if (id.includes("bs-calendar-data.json")) return "bs-calendar-data"
  if (id.includes("/src/i18n/ne.json")) return "i18n-ne"

  if (!id.includes("node_modules")) return

  if (id.includes("@tanstack/react-table")) return "table"
  if (id.includes("react-day-picker") || id.includes("date-fns")) {
    return "calendar-picker"
  }
  if (id.includes("@tanstack/react-router")) return "router"
  if (id.includes("@tanstack/react-query")) return "query"
  if (id.includes("lucide-react")) return "icons"
  if (id.includes("i18next")) return "i18n-runtime"
  if (
    id.includes("@base-ui") ||
    id.includes("radix-ui") ||
    id.includes("class-variance-authority") ||
    id.includes("clsx") ||
    id.includes("tailwind-merge")
  ) {
    return "ui"
  }
  if (id.includes("react-dom") || id.includes("/react/")) return "react"
}

/**
 * Regenerate ne.json / en.json whenever the bilingual catalogue changes, so
 * editing a string in src/i18n/strings.ts hot-reloads like any other source
 * file. Runs as a subprocess because the script reads strings.ts through a
 * fresh module graph — an in-process import would serve a cached copy.
 */
function i18nBundles(): Plugin {
  const catalogue = path.resolve(__dirname, "src/i18n/strings.ts")
  return {
    name: "i18n-bundles",
    apply: "serve",
    configureServer(server) {
      server.watcher.add(catalogue)
      server.watcher.on("change", (file) => {
        if (path.resolve(file) !== catalogue) return
        const result = spawnSync("npx", ["tsx", "scripts/generate-i18n.ts"], {
          cwd: __dirname,
          encoding: "utf8",
        })
        if (result.status !== 0) {
          server.config.logger.error(
            `[i18n] ${result.stderr?.trim() || "failed to regenerate language bundles"}`,
          )
        }
      })
    },
  }
}

/**
 * @react-three/fiber 9 still does `new THREE.Clock()` when Canvas mounts.
 * three r183+ warns on that constructor. Swap in our Timer-backed Clock
 * façade so the console stays quiet until fiber v10 drops Clock.
 */
function rewriteFiberClock(code: string) {
  if (
    !code.includes("new THREE.Clock()") &&
    !code.includes("new THREE__namespace.Clock()")
  ) {
    return null
  }
  const timerClock = JSON.stringify(
    path.resolve(__dirname, "./src/lib/sky3d/timer-clock.ts"),
  )
  return `import { TimerClock as __R3FTimerClock } from ${timerClock};\n${code
    .replaceAll("new THREE.Clock()", "new __R3FTimerClock()")
    .replaceAll("new THREE__namespace.Clock()", "new __R3FTimerClock()")}`
}

function r3fTimerClock(): Plugin {
  return {
    name: "r3f-timer-clock",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0].replace(/\\/g, "/")
      if (!file.includes("/node_modules/@react-three/fiber/")) return
      if (file.includes(".cjs")) return
      const next = rewriteFiberClock(code)
      return next ? { code: next, map: null } : undefined
    },
  }
}

function injectGaSnippet(measurementId: string | undefined): Plugin {
  return {
    name: "inject-ga-snippet",
    transformIndexHtml(html) {
      if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) {
        return html.replace(/\s*<!-- @ga-snippet -->\s*/, "\n")
      }

      const snippet = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}', { send_page_view: false });
</script>`

      return html.replace("<!-- @ga-snippet -->", snippet)
    },
  }
}

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const gaId = env.VITE_GA_MEASUREMENT_ID

  return {
    base: "/",
    plugins: [
      react(),
      tailwindcss(),
      i18nBundles(),
      r3fTimerClock(),
      ...(isSsrBuild ? [] : [injectGaSnippet(gaId)]),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    ssr: {
      noExternal: [
        "@tanstack/react-router",
        "@tanstack/react-query",
        "@tanstack/history",
        "react-i18next",
        "i18next",
      ],
    },
    optimizeDeps: {
      rolldownOptions: {
        plugins: [
          {
            name: "r3f-timer-clock",
            transform(code: string, id: string) {
              const file = id.split("?")[0].replace(/\\/g, "/")
              if (!file.includes("/node_modules/@react-three/fiber/")) return
              if (file.includes(".cjs")) return
              const next = rewriteFiberClock(code)
              return next ? { code: next, map: null } : undefined
            },
          },
        ],
      },
    },
    // In dev, mirror the production nginx setup: forward "/api/*" to the local
    // FastAPI server with the prefix stripped, so the app is same-origin here too.
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: manualChunkId,
        },
      },
    },
  }
})
