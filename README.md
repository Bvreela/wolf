# Ultimate Werewolf — Web Edition

Browser-based multiplayer Ultimate Werewolf with full expansion support, up to 28 players, and solo test mode.

## Quick Start

```bash
cd ultimate-werewolf
npm install
node server.js
```

Open `http://localhost:3000` in your browser.

## Features

**Multiplayer** — Create a game, share the 5-character join code, and play. Real-time via Socket.IO.

**Solo Test Mode** — Spawn up to 28 bots, assign roles, step through every night action manually, view full state diffs, and cast votes for each player. Same engine as live games.

**25+ Data-Driven Roles** across all expansions:

| Team | Roles |
|------|-------|
| Village | Villager, Seer, Robber, Troublemaker, Drunk, Insomniac, Hunter, Mason, Bodyguard, Prince, Apprentice Seer, Revealer, Sentinel, Village Idiot, Witch, Beholder, Curator, Cupid, Diseased, Aura Seer, Paranormal Investigator |
| Werewolf | Werewolf, Alpha Wolf, Mystic Wolf, Dream Wolf, Minion |
| Neutral | Tanner, Doppelgänger, Cursed |

Roles are declarative definitions — add new ones by editing the `ROLES` object in `server.js`.

## How It Works

1. **Lobby** — Host creates game. Players join via code. Host selects roles (click to add, right-click or shift-click to remove).
2. **Night** — Each role acts in strict night order. The engine enforces hidden information — players only see what their role permits.
3. **Day** — Timed discussion phase (5 minutes default). Host calls the vote when ready.
4. **Voting** — Everyone votes simultaneously. Ties eliminate all top-voted players (unless Prince/Bodyguard intervene).
5. **Results** — Full reveal: original roles, final roles (after swaps), center cards, and win condition explanation.

## Architecture

- **Server**: Express + Socket.IO. All game logic is server-authoritative.
- **Client**: Single HTML file with embedded CSS/JS. Stateless — receives only permitted information.
- **Game Engine**: `GameSession` class with immutable event logging, strict night order resolution, and data-driven role definitions.
- **No persistence**: Sessions live in memory. No database required.

## Adding Roles

Add a new entry to the `ROLES` object:

```js
my_new_role: {
  name: 'My Role',
  team: 'village',        // village | werewolf | neutral
  nightOrder: 6,          // -1 for no night action
  actionType: 'view',     // view, swap_self, swap_others, mark, etc.
  targets: { type: 'other_player', count: 1 },
  description: 'Look at one player\'s card.',
  emoji: '🌟'
}
```

The engine handles the rest.
