# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Aim90.org** marketing website for the Aim90 mobile app - a 90-day goal achievement app inspired by Napoleon Hill's "Think and Grow Rich." The site promotes the app's core features: setting a Definite Chief Aim, completing 3 daily critical tasks, and staying accountable with an AI partner named Alfie.

## Tech Stack

- **Next.js 16** (App Router)
- **React 19** with TypeScript
- **Tailwind CSS v4** (latest version with @tailwindcss/postcss)
- **Shadcn UI** components (new-york style)
- **Lucide React** for icons
- **Lottie-web** for animations

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Architecture

### Project Structure

The working directory is `aim90_website/` (not the root `site/` folder).

- `src/app/` - Next.js App Router pages and layouts
  - `page.tsx` - Main homepage (client component)
  - `layout.tsx` - Root layout with Geist fonts and metadata
  - `globals.css` - Tailwind base styles and CSS variables
- `src/components/` - React components
  - `LottieButton.tsx` - Interactive Lottie animation component with audio playback
  - `ui/` - Shadcn UI components (badge, button, card)
- `src/lib/` - Utility functions
  - `utils.ts` - Tailwind merge utilities
- `public/` - Static assets (logo, animations, audio, store badges)

### Path Aliases

Uses `@/*` for imports mapping to `./src/*` (configured in tsconfig.json):
```typescript
import { Button } from "@/components/ui/button"
```

### Shadcn UI Configuration

Configured in `components.json`:
- Style: "new-york"
- RSC: Enabled
- CSS Variables: Enabled
- Base color: "neutral"
- Custom aliases for components, utils, ui, lib, hooks

### Brand Colors

Defined in README.md and used throughout:
- Primary (blue): `#4A90E2`
- Background: `#F5F5F5`
- Text: `#1A1A1A`
- Surface: `#FFFFFF`
- Text secondary: `#666666`
- Logo color: `#fb5d5a`
- Progress green: `#D1FAE5`

## Key Implementation Details

### LottieButton Component

Custom component (`src/components/LottieButton.tsx`) that:
- Loads Lottie animations dynamically
- Toggles playback on click with audio sync
- Auto-stops after 16 seconds
- Preserves last frame as resting state
- Used for the interactive Alfie AI ball on homepage

### Homepage Structure

The main page (`src/app/page.tsx`) is a client component with sections:
1. Hero - Logo, tagline, app store badges
2. Features - 4 card grid explaining core features
3. Benefits - 3 card grid highlighting value propositions
4. Alfie - Interactive Lottie animation demo
5. Pricing - Free vs Pro tier comparison
6. Footer - Links to privacy policy and contact

All cards use custom hover effects (transform + shadow) via inline handlers.

### Styling Approach

- Uses Tailwind CSS v4 with PostCSS
- Responsive design: mobile-first with `md:` and `lg:` breakpoints
- CSS variables for Shadcn UI theming
- Custom hover animations on cards using inline styles
- Geist Sans and Geist Mono fonts from next/font/google

## Adding Shadcn Components

To add new Shadcn UI components, the configuration expects:
- Components in `@/components/ui/`
- Utils in `@/lib/utils`
- Use the "new-york" style variant
- Enable RSC and CSS variables
