# LexiCraft – Professional Word Puzzle Game

A sleek, production-grade 5-letter word puzzle game engineered with obsidian and emerald aesthetics, daily challenges, unlimited practice mode, hard mode enforcement, rich Web Audio feedback, comprehensive statistics tracking, and full accessibility.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The core styling and gameplay parameters have been confirmed through Phase 1 user alignment:

- **Visual Brand & Aesthetic**: **LexiCraft** – A refined obsidian dark mode and crisp gallery light mode featuring jewel-tone warm emerald accents, subtle borders, geometric typography, and zero-pill layout discipline.
- **Sensory Audio**: Synthesized Web Audio API sound effects for keystrokes, tile pop, flip reveals, shake on invalid word, and victory fanfare chimes, complete with a dedicated sound toggle in the header and settings.
- **Dictionary Architecture**: High-frequency curated 2,500+ common 5-letter solution words paired with a comprehensive 10,000+ valid guess dictionary to prevent frustrating obscure answers while accepting legitimate English vocabulary.
- **Game Modes**:
  1. *Daily Challenge*: Synchronized calendar-day puzzle with streak tracking and a midnight reset countdown.
  2. *Unlimited Practice*: Instant new challenges with replay tracking and historical statistics.
  3. *Hard Mode*: Strict enforcement requiring revealed green letters in fixed positions and revealed yellow letters in subsequent guesses.

---

### 1. Overview & Core Concept

- **What It Does**: Players guess a hidden 5-letter English word in six tries. Each attempt reveals color-coded feedback with authentic letter-frequency accounting (Green = correct spot, Yellow = present in word, Slate = absent). Players can play the global daily challenge or practice infinitely, tracking streaks and guess distribution.
- **Target Audience / Persona**: Word game enthusiasts, daily puzzle solvers, and casual gamers who appreciate minimalist, distraction-free typography, fast tactile interactions, and robust gameplay mechanics.
- **Key Value**: Delivers a premium, commercially finished standalone word game with zero external ad clutter, zero lag, precise duplicate-letter logic, accessibility high-contrast options, and shareable results.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **First-Time / Daily Flow**:
   - Player lands on the game board initialized to today's Daily Challenge.
   - If unopened before, an elegant, lightweight "How to Play" tutorial modal is readily accessible via the header `?` icon.
   - Player inputs letters using physical or on-screen keys with satisfying pop animations and audio clicks.
   - On pressing Enter, validity is checked against the dictionary. If invalid or under 5 letters, row shakes with an unobtrusive toast notification.
   - If valid, letters flip sequentially (150ms stagger) revealing colors and updating on-screen keyboard states.
   - Upon victory or defeat: Game completion modal displays the result, attempt count, streak stats, countdown to the next daily puzzle, and a 1-click "Share Result" button copying clean emoji grids.
2. **Practice Flow**:
   - Switching to "Practice" mode via the header mode pill or end-game modal triggers a fresh board with a randomized common word.
   - Replay button allows uninterrupted practice rounds.
3. **Settings & Customization Flow**:
   - Access settings to toggle Dark/Light mode, Hard Mode, High Contrast (orange/blue colorblind mode), Audio FX, and Reduced Motion.

#### Visual Identity & Theme
- **Color Palette (60-30-10 Rule)**:
  - *Dominant Canvas (60%)*: Obsidian `#090D12` (dark) / Gallery White `#F8FAFC` (light).
  - *Structural Surfaces (30%)*: Deep slate `#111827` / `#1E293B`, subtle hairline borders `#2E3A4D`, neutral tile bases.
  - *Accent Budget (10%)*: Warm Emerald `#10B981` (correct/primary CTA), Amber `#F59E0B` (present letter), and Vivid Sky Blue / Orange in High Contrast mode.
- **Typography**: Clean display sans-serif (`Plus Jakarta Sans` / modern geometric system stack) paired with tabular monospace numerals for statistics and countdown timers.
- **Micro-Interactions**:
  - CSS 3D transform tile flip (`rotateX`) with compositor-only properties.
  - Pop animation on letter entry (`scale(1.1)` settling to `1.0`).
  - Row shake on rejected words (`translateX` oscillation for 300ms).
  - Victory bounce wave across winning row tiles.

---

### 3. Key Product Decisions & Trade-Offs

- **Exact Duplicate-Letter Algorithm**:
  - *Approach*: Two-pass evaluation. Pass 1 identifies exact matches (Green) and decrements available target letter frequencies. Pass 2 identifies present letters (Yellow) only if remaining target count for that letter is > 0; all others become Absent (Slate).
  - *Why*: Prevents misleading hints where guessing "SPEED" against "ERASE" flags both E's yellow when only one exists.
- **Client-Side Word Lists & Zero-Lag Offline Play**:
  - *Approach*: Ship curated word lists directly in TypeScript modules split into solution targets and allowed guesses.
  - *Why*: Guarantees instant sub-millisecond response without API latency, network drops, or third-party quota limits.
- **Persistent State & Streak Isolation**:
  - *Approach*: Store daily game progress, practice statistics, and user settings in structured `localStorage` with versioned schemas. Daily puzzles lock on completion until midnight local time.
  - *Why*: Players can leave and resume active daily puzzles without losing their partial guesses.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                               Header                                   │
│  [Logo: LexiCraft]   [Mode: Daily/Practice]   [Stats] [Help] [Config]  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             Game Board                                 │
│  Row 1: [ T ] [ E ] [ M ] [ P ] [ O ]  <- Active/Evaluated Tiles       │
│  Row 2: [   ] [   ] [   ] [   ] [   ]  <- Current typing row           │
│  Rows 3-6: Empty Grid                                                  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         On-Screen Keyboard                             │
│  [Q] [W] [E] [R] [T] [Y] [U] [I] [O] [P]                               │
│    [A] [S] [D] [F] [G] [H] [J] [K] [L]                                 │
│    [ENTER] [Z] [X] [C] [V] [B] [N] [M] [⌫]                            │
│    (Dynamic color states: Correct > Present > Absent > Unused)         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│   Audio Engine (Web Audio)      │       │     Local Storage State Engine   │
│   - Keystroke clicks            │       │     - Daily Challenge State      │
│   - Tile flip chimes            │       │     - Guess History & Streaks    │
│   - Victory fanfares            │       │     - Settings & Preferences     │
└─────────────────────────────────┘       └──────────────────────────────────┘
```

#### Core Data Entities
```typescript
type LetterStatus = 'correct' | 'present' | 'absent' | 'empty' | 'tbd';

interface EvaluatedLetter {
  char: string;
  status: 'correct' | 'present' | 'absent';
}

interface GameState {
  mode: 'daily' | 'practice';
  targetWord: string;
  guesses: string[];
  currentGuess: string;
  gameStatus: 'IN_PROGRESS' | 'WON' | 'LOST';
  dayIndex: number; // Calendar day identifier for daily mode
  evaluatedRows: EvaluatedLetter[][];
}

interface UserStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
  lastPlayedDate?: string;
}

interface GameSettings {
  theme: 'dark' | 'light';
  hardMode: boolean;
  highContrast: boolean;
  soundEnabled: boolean;
  reducedMotion: boolean;
}
```

#### Interactive Handlers & Transitions
- `handleKeyPress(key: string)`: Validates letter / Enter / Backspace; guards against rapid inputs during flip animations (`isEvaluating`).
- `submitGuess()`:
  1. Validates length === 5.
  2. If Hard Mode, validates retained green positions and yellow letters.
  3. Validates against `isValidWord()` dictionary.
  4. Runs two-pass letter frequency evaluator.
  5. Triggers staggered flip animations with synchronized audio beeps.
  6. Evaluates victory (5 greens) or loss (6 attempts reached).
  7. Updates stats, streak counters, and unlocks Share / Next Round modal.
- `shareResult()`: Generates standard formatted emoji board with mode, day number, and attempt score (e.g., `LexiCraft #42 3/6*`). Uses `navigator.clipboard.writeText` and `navigator.share`.
