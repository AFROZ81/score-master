# 🏏 Score Master - Professional Cricket Scoring & Management Platform

A modern, full-stack cricket scoring and team management platform built with React 18, TypeScript, Tailwind CSS, Express, and MongoDB. Features real-time live match scoring, authoritative server-side state calculation, single source of truth data architecture, player profiles with comprehensive career metrics, team registration, role-based live scorer authorization, and full **Light/Dark Theme Context** support.

![Score Master](https://img.shields.io/badge/ScoreMaster-v3.5-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8)

---

## 🌟 Key Capabilities & System Features

### 1. 🌓 System-Wide Theme Context (Dark & Light Mode)
- **Default Dark Theme**: Dark mode is configured as the system default across authenticated views for a sleek, modern visual aesthetic.
- **Header Theme Toggle & Animated Transition**:
  - A Sun (`lucide-react` `Sun`) and Moon (`Moon`) theme toggle button is located directly right of the refresh button in the Header on the Profile view.
  - Features an interactive **2-second animated theme transition loader** displaying a dynamic Sun/Moon badge, progress line (0% to 100% over 2s), and smooth mode indicator before fading away seamlessly into the target theme.
- **Hero & Authentication Consistency**:
  - `HeroPage.tsx` maintains a static dark theme layout.
  - `Authentication.tsx` follows `HeroPage.tsx` with a dark gradient (`from-slate-950 via-blue-950 to-slate-950`) and top-aligned login/register card.
- **Universal Dark Mode Styling**:
  - Every component and page across the application (`MatchCard`, `BattingCard`, `BowlingCard`, `Commentary`, `ScoringDashboardView`, `InningsBreakView`, `MatchCompleteView`, `MatchSetupForm`, `TossPage`, `WicketModal`, `PlayerSelector`, `CustomSelect`, `EndOptionsModal`, `NoBallRunOutConfirmModal`, `RunsScoredModal`, `TiePromptModal`, `ConfirmationModal`, `PlayerDetailModal`, `TeamDetailModal`, `BottomNav`) utilizes tailored Tailwind `dark:` utility classes (`dark:bg-slate-900`, `dark:border-slate-800`, `dark:text-slate-100`, `dark:text-slate-400`, etc.) ensuring zero mismatched colors.

### 2. 🎯 Ball-by-Ball Live Scoring & Authoritative Engine
- **Server-Side Scoring Engine**: All scoring business rules (strikes, boundaries, extras, dismissals, over-transitions, innings completion, target chasing) execute on the backend for 100% data integrity.
- **Super Over Workflow**:
  - Automatically detects match tie scenarios and presents the interactive **Tie Prompt Modal** (End Match as Tied vs. Start Super Over).
  - Teams swap innings order correctly (team batting 2nd in regular play bats 1st in Super Over).
  - 1-over (6-ball) & 2-wicket limits per team with isolated target calculation.
  - Clear Super Over commentary, overs summary breakdown (`⚡ SO:`), and result indicators (`Team X won via Super Over`).
- **Embedded `liveState` Single Source of Truth**: The standalone `sessions` collection has been superseded by an embedded, atomic `liveState` inside the `matches` collection. Eliminates dual-write desynchronization and race conditions.
- **Automatic Career & Match Stats Sync (`statsSyncService`)**: Synchronizes player batting, bowling, fielding metrics, and team win/loss/tie match histories upon match completion or explicit status updates.
- **Scorer Role Authorization**: Matches record `creatorId` and `scorerId`. Only the designated scorer is authorized to control the live scoring console, while other users experience real-time spectator view.
- **Immediate Start vs. Scheduled Start**:
  - **Start Match Immediately**: Creates match with status `'live'`, immediately triggers toss setup and ball-by-ball scoring.
  - **Schedule Match**: Creates match with status `'upcoming'` for future start.
- **Undo & Dismissal Enhancements**:
  - Full delivery undo capability with state rollback.
  - Enhanced support for compound dismissals (No-Ball + Run-Out, Retired Out tracking with return validation, full-width row 2 dismissal details when out, caught & bowled detection).
- **Exit & Action Confirmation**: Modals protect users from accidental navigation or match abandonment during scoring.

### 3. 👥 Player Authentication & Profile System
- **Player Accounts & Strict Authentication**:
  - Player registration and credential authentication (`username` / `password`).
  - Strict security lifecycle: Navigating to root (`/`) clears active session to prevent bypass, requiring fresh authentication to access protected app routes.
- **Airy & Spacious Top Banner**: Modern gradient profile header displaying initials avatar, full name, `@username`, and player type badge (`Batter`, `Bowler`, `All-Rounder`).
- **Personal Details & Teams Played**:
  - Personal details formatted cleanly with 2-row avatar layout and player type badge.
  - Teams Played displayed as a clean comma-separated list of team names.
- **Match History Breakdown**: Directly below teams, displaying matches **Played**, **Won**, **Lost**, **Tied**, and **Abandoned** with color-coded tags and win-rate percentage.
- **Career Performance Analytics**:
  - **Batting**: Innings, Runs, Balls, Highest Score, Average, Strike Rate, 1s, 2s, 3s, 4s, 6s, 50s, Not Outs, Ducks.
  - **Bowling**: Innings, Overs, Maidens, Runs Conceded, Wickets, Economy, 3-Wicket Hauls, 5-Wicket Hauls, Best Bowling figures.
  - **Fielding**: Catches, Run Outs, Stumpings.

### 4. 🛡️ Teams Management & Responsive Custom UI
- **Registered Teams**: Register teams with custom squad sizes (2-15 players), jersey colors, short abbreviations, and roster affiliations.
- **Custom Select Popover Components (`CustomSelect.tsx`)**:
  - Custom responsive popovers replacing standard browser native `<select>` dropdowns across match setup and toss screens.
  - Out-of-bounds containment, text truncation, custom selection checkmarks, and player count subtitles.
- **Streamlined Match Setup**:
  - Select Team 1 and Team 2 from registered squads with instant captain designation.
  - Automatically loads players associated with selected teams.
  - Configure match format, overs (1-50), venue, date, and optional scheduled time.

### 5. 📊 Match Center & Detailed Analytics
- **Live Match Card View**: Dynamic match statuses (`live`, `upcoming`, `completed`, `abandoned`), including real-time Super Over indicators (`Match tied - Super Over in progress`).
- **Comprehensive Scorecards**: Batting scorecards with dismissal reasons and strike rates (restricting scores to row 1 on out deliveries and showing dismissal details full-width in row 2), bowling scorecards with overs, maidens, runs, wickets, and economy.
- **Ball-by-Ball Commentary & Overs Tabs**:
  - Timestamped timeline of every delivery, boundary, extra, and wicket with dark theme contrast optimization.
  - Dedicated Super Over badges (`⚡ SUPER OVER INNINGS`) and isolated over summaries.

---

## 🏗️ Architecture & Data Model

### Data Flow

```
Client Browser (React 18 + TypeScript + Tailwind v4 + ThemeContext)
       │
       ▼ REST API (Axios / Fetch)
Backend Server (Express.js on Node.js)
       ├── ScoringEngine Service (Authoritative cricket rules & Super Over)
       └── StatsSyncService (Automated career & team statistics sync)
       │
       ▼ Atomic Persistence
MongoDB Atlas / Local Database
  ├── matches   (Includes match details + embedded liveState)
  ├── players   (Accounts, roles, career batting/bowling/fielding & match stats)
  └── teams     (Rosters, color codes, team match histories)
```

---

## 🛠️ Technology Stack

### Client (`/client`)
- **React 18** with **TypeScript**
- **Vite** fast frontend build tooling
- **Tailwind CSS v4** responsive utility styling with `@variant dark`
- **ThemeContext** with light/dark persistence, header toggle button, and 2-second animated loader overlay
- **Lucide React** icon library
- **Axios** HTTP client

### Server (`/server`)
- **Node.js** (ES Modules)
- **Express.js** REST API framework
- **MongoDB Node Driver** (Native, high performance)
- **ScoringEngine Service** (Cricket logic processing & Super Over execution)
- **StatsSyncService** (Automated career and team statistics synchronization)
- **CORS** & **Dotenv** configuration

---

## 📁 Repository Structure

```
score-master/
├── client/                      # Frontend Single Page Application
│   ├── src/
│   │   ├── components/          # Reusable UI components (All ThemeContext ready)
│   │   │   ├── BattingCard.tsx       # Live batting stats card & row 2 dismissal detail
│   │   │   ├── BottomNav.tsx         # Mobile-first navigation bar
│   │   │   ├── BowlingCard.tsx       # Live bowling stats card
│   │   │   ├── Commentary.tsx        # Ball-by-ball timeline & Super Over feed
│   │   │   ├── ConfirmationModal.tsx # Safety confirmation dialogs
│   │   │   ├── CustomSelect.tsx      # Custom popover dropdown selector
│   │   │   ├── EndOptionsModal.tsx   # Abandon vs End match choice modal
│   │   │   ├── Header.tsx            # Navigation header & theme toggle button
│   │   │   ├── InningsBreakView.tsx  # Innings break overview screen
│   │   │   ├── MatchCard.tsx         # Summary card for match lists
│   │   │   ├── MatchCompleteView.tsx # Match complete overview screen
│   │   │   ├── MatchSetupForm.tsx    # Match creation setup form
│   │   │   ├── NoBallRunOutConfirmModal.tsx # Compound dismissal dialog
│   │   │   ├── PlayerDetailModal.tsx # Community player detail view
│   │   │   ├── PlayerSelector.tsx    # Opener, bowler & next batsman selector
│   │   │   ├── RunsScoredModal.tsx   # Run-out extra runs selection dialog
│   │   │   ├── ScoringDashboardView.tsx # Primary live scoring control console
│   │   │   ├── TeamDetailModal.tsx   # Team detail view
│   │   │   ├── TiePromptModal.tsx    # Tie prompt choice (Super Over vs End Tied)
│   │   │   ├── TossPage.tsx          # Interactive coin toss & election
│   │   │   └── WicketModal.tsx       # Dismissal selection dialog
│   │   ├── context/
│   │   │   └── ThemeContext.tsx      # Dark/Light theme state & 2s animated transition overlay
│   │   ├── pages/               # Primary application views
│   │   │   ├── HeroPage.tsx          # Welcome / landing showcase (dark theme)
│   │   │   ├── Authentication.tsx    # Login & Player Registration (dark theme aligned)
│   │   │   ├── ProfilePage.tsx       # Player profile & career analytics
│   │   │   ├── LiveScorer.tsx        # Match setup & ball-by-ball scorer
│   │   │   ├── MatchDetail.tsx       # Match scorecard, summary & commentary
│   │   │   ├── PlayersPage.tsx       # Community players directory & stats modal
│   │   │   └── TeamsPage.tsx         # Team roster creation & viewing
│   │   ├── services/
│   │   │   └── api.ts                # Typed REST client endpoints
│   │   ├── types.ts                  # TypeScript interfaces & types
│   │   ├── App.tsx                   # View router & session guard
│   │   └── main.tsx                  # Entry mount with ThemeProvider
│   ├── package.json
│   └── vite.config.ts
│
├── server/                      # Backend API Server
│   ├── index.js                 # Express server & API endpoints
│   ├── models/                  # Domain document schemas
│   │   ├── Match.js             # Match model schema & factory
│   │   ├── Player.js            # Player model & default career stats
│   │   ├── Team.js              # Team model & default match history
│   │   └── index.js
│   ├── services/
│   │   ├── scoringEngine.js     # Authoritative cricket scoring engine
│   │   └── statsSyncService.js  # Automatic career & match stats sync
│   └── package.json
│
└── README.md                    # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **MongoDB** instance (Local MongoDB server or MongoDB Atlas cluster)

### 2. Environment Configuration
Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/Score-Master?retryWrites=true&w=majority
DB_NAME=Score-Master
```

*(Optional)* If hosting backend on a custom domain, configure `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 4. Run Development Servers

**Start Backend Server:**
```bash
cd server
npm start
# Running on http://localhost:5000
```

**Start Frontend Client:**
```bash
cd client
npm run dev
# Running on http://localhost:5173
```

---

## 📄 License

This project is licensed under the MIT License.
