# Volt ⚡

> Productivity built around your energy, not just your tasks.

Volt is a mobile productivity app that starts with a simple ritual: dump everything on your mind. From there, Volt organises your tasks into **zones** — the energy states you need to be in to actually do that work.

Deep focus. Admin mode. Creative flow. Recovery. Each part of your day has a zone, and your tasks live inside it. At the end of the day, every completed task becomes a visible win.

---

## The idea

Most to-do apps treat all tasks equally. But sending emails and doing deep creative work aren't the same — they require completely different mental states. Volt is built around that insight: you don't just plan *what* to do, you plan *how you need to show up* to do it.

---

## Features

- **Brain dump** — get everything out of your head in one go
- **Zone system** — user-defined focus states (deep work, admin, creative, recovery, etc.)
- **Plan your day** — assign tasks to zones before the day begins
- **Zone check-in** — start a zone and work inside that container
- **Mid-day adjustment** — swap zones or tasks on the fly
- **Focus timer** — stay inside your zone with a built-in timer
- **End-of-day recap** — review completed tasks and energy breakdown by zone
- **Custom zones** — create and manage your own zones
- **Day reset** — dashboard resets automatically after logging a day

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 54) |
| Language | TypeScript |
| Backend | Supabase (auth + database) |
| Local storage | AsyncStorage |
| Editor | Cursor (AI-assisted development) |
| Version control | Git / GitHub |
| Fonts | BricolageGrotesque + DMSans (Expo Google Fonts) |

---

## Screens

| Screen | Description |
|---|---|
| `index.tsx` | Home / landing |
| `auth.tsx` | Authentication |
| `dashboard.tsx` | Main hub with zone management overlay |
| `checkin.tsx` | Zone check-in with back navigation |
| `planday.tsx` | Day planning with zone picker + inline zone creation |
| `history.tsx` | End-of-day log with expandable zone recap |
| `walkthrough/` | Onboarding screens |

---

## Getting started

### Prerequisites

- Node.js v20
- Expo CLI
- Expo Go app on your phone

### Install & run

```bash
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with Expo Go on your iPhone or Android device.

### Key conventions

- `--legacy-peer-deps` required for all installs (configured in `.npmrc`)
- Fonts use camelCase naming: `BricolageGrotesque_400Regular`, `DMSans_400Regular`
- Custom zones synced across screens via shared `custom_zones` AsyncStorage key

---

## Status

**In active development** — core zone system, planning flow, check-in, and end-of-day recap are all working. App is currently running on device via Expo Go.

---

## Built by

Jenny Truong — [jnnyswrld.framer.website](https://jnnyswrld.framer.website) · [LinkedIn](https://www.linkedin.com/in/vuong-anh-truong/) · [Portfolio](https://www.notion.so/2fccdb3df59d8031a149ee21343a0110)
