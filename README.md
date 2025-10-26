# Symentha (FileFlow-Storage-Manager)

Next-generation storage management app with visual-first UI, drag-and-drop, analytics, and a path to AI-powered organization.

This repo currently contains a starter Web PWA implemented with React + TypeScript + Vite under `apps/web`. It showcases:
- Dual-pane layout (folders sidebar + file grid)
- HTML5 drag-and-drop for moving files between folders (in-memory mock)
- Storage Treemap visualization (Recharts) using computed folder sizes
- Utility stubs for junk detection and duplicate grouping

Desktop packaging via Tauri will be layered on later while reusing the same React UI.

## Stack
- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- Recharts (Treemap)
- Vitest (unit tests)

## Getting started (Windows PowerShell)

1) Install dependencies
```
cd "apps/web"
npm install
```

2) Run the dev server
```
npm run dev
```

3) Build for production
```
npm run build
npm run preview
```

4) Run tests
```
npm test
```

## Roadmap (excerpt)
- File system access (PWA): integrate File System Access API for real local files
- Performance: background scanning workers and incremental updates
- Cleanup tools: junk file detection UI and duplicate finder UX
- AI features: TF.js/ONNX-based classifiers + rules engine for auto-organization
- Desktop app: Tauri wrapper with native fs operations and updater

## Structure
```
apps/
	web/
		src/
			components/
			lib/
			App.tsx
			AppTypes.ts
		index.html
		package.json
```

## Notes
- The web demo uses mock data. Moving files updates in-memory state only.
- Some advanced features are scaffolded as stubs to be implemented incrementally.

