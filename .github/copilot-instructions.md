# Copilot Instructions

## Architecture

This is an **ASP.NET Core 8 + React 19 SPA** structured as a Visual Studio solution (`MelancholyPhotos.sln`) with two projects:

- **`MelancholyPhotos.Server/`** — .NET 8 Web API backend. Serves the built frontend as static files in production. Uses `Microsoft.AspNetCore.SpaProxy` to proxy requests to the Vite dev server during development. Falls back to `/index.html` for client-side routing.
- **`melancholyphotos.client/`** — React 19 + Vite frontend with Tailwind CSS v4 and React Router DOM v7.

During development, the .NET server auto-launches the Vite dev server (port `52210`) via `SpaProxyLaunchCommand`. The frontend proxies API calls to the backend at `https://localhost:7038`.

## Build & Dev Commands

Run from `melancholyphotos.client/`:

```bash
npm run dev       # Start Vite dev server (usually launched automatically by the .NET server)
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

Run from `MelancholyPhotos.Server/`:

```bash
dotnet run        # Starts backend + auto-launches Vite dev server
```

Preferred: open `MelancholyPhotos.sln` in Visual Studio and run the solution — both projects start together.

There is no test suite.

## Adding API Endpoints

1. Add a controller in `MelancholyPhotos.Server/Controllers/` following the existing `[ApiController]` + `[Route("[controller]")]` pattern.
2. Add a proxy entry in `melancholyphotos.client/vite.config.js` under `server.proxy` for any new route prefix (e.g., `'^/newroute'`).

## Frontend Conventions

### RouteStyles pattern
Every page component calls `RouteStyles()` at the top of its function body. This utility (in `src/components/RouteStyles.jsx`) applies a CSS class to `document.body` based on the current route:
- `/` → `body.homepage`
- `/gallery` → `body.gallerypage`
- etc.

Page-specific backgrounds, cursors, and other visual styles are applied by targeting these body classes in CSS.

### CSS structure
- `src/styles/site.css` — global styles. Starts with `@import "tailwindcss"`. Contains shared body class rules and `@theme` custom properties.
- Page-specific styles go in separate files (e.g., `src/styles/home.css`) and are imported at the top of the relevant page component alongside `site.css`.
- Tailwind CSS v4 is used with the `@tailwindcss/vite` plugin — **no `tailwind.config.js`**. Custom design tokens are defined in `site.css` via `@theme` (e.g., `--content-max-width: 900px`).

### Assets
Assets live in `src/assets/` and are referenced via path strings (`/src/assets/filename.png`), not ES module imports. Image-based hover states are implemented with Tailwind arbitrary-value classes: `bg-[url(/src/assets/img.png)] hover:bg-[url(/src/assets/imghover.png)]`.

### Navigation
Navigation uses plain `<a href="...">` tags rather than React Router's `<Link>`.

### Layout
Pages use a centered column layout constrained by `w-[var(--content-max-width)]` (900px). On `2xl` screens, decorative side elements (e.g., eye images in `home.jsx`) become visible via `2xl:visible 2xl:block`.
