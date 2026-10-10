import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Shared helpers/hooks exported beside components — Fast Refresh is a dev-only concern.
    files: [
      'src/components/ui/**/*.{ts,tsx}',
      'src/entry-server.tsx',
      'src/router.tsx',
      'src/lib/auth/AuthContext.tsx',
      'src/lib/route-loading.tsx',
      'src/components/CalendarView.tsx',
      'src/components/auth/**/*.{ts,tsx}',
      'src/components/kundali/KundaliSectionNav.tsx',
      'src/components/kundali/YogaReferenceCatalog.tsx',
      'src/components/panchanga/PanchangaShellLayout.tsx',
      'src/components/panchanga/PanchangaSidebarNav.tsx',
      'src/components/panchanga/KundaliSidebarSubnav.tsx',
      'src/components/home/PanchangaAsideTabs.tsx',
      'src/components/tithi-mechanics/ElongationDiagram.tsx',
      'src/components/avakahada/AvakahadaWheel.tsx',
      'src/lib/learn/learn-topics.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // A 3D scene's frame loop is imperative on purpose: `useFrame` writes
    // positions straight onto three.js object refs sixty times a second, and
    // React only hears a sampled snapshot five times a second. Routing that
    // through state is exactly what these scenes are built to avoid.
    files: [
      'src/components/sky3d/AakashGocharScene.tsx',
      'src/components/learn/TwoSystemsScene.tsx',
      'src/components/learn/DaySimScene.tsx',
    ],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
  {
    // TanStack Table's hook API is intentionally dynamic; React Compiler skips it.
    files: [
      'src/components/SunTimesYearGrid.tsx',
      'src/pages/AvakahadaChakra.tsx',
      'src/pages/Holidays.tsx',
    ],
    rules: {
      'react-hooks/incompatible-library': 'off',
    },
  },
])
