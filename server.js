const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ─── ROLE DEFINITIONS (Data-Driven) ───────────────────────────────────────────

const ROLES = {
  // ── Core Villagers ──
  villager: {
    name: 'Villager', team: 'village', nightOrder: -1,
    actionType: 'none', targets: null,
    description: 'You have no special abilities. Use your wits to find the werewolves.',
    emoji: '🧑‍🌾'
  },
  seer: {
    name: 'Seer', team: 'village', nightOrder: 5,
    actionType: 'view', targets: { type: 'player_or_center', count: 1, centerCount: 2 },
    description: 'Look at one player\'s card or two center cards.',
    emoji: '🔮'
  },
  robber: {
    name: 'Robber', team: 'village', nightOrder: 7,
    actionType: 'swap_self', targets: { type: 'other_player', count: 1 },
    description: 'Swap your card with another player\'s and view your new card.',
    emoji: '🦹'
  },
  troublemaker: {
    name: 'Troublemaker', team: 'village', nightOrder: 8,
    actionType: 'swap_others', targets: { type: 'other_player', count: 2 },
    description: 'Swap two other players\' cards without looking.',
    emoji: '🃏'
  },
  drunk: {
    name: 'Drunk', team: 'village', nightOrder: 9,
    actionType: 'swap_center', targets: { type: 'center', count: 1 },
    description: 'Swap your card with a center card without looking.',
    emoji: '🍺'
  },
  insomniac: {
    name: 'Insomniac', team: 'village', nightOrder: 12,
    actionType: 'view_self', targets: null,
    description: 'Wake up and look at your card to see if it changed.',
    emoji: '😳'
  },
  hunter: {
    name: 'Hunter', team: 'village', nightOrder: -1,
    actionType: 'none', targets: null,
    description: 'If you are eliminated, the player you voted for also dies.',
    onDeath: 'kill_vote_target',
    emoji: '🏹'
  },
  mason: {
    name: 'Mason', team: 'village', nightOrder: 4,
    actionType: 'reveal_team', targets: null,
    description: 'Wake up and see other Masons.',
    revealTo: 'mason',
    emoji: '🤝'
  },
  bodyguard: {
    name: 'Bodyguard', team: 'village', nightOrder: 11,
    actionType: 'protect', targets: { type: 'other_player', count: 1 },
    description: 'Protect one player from elimination during the vote.',
    emoji: '🛡️'
  },
  prince: {
    name: 'Prince', team: 'village', nightOrder: -1,
    actionType: 'none', targets: null,
    description: 'You cannot be eliminated by voting. Your role is revealed if this saves you.',
    voteImmunity: true,
    emoji: '👑'
  },
  apprentice_seer: {
    name: 'Apprentice Seer', team: 'village', nightOrder: 6,
    actionType: 'view_center', targets: { type: 'center', count: 1 },
    description: 'Look at one center card.',
    emoji: '🔍'
  },
  revealer: {
    name: 'Revealer', team: 'village', nightOrder: 13,
    actionType: 'reveal', targets: { type: 'other_player', count: 1 },
    description: 'Flip another player\'s card face up. If Werewolf or Tanner, it stays hidden.',
    emoji: '👁️'
  },
  sentinel: {
    name: 'Sentinel', team: 'village', nightOrder: 1,
    actionType: 'mark', targets: { type: 'other_player', count: 1 },
    description: 'Place a shield on one player\'s card. It cannot be moved or viewed.',
    markType: 'shield',
    emoji: '⚔️'
  },
  village_idiot: {
    name: 'Village Idiot', team: 'village', nightOrder: 10,
    actionType: 'shift_all', targets: null,
    description: 'Move all other players\' cards one position left or right.',
    emoji: '🤪'
  },
  witch: {
    name: 'Witch', team: 'village', nightOrder: 8,
    actionType: 'view_swap_center', targets: { type: 'center', count: 1, swapTo: 'other_player' },
    description: 'Look at a center card. You may swap it with any player\'s card.',
    emoji: '🧙‍♀️'
  },
  beholder: {
    name: 'Beholder', team: 'village', nightOrder: 5,
    actionType: 'see_role', targets: null,
    description: 'Wake up and see who the Seer is.',
    seeRole: 'seer',
    emoji: '👀'
  },
  curator: {
    name: 'Curator', team: 'village', nightOrder: 13,
    actionType: 'give_artifact', targets: { type: 'other_player', count: 1 },
    description: 'Give a random artifact token to any player.',
    emoji: '🏺'
  },
  // ── Core Werewolves ──
  werewolf: {
    name: 'Werewolf', team: 'werewolf', nightOrder: 3,
    actionType: 'reveal_team', targets: null,
    description: 'Wake with other Werewolves. If alone, view one center card.',
    revealTo: 'werewolf',
    loneAction: { actionType: 'view_center', targets: { type: 'center', count: 1 } },
    emoji: '🐺'
  },
  // ── Advanced Werewolves ──
  alpha_wolf: {
    name: 'Alpha Wolf', team: 'werewolf', nightOrder: 3,
    actionType: 'reveal_team', targets: null,
    description: 'See other Werewolves. After, swap a center card with any other player.',
    revealTo: 'werewolf',
    extraAction: { nightOrder: 7, actionType: 'swap_center_to_player', targets: { type: 'center', count: 1, swapTo: 'other_player' } },
    emoji: '🐺'
  },
  mystic_wolf: {
    name: 'Mystic Wolf', team: 'werewolf', nightOrder: 3,
    actionType: 'reveal_team', targets: null,
    description: 'See other Werewolves. After, look at one player\'s card.',
    revealTo: 'werewolf',
    extraAction: { nightOrder: 6, actionType: 'view', targets: { type: 'other_player', count: 1 } },
    emoji: '🐺'
  },
  dream_wolf: {
    name: 'Dream Wolf', team: 'werewolf', nightOrder: -1,
    actionType: 'none', targets: null,
    description: 'You are a Werewolf but do not wake with the other Werewolves.',
    emoji: '🐺'
  },
  minion: {
    name: 'Minion', team: 'werewolf', nightOrder: 4,
    actionType: 'see_team', targets: null,
    description: 'See all Werewolves. They don\'t know you. You win with them even if you die.',
    seeTeam: 'werewolf',
    winOverride: 'werewolf_team',
    emoji: '👿'
  },
  // ── Neutral ──
  tanner: {
    name: 'Tanner', team: 'neutral', nightOrder: -1,
    actionType: 'none', targets: null,
    description: 'You win only if you are eliminated.',
    winCondition: 'self_eliminated',
    emoji: '💀'
  },
  doppelganger: {
    name: 'Doppelgänger', team: 'village', nightOrder: 0,
    actionType: 'copy', targets: { type: 'other_player', count: 1 },
    description: 'Look at another player\'s card and become that role. Do that role\'s action immediately.',
    emoji: '🎭'
  },
  cursed: {
    name: 'Cursed', team: 'village', nightOrder: -1,
    actionType: 'none', targets: null,
    description: 'You are on the village team, but if a Seer views you, you appear as a Werewolf.',
    appearsAs: 'werewolf',
    emoji: '🌑'
  },
  cupid: {
    name: 'Cupid', team: 'village', nightOrder: 2,
    actionType: 'link', targets: { type: 'player', count: 2 },
    description: 'Choose two players to become linked lovers. They share the same fate.',
    emoji: '💘'
  },
  diseased: {
    name: 'Diseased', team: 'village', nightOrder: -1,
    actionType: 'none', targets: null,
    description: 'If you are eliminated, the players next to you skip their next night action.',
    emoji: '🤢'
  },
  aura_seer: {
    name: 'Aura Seer', team: 'village', nightOrder: 6,
    actionType: 'aura_view', targets: { type: 'other_player', count: 1 },
    description: 'Learn whether a player\'s card has been moved or viewed tonight.',
    emoji: '✨'
  },
  paranormal_investigator: {
    name: 'Paranormal Investigator', team: 'village', nightOrder: 6,
    actionType: 'view_sequential', targets: { type: 'other_player', count: 2 },
    description: 'Look at up to 2 players\' cards. If you see a Werewolf or Tanner, you become that role.',
    emoji: '🕵️'
  },
};

// Artifact tokens for Curator
const ARTIFACTS = [
  'Claw of the Werewolf', 'Brand of the Villager', 'Void of Nothingness',
  'Mask of Muting', 'Shroud of Shame', 'Cudgel of the Tanner',
  'Bow of the Hunter', 'Cloak of the Prince', 'Sword of the Bodyguard'
];

// ─── GAME ENGINE ──────────────────────────────────────────────────────────────

class GameSession {
  constructor(hostId, hostName, options = {}) {
    this.id = this.generateCode();
    this.hostId = hostId;
    this.phase = 'LOBBY';
    this.players = new Map();
    this.roleConfig = [];
    this.centerCards = [];
    this.originalAssignments = {};  // playerId -> roleKey at start
    this.currentAssignments = {};   // playerId -> roleKey (mutable)
    this.centerOriginal = [];
    this.nightActions = [];
    this.nightLog = [];
    this.votes = {};
    this.marks = {};                // playerId -> mark type
    this.links = [];                // cupid links
    this.revealedPlayers = new Set();
    this.protectedPlayers = new Set();
    this.artifacts = {};            // playerId -> artifact
    this.nightActionIndex = 0;
    this.nightQueue = [];
    this.pendingActions = new Map(); // playerId -> expected action
    this.dayTimer = options.dayTimer || 300;
    this.isSoloTest = options.isSoloTest || false;
    this.maxPlayers = options.maxPlayers || 28;
    this.eventLog = [];
    this.touchedCards = new Set();   // cards viewed or moved this night
    this.doppelgangerRole = null;    // what role doppelganger copied

    this.addPlayer(hostId, hostName);
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  addPlayer(id, name) {
    if (this.players.size >= this.maxPlayers) return { error: 'Game is full' };
    if (this.phase !== 'LOBBY') return { error: 'Game already started' };
    this.players.set(id, {
      id, name, ready: false, alive: true, connected: true, role: null
    });
    return { success: true };
  }

  removePlayer(id) {
    if (this.phase !== 'LOBBY') {
      const p = this.players.get(id);
      if (p) p.connected = false;
      return;
    }
    this.players.delete(id);
  }

  setReady(id, ready) {
    const p = this.players.get(id);
    if (p) p.ready = ready;
  }

  // ── Setup ──

  setRoles(roleKeys) {
    this.roleConfig = roleKeys;
  }

  validateSetup() {
    const playerCount = this.players.size;
    const centerCount = Math.min(3, Math.floor(playerCount / 6) + 1);
    const needed = playerCount + centerCount;
    if (this.roleConfig.length !== needed) {
      return { valid: false, error: `Need exactly ${needed} roles (${playerCount} players + ${centerCount} center). Got ${this.roleConfig.length}.` };
    }
    for (const rk of this.roleConfig) {
      if (!ROLES[rk]) return { valid: false, error: `Unknown role: ${rk}` };
    }
    return { valid: true, centerCount };
  }

  startGame() {
    const validation = this.validateSetup();
    if (!validation.valid) return validation;

    const shuffled = [...this.roleConfig].sort(() => Math.random() - 0.5);
    const playerIds = [...this.players.keys()];
    const centerCount = validation.centerCount;

    // Assign to players
    for (let i = 0; i < playerIds.length; i++) {
      const pid = playerIds[i];
      const roleKey = shuffled[i];
      this.originalAssignments[pid] = roleKey;
      this.currentAssignments[pid] = roleKey;
      this.players.get(pid).role = roleKey;
    }

    // Center cards
    this.centerCards = shuffled.slice(playerIds.length);
    this.centerOriginal = [...this.centerCards];

    this.phase = 'NIGHT';
    this.buildNightQueue();
    this.logEvent('game_start', { players: playerIds.length, center: centerCount });
    return { valid: true };
  }

  // ── Night Phase ──

  buildNightQueue() {
    this.nightQueue = [];
    const playerIds = [...this.players.keys()];

    for (const pid of playerIds) {
      const roleKey = this.originalAssignments[pid];
      const role = ROLES[roleKey];
      if (role && role.nightOrder >= 0) {
        this.nightQueue.push({ playerId: pid, roleKey, nightOrder: role.nightOrder, isExtra: false });
      }
      // Extra actions (e.g., Alpha Wolf, Mystic Wolf)
      if (role && role.extraAction) {
        this.nightQueue.push({ playerId: pid, roleKey, nightOrder: role.extraAction.nightOrder, isExtra: true });
      }
    }

    this.nightQueue.sort((a, b) => a.nightOrder - b.nightOrder);
    this.nightActionIndex = 0;
  }

  getCurrentNightAction() {
    if (this.nightActionIndex >= this.nightQueue.length) return null;
    return this.nightQueue[this.nightActionIndex];
  }

  getPlayerNightPrompt(playerId) {
    const action = this.getCurrentNightAction();
    if (!action || action.playerId !== playerId) return null;

    const role = ROLES[action.roleKey];
    let actionDef = action.isExtra ? role.extraAction : role;

    // Handle automatic actions
    if (actionDef.actionType === 'reveal_team' || actionDef.actionType === 'see_team' || actionDef.actionType === 'see_role') {
      return { auto: true, roleKey: action.roleKey, actionType: actionDef.actionType };
    }
    if (actionDef.actionType === 'view_self') {
      return { auto: true, roleKey: action.roleKey, actionType: 'view_self' };
    }
    if (actionDef.actionType === 'shift_all') {
      return {
        roleKey: action.roleKey,
        actionType: 'shift_all',
        prompt: 'Choose direction to shift all cards:',
        choices: ['left', 'right']
      };
    }

    const targets = actionDef.targets;
    if (!targets) return { auto: true, roleKey: action.roleKey, actionType: actionDef.actionType };

    const otherPlayers = [...this.players.keys()].filter(p => p !== playerId);
    let targetOptions = [];

    switch (targets.type) {
      case 'other_player':
        targetOptions = otherPlayers.map(p => ({
          id: p, name: this.players.get(p).name,
          shielded: this.marks[p] === 'shield'
        }));
        break;
      case 'player':
        targetOptions = [...this.players.keys()].map(p => ({
          id: p, name: this.players.get(p).name,
          shielded: this.marks[p] === 'shield'
        }));
        break;
      case 'player_or_center':
        targetOptions = [
          ...otherPlayers.map(p => ({ id: p, name: this.players.get(p).name, type: 'player', shielded: this.marks[p] === 'shield' })),
          ...this.centerCards.map((_, i) => ({ id: `center_${i}`, name: `Center Card ${i + 1}`, type: 'center' }))
        ];
        break;
      case 'center':
        targetOptions = this.centerCards.map((_, i) => ({ id: `center_${i}`, name: `Center Card ${i + 1}`, type: 'center' }));
        break;
    }

    return {
      roleKey: action.roleKey,
      actionType: actionDef.actionType,
      prompt: `${role.name}: ${role.description}`,
      targets: targetOptions,
      selectCount: targets.count || 1,
      centerCount: targets.centerCount || 0,
      isExtra: action.isExtra
    };
  }

  resolveNightAction(playerId, choices) {
    const action = this.getCurrentNightAction();
    if (!action || action.playerId !== playerId) return { error: 'Not your turn' };

    const role = ROLES[action.roleKey];
    let actionDef = action.isExtra ? role.extraAction : role;
    let result = {};

    switch (actionDef.actionType) {
      case 'reveal_team': {
        // Werewolves see each other, Masons see each other
        const team = role.revealTo;
        const teammates = [...this.players.keys()].filter(p =>
          p !== playerId && ROLES[this.originalAssignments[p]]?.revealTo === team
        );
        if (teammates.length === 0 && role.loneAction) {
          // Lone werewolf can view center
          result = { info: `You are the only ${role.name}.`, needsFollowUp: true, followUpAction: role.loneAction };
        } else {
          result = {
            info: teammates.length > 0
              ? `Your ${team} allies: ${teammates.map(p => this.players.get(p).name).join(', ')}`
              : `You are the only ${role.name}.`
          };
        }
        break;
      }
      case 'see_team': {
        const team = role.seeTeam;
        const members = [...this.players.keys()].filter(p =>
          ROLES[this.originalAssignments[p]]?.team === team && p !== playerId
        );
        result = {
          info: members.length > 0
            ? `${team} members: ${members.map(p => this.players.get(p).name).join(', ')}`
            : `No ${team} members found.`
        };
        break;
      }
      case 'see_role': {
        const targetRole = role.seeRole;
        const holder = [...this.players.keys()].find(p => this.originalAssignments[p] === targetRole);
        result = {
          info: holder ? `The ${ROLES[targetRole].name} is ${this.players.get(holder).name}` : `No ${ROLES[targetRole].name} in this game.`
        };
        break;
      }
      case 'view': {
        if (!choices || choices.length < 1) return { error: 'Must select a target' };
        const target = choices[0];
        if (target.startsWith('center_')) {
          const idx = parseInt(target.split('_')[1]);
          this.touchedCards.add(target);
          if (choices.length >= 2 && choices[1].startsWith('center_')) {
            const idx2 = parseInt(choices[1].split('_')[1]);
            this.touchedCards.add(choices[1]);
            result = { info: `Center cards: ${ROLES[this.centerCards[idx]]?.name || '?'} and ${ROLES[this.centerCards[idx2]]?.name || '?'}` };
          } else {
            result = { info: `Center card ${idx + 1}: ${ROLES[this.centerCards[idx]]?.name || '?'}` };
          }
        } else {
          if (this.marks[target] === 'shield') {
            result = { info: `${this.players.get(target).name}'s card is shielded. You cannot view it.` };
          } else {
            this.touchedCards.add(target);
            const viewedRole = this.currentAssignments[target];
            // Cursed appears as werewolf to seers
            const apparentRole = (ROLES[this.originalAssignments[target]]?.appearsAs === 'werewolf' && role.actionType === 'view')
              ? 'werewolf' : viewedRole;
            result = { info: `${this.players.get(target).name} is the ${ROLES[apparentRole]?.name || '?'}` };
          }
        }
        break;
      }
      case 'view_center': {
        if (!choices || choices.length < 1) return { error: 'Must select a center card' };
        const idx = parseInt(choices[0].split('_')[1]);
        this.touchedCards.add(choices[0]);
        result = { info: `Center card ${idx + 1}: ${ROLES[this.centerCards[idx]]?.name || '?'}` };
        break;
      }
      case 'swap_self': {
        if (!choices || choices.length < 1) return { error: 'Must select a target' };
        const target = choices[0];
        if (this.marks[target] === 'shield') {
          result = { info: `${this.players.get(target).name}'s card is shielded. Swap blocked.` };
        } else {
          const myRole = this.currentAssignments[playerId];
          const theirRole = this.currentAssignments[target];
          this.currentAssignments[playerId] = theirRole;
          this.currentAssignments[target] = myRole;
          this.touchedCards.add(playerId);
          this.touchedCards.add(target);
          result = { info: `You are now the ${ROLES[theirRole]?.name || '?'}` };
        }
        break;
      }
      case 'swap_others': {
        if (!choices || choices.length < 2) return { error: 'Must select two targets' };
        const [t1, t2] = choices;
        if (this.marks[t1] === 'shield' || this.marks[t2] === 'shield') {
          result = { info: 'One of the targets is shielded. Swap partially blocked.' };
          // Only swap if neither is shielded
          if (this.marks[t1] !== 'shield' && this.marks[t2] !== 'shield') {
            const r1 = this.currentAssignments[t1];
            this.currentAssignments[t1] = this.currentAssignments[t2];
            this.currentAssignments[t2] = r1;
          }
        } else {
          const r1 = this.currentAssignments[t1];
          this.currentAssignments[t1] = this.currentAssignments[t2];
          this.currentAssignments[t2] = r1;
          this.touchedCards.add(t1);
          this.touchedCards.add(t2);
          result = { info: `Swapped ${this.players.get(t1).name} and ${this.players.get(t2).name}.` };
        }
        break;
      }
      case 'swap_center': {
        if (!choices || choices.length < 1) return { error: 'Must select a center card' };
        const idx = parseInt(choices[0].split('_')[1]);
        const myRole = this.currentAssignments[playerId];
        this.currentAssignments[playerId] = this.centerCards[idx];
        this.centerCards[idx] = myRole;
        this.touchedCards.add(playerId);
        this.touchedCards.add(choices[0]);
        result = { info: 'You swapped your card with a center card (you don\'t know what you got).' };
        break;
      }
      case 'view_self': {
        const currentRole = this.currentAssignments[playerId];
        result = { info: `Your current card is: ${ROLES[currentRole]?.name || '?'}` };
        break;
      }
      case 'mark': {
        if (!choices || choices.length < 1) return { error: 'Must select a target' };
        this.marks[choices[0]] = role.markType || 'shield';
        result = { info: `Placed ${role.markType || 'shield'} on ${this.players.get(choices[0]).name}.` };
        break;
      }
      case 'protect': {
        if (!choices || choices.length < 1) return { error: 'Must select a target' };
        this.protectedPlayers.add(choices[0]);
        result = { info: `${this.players.get(choices[0]).name} is protected from elimination.` };
        break;
      }
      case 'link': {
        if (!choices || choices.length < 2) return { error: 'Must select two players' };
        this.links.push([choices[0], choices[1]]);
        result = { info: `Linked ${this.players.get(choices[0]).name} and ${this.players.get(choices[1]).name}.` };
        break;
      }
      case 'copy': {
        if (!choices || choices.length < 1) return { error: 'Must select a target' };
        const target = choices[0];
        const copiedRole = this.currentAssignments[target];
        this.doppelgangerRole = copiedRole;
        this.touchedCards.add(target);
        result = { info: `You copied ${this.players.get(target).name}'s role: ${ROLES[copiedRole]?.name || '?'}. You will perform their action.` };
        // Insert doppelganger's copied action into queue
        const copiedDef = ROLES[copiedRole];
        if (copiedDef && copiedDef.nightOrder >= 0) {
          this.nightQueue.splice(this.nightActionIndex + 1, 0, {
            playerId, roleKey: copiedRole, nightOrder: copiedDef.nightOrder + 0.1, isExtra: false, isDoppelganger: true
          });
        }
        break;
      }
      case 'shift_all': {
        if (!choices || choices.length < 1) return { error: 'Must choose direction' };
        const dir = choices[0]; // 'left' or 'right'
        const pids = [...this.players.keys()].filter(p => p !== playerId);
        if (pids.length > 1) {
          const roles = pids.map(p => this.currentAssignments[p]);
          if (dir === 'left') {
            const first = roles.shift();
            roles.push(first);
          } else {
            const last = roles.pop();
            roles.unshift(last);
          }
          pids.forEach((p, i) => {
            this.currentAssignments[p] = roles[i];
            this.touchedCards.add(p);
          });
        }
        result = { info: `Shifted all cards ${dir}.` };
        break;
      }
      case 'aura_view': {
        if (!choices || choices.length < 1) return { error: 'Must select a target' };
        const target = choices[0];
        const wasTouched = this.touchedCards.has(target);
        result = { info: `${this.players.get(target).name}'s card ${wasTouched ? 'WAS' : 'was NOT'} viewed or moved tonight.` };
        break;
      }
      case 'view_sequential': {
        if (!choices || choices.length < 1) return { error: 'Must select at least one target' };
        let infoParts = [];
        let becameEvil = false;
        for (const target of choices.slice(0, 2)) {
          if (this.marks[target] === 'shield') {
            infoParts.push(`${this.players.get(target).name} is shielded.`);
            continue;
          }
          const viewedRole = this.currentAssignments[target];
          this.touchedCards.add(target);
          infoParts.push(`${this.players.get(target).name} is ${ROLES[viewedRole]?.name || '?'}`);
          if (viewedRole === 'werewolf' || viewedRole === 'tanner') {
            // PI becomes that role
            this.currentAssignments[playerId] = viewedRole;
            infoParts.push(`You have become the ${ROLES[viewedRole].name}!`);
            becameEvil = true;
            break; // Stop looking
          }
        }
        result = { info: infoParts.join(' ') };
        break;
      }
      case 'view_swap_center': {
        if (!choices || choices.length < 1) return { error: 'Must select a center card' };
        const idx = parseInt(choices[0].split('_')[1]);
        const centerRole = this.centerCards[idx];
        this.touchedCards.add(choices[0]);
        let infoMsg = `Center card ${idx + 1}: ${ROLES[centerRole]?.name || '?'}.`;
        if (choices.length >= 2) {
          const swapTarget = choices[1];
          if (this.marks[swapTarget] === 'shield') {
            infoMsg += ` ${this.players.get(swapTarget).name} is shielded. Swap blocked.`;
          } else {
            const playerRole = this.currentAssignments[swapTarget];
            this.currentAssignments[swapTarget] = this.centerCards[idx];
            this.centerCards[idx] = playerRole;
            this.touchedCards.add(swapTarget);
            infoMsg += ` Swapped with ${this.players.get(swapTarget).name}.`;
          }
        } else {
          infoMsg += ' You chose not to swap.';
        }
        result = { info: infoMsg };
        break;
      }
      case 'reveal': {
        if (!choices || choices.length < 1) return { error: 'Must select a target' };
        const target = choices[0];
        if (this.marks[target] === 'shield') {
          result = { info: `${this.players.get(target).name} is shielded.` };
        } else {
          const revealedRole = this.currentAssignments[target];
          if (revealedRole === 'werewolf' || revealedRole === 'tanner') {
            result = { info: `${this.players.get(target).name}'s card stays hidden (Werewolf or Tanner).` };
          } else {
            this.revealedPlayers.add(target);
            result = { info: `${this.players.get(target).name} is revealed as ${ROLES[revealedRole]?.name || '?'}.` };
          }
        }
        break;
      }
      case 'give_artifact': {
        if (!choices || choices.length < 1) return { error: 'Must select a target' };
        const artifact = ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)];
        this.artifacts[choices[0]] = artifact;
        result = { info: `Gave ${artifact} to ${this.players.get(choices[0]).name}.` };
        break;
      }
      case 'swap_center_to_player': {
        if (!choices || choices.length < 2) return { error: 'Must select center card and player' };
        const cidx = parseInt(choices[0].split('_')[1]);
        const target = choices[1];
        if (this.marks[target] === 'shield') {
          result = { info: `${this.players.get(target).name} is shielded.` };
        } else {
          const playerRole = this.currentAssignments[target];
          this.currentAssignments[target] = this.centerCards[cidx];
          this.centerCards[cidx] = playerRole;
          this.touchedCards.add(target);
          this.touchedCards.add(choices[0]);
          result = { info: `Swapped center card ${cidx + 1} with ${this.players.get(target).name}.` };
        }
        break;
      }
      default:
        result = { info: 'No action needed.' };
    }

    this.logEvent('night_action', {
      player: playerId,
      role: action.roleKey,
      action: actionDef.actionType,
      choices,
      result: result.info
    });

    this.nightActionIndex++;
    return result;
  }

  advanceNight() {
    // Skip to next action or end night
    while (this.nightActionIndex < this.nightQueue.length) {
      const action = this.nightQueue[this.nightActionIndex];
      const role = ROLES[action.roleKey];
      const actionDef = action.isExtra ? role.extraAction : role;

      // Auto-resolve passive reveals
      if (['reveal_team', 'see_team', 'see_role', 'view_self'].includes(actionDef.actionType)) {
        const autoResult = this.resolveNightAction(action.playerId, []);
        return { waiting: action.playerId, auto: true, result: autoResult };
      }
      return { waiting: action.playerId };
    }
    // Night is over
    this.phase = 'DAY';
    this.logEvent('phase_change', { phase: 'DAY' });
    return { nightOver: true };
  }

  isNightComplete() {
    return this.nightActionIndex >= this.nightQueue.length;
  }

  // ── Day & Voting ──

  startVoting() {
    this.phase = 'VOTING';
    this.votes = {};
    this.logEvent('phase_change', { phase: 'VOTING' });
  }

  castVote(playerId, targetId) {
    if (this.phase !== 'VOTING') return { error: 'Not in voting phase' };
    this.votes[playerId] = targetId;
    return { success: true };
  }

  allVotesIn() {
    const alivePlayers = [...this.players.keys()].filter(p => this.players.get(p).alive);
    return alivePlayers.every(p => this.votes[p] !== undefined);
  }

  resolveVotes() {
    const tally = {};
    for (const [voter, target] of Object.entries(this.votes)) {
      if (!target || target === 'no_vote') continue;
      tally[target] = (tally[target] || 0) + 1;
    }

    if (Object.keys(tally).length === 0) {
      return this.resolveWin([]);
    }

    const maxVotes = Math.max(...Object.values(tally));
    let eliminated = Object.entries(tally).filter(([_, v]) => v === maxVotes).map(([p, _]) => p);

    // Check prince immunity
    eliminated = eliminated.filter(p => {
      const roleKey = this.currentAssignments[p];
      if (ROLES[roleKey]?.voteImmunity) {
        this.revealedPlayers.add(p);
        this.logEvent('prince_saved', { player: p });
        return false;
      }
      return true;
    });

    // Check bodyguard protection
    eliminated = eliminated.filter(p => !this.protectedPlayers.has(p));

    // Mark eliminated
    for (const pid of eliminated) {
      this.players.get(pid).alive = false;
    }

    // Hunter ability
    for (const pid of eliminated) {
      const roleKey = this.currentAssignments[pid];
      if (ROLES[roleKey]?.onDeath === 'kill_vote_target') {
        const hunterTarget = this.votes[pid];
        if (hunterTarget && hunterTarget !== 'no_vote' && this.players.get(hunterTarget)?.alive) {
          this.players.get(hunterTarget).alive = false;
          eliminated.push(hunterTarget);
          this.logEvent('hunter_kill', { hunter: pid, target: hunterTarget });
        }
      }
    }

    // Linked players die together
    for (const [a, b] of this.links) {
      if (eliminated.includes(a) && !eliminated.includes(b) && this.players.get(b)?.alive) {
        this.players.get(b).alive = false;
        eliminated.push(b);
      }
      if (eliminated.includes(b) && !eliminated.includes(a) && this.players.get(a)?.alive) {
        this.players.get(a).alive = false;
        eliminated.push(a);
      }
    }

    this.logEvent('elimination', { eliminated, tally });
    return this.resolveWin(eliminated);
  }

  // ── Win Resolution ──

  resolveWin(eliminated) {
    this.phase = 'RESULTS';
    const results = {
      eliminated: eliminated.map(p => ({
        id: p,
        name: this.players.get(p).name,
        originalRole: ROLES[this.originalAssignments[p]]?.name,
        finalRole: ROLES[this.currentAssignments[p]]?.name
      })),
      winners: [],
      explanation: [],
      allRoles: {}
    };

    // Build final role map
    for (const [pid, _] of this.players) {
      results.allRoles[pid] = {
        name: this.players.get(pid).name,
        originalRole: ROLES[this.originalAssignments[pid]]?.name,
        finalRole: ROLES[this.currentAssignments[pid]]?.name,
        originalRoleKey: this.originalAssignments[pid],
        finalRoleKey: this.currentAssignments[pid]
      };
    }
    results.centerCards = this.centerCards.map(rk => ROLES[rk]?.name || '?');

    // Check Tanner win
    const tannerWin = eliminated.some(p => {
      const finalRole = this.currentAssignments[p];
      return finalRole === 'tanner';
    });

    if (tannerWin) {
      const tanners = eliminated.filter(p => this.currentAssignments[p] === 'tanner');
      for (const t of tanners) {
        results.winners.push({ id: t, name: this.players.get(t).name, team: 'tanner' });
      }
      results.explanation.push('Tanner was eliminated and wins!');
    }

    // Check if any werewolf was eliminated
    const werewolfEliminated = eliminated.some(p => {
      const finalRole = this.currentAssignments[p];
      return ROLES[finalRole]?.team === 'werewolf' && finalRole !== 'minion';
    });

    // Check if werewolves exist
    const werewolvesExist = [...this.players.keys()].some(p => {
      const finalRole = this.currentAssignments[p];
      return ROLES[finalRole]?.team === 'werewolf' && finalRole !== 'minion';
    });

    if (!werewolvesExist) {
      // No werewolves - village wins if no one dies
      if (eliminated.length === 0) {
        for (const [pid, _] of this.players) {
          if (ROLES[this.currentAssignments[pid]]?.team === 'village') {
            results.winners.push({ id: pid, name: this.players.get(pid).name, team: 'village' });
          }
        }
        results.explanation.push('No werewolves in the game and no one was eliminated. Village wins!');
      } else if (!tannerWin) {
        // Someone died but no werewolves - everyone loses (unless tanner)
        results.explanation.push('No werewolves in the game but someone was eliminated. No one wins.');
      }
    } else if (werewolfEliminated) {
      // Village team wins
      for (const [pid, _] of this.players) {
        const finalRole = this.currentAssignments[pid];
        if (ROLES[finalRole]?.team === 'village') {
          results.winners.push({ id: pid, name: this.players.get(pid).name, team: 'village' });
        }
      }
      results.explanation.push('A werewolf was eliminated. Village wins!');
    } else {
      // Werewolves survive
      for (const [pid, _] of this.players) {
        const finalRole = this.currentAssignments[pid];
        if (ROLES[finalRole]?.team === 'werewolf') {
          results.winners.push({ id: pid, name: this.players.get(pid).name, team: 'werewolf' });
        }
      }
      results.explanation.push('No werewolf was eliminated. Werewolf team wins!');
    }

    // Minion wins with werewolves
    if (results.winners.some(w => w.team === 'werewolf')) {
      for (const [pid, _] of this.players) {
        if (this.currentAssignments[pid] === 'minion' && !results.winners.find(w => w.id === pid)) {
          results.winners.push({ id: pid, name: this.players.get(pid).name, team: 'werewolf' });
        }
      }
    }

    this.logEvent('game_end', results);
    return results;
  }

  // ── Utilities ──

  logEvent(type, data) {
    this.eventLog.push({ type, data, timestamp: Date.now() });
  }

  getPublicState() {
    return {
      id: this.id,
      phase: this.phase,
      players: [...this.players.values()].map(p => ({
        id: p.id, name: p.name, ready: p.ready, alive: p.alive, connected: p.connected,
        revealed: this.revealedPlayers.has(p.id) ? ROLES[this.currentAssignments[p.id]]?.name : null,
        artifact: this.artifacts[p.id] || null
      })),
      hostId: this.hostId,
      roleConfig: this.roleConfig,
      dayTimer: this.dayTimer,
      isSoloTest: this.isSoloTest,
      centerCount: this.centerCards.length,
      votes: this.phase === 'RESULTS' ? this.votes : Object.fromEntries(Object.entries(this.votes).map(([k, v]) => [k, '***'])),
      marks: Object.keys(this.marks).length > 0 ? Object.fromEntries(Object.entries(this.marks).map(([k, v]) => [k, v])) : {}
    };
  }

  getPlayerView(playerId) {
    const state = this.getPublicState();
    const player = this.players.get(playerId);
    if (!player) return state;

    state.myRole = this.phase === 'RESULTS'
      ? { original: this.originalAssignments[playerId], current: this.currentAssignments[playerId] }
      : { original: this.originalAssignments[playerId] };
    state.isHost = playerId === this.hostId;
    return state;
  }

  getFullState() {
    return {
      ...this.getPublicState(),
      originalAssignments: Object.fromEntries(
        Object.entries(this.originalAssignments).map(([k, v]) => [k, { role: v, name: ROLES[v]?.name }])
      ),
      currentAssignments: Object.fromEntries(
        Object.entries(this.currentAssignments).map(([k, v]) => [k, { role: v, name: ROLES[v]?.name }])
      ),
      centerCards: this.centerCards.map(rk => ({ role: rk, name: ROLES[rk]?.name })),
      centerOriginal: this.centerOriginal.map(rk => ({ role: rk, name: ROLES[rk]?.name })),
      nightQueue: this.nightQueue,
      nightActionIndex: this.nightActionIndex,
      eventLog: this.eventLog,
      marks: this.marks,
      links: this.links,
      touchedCards: [...this.touchedCards],
      votes: this.votes
    };
  }
}

// ─── SESSION MANAGER ──────────────────────────────────────────────────────────

const sessions = new Map();

function findSession(code) {
  return sessions.get(code.toUpperCase());
}

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  let currentSession = null;
  let playerId = uuidv4();

  socket.emit('connected', { playerId });

  // ── Lobby ──

  socket.on('create_game', ({ name, isSoloTest }, cb) => {
    const session = new GameSession(playerId, name, { isSoloTest });
    sessions.set(session.id, session);
    currentSession = session;
    socket.join(session.id);
    cb({ success: true, code: session.id, playerId });
    io.to(session.id).emit('state_update', session.getPublicState());
  });

  socket.on('join_game', ({ code, name }, cb) => {
    const session = findSession(code);
    if (!session) return cb({ error: 'Game not found' });
    const result = session.addPlayer(playerId, name);
    if (result.error) return cb(result);
    currentSession = session;
    socket.join(session.id);
    cb({ success: true, code: session.id, playerId });
    io.to(session.id).emit('state_update', session.getPublicState());
  });

  socket.on('set_ready', ({ ready }) => {
    if (!currentSession) return;
    currentSession.setReady(playerId, ready);
    io.to(currentSession.id).emit('state_update', currentSession.getPublicState());
  });

  // ── Role Config ──

  socket.on('set_roles', ({ roles }, cb) => {
    if (!currentSession || playerId !== currentSession.hostId) return cb?.({ error: 'Not host' });
    currentSession.setRoles(roles);
    io.to(currentSession.id).emit('state_update', currentSession.getPublicState());
    cb?.({ success: true });
  });

  socket.on('validate_setup', (_, cb) => {
    if (!currentSession) return cb?.({ error: 'No session' });
    cb?.(currentSession.validateSetup());
  });

  // ── Game Start ──

  socket.on('start_game', (_, cb) => {
    if (!currentSession || playerId !== currentSession.hostId) return cb?.({ error: 'Not host' });
    const result = currentSession.startGame();
    if (!result.valid) return cb?.(result);

    cb?.({ success: true });

    // Send each player their role
    for (const [pid, p] of currentSession.players) {
      const sockets = [...io.sockets.sockets.values()];
      // We need to find the socket for this player - use room membership
      io.to(currentSession.id).emit('game_started', {});
    }

    // Send personalized state to each connected socket
    broadcastPlayerViews(currentSession);

    // Start night phase
    processNightPhase(currentSession);
  });

  // ── Night Actions ──

  socket.on('night_action', ({ choices }, cb) => {
    if (!currentSession || currentSession.phase !== 'NIGHT') return cb?.({ error: 'Not night phase' });
    const result = currentSession.resolveNightAction(playerId, choices);
    cb?.(result);
    processNightPhase(currentSession);
  });

  socket.on('skip_night_action', (_, cb) => {
    if (!currentSession || currentSession.phase !== 'NIGHT') return cb?.({ error: 'Not night' });
    const action = currentSession.getCurrentNightAction();
    if (action && action.playerId === playerId) {
      currentSession.resolveNightAction(playerId, []);
      cb?.({ success: true });
      processNightPhase(currentSession);
    }
  });

  // ── Day & Voting ──

  socket.on('start_voting', (_, cb) => {
    if (!currentSession) return cb?.({ error: 'No session' });
    if (playerId !== currentSession.hostId && !currentSession.isSoloTest) return cb?.({ error: 'Not host' });
    currentSession.startVoting();
    io.to(currentSession.id).emit('state_update', currentSession.getPublicState());
    broadcastPlayerViews(currentSession);
    cb?.({ success: true });
  });

  socket.on('cast_vote', ({ target }, cb) => {
    if (!currentSession) return cb?.({ error: 'No session' });
    const result = currentSession.castVote(playerId, target);
    cb?.(result);
    io.to(currentSession.id).emit('vote_cast', { voter: playerId, hasVoted: true });

    if (currentSession.allVotesIn()) {
      const results = currentSession.resolveVotes();
      io.to(currentSession.id).emit('game_results', results);
      io.to(currentSession.id).emit('state_update', currentSession.getPublicState());
    }
  });

  // ── Solo Test Mode ──

  socket.on('solo_add_bot', ({ name }, cb) => {
    if (!currentSession || !currentSession.isSoloTest) return cb?.({ error: 'Not solo mode' });
    const botId = `bot_${uuidv4().slice(0, 8)}`;
    const result = currentSession.addPlayer(botId, name || `Bot ${currentSession.players.size}`);
    cb?.({ ...result, botId });
    io.to(currentSession.id).emit('state_update', currentSession.getPublicState());
  });

  socket.on('solo_get_full_state', (_, cb) => {
    if (!currentSession || !currentSession.isSoloTest) return cb?.({ error: 'Not solo mode' });
    cb?.(currentSession.getFullState());
  });

  socket.on('solo_night_action_for', ({ forPlayerId, choices }, cb) => {
    if (!currentSession || !currentSession.isSoloTest) return cb?.({ error: 'Not solo mode' });
    const action = currentSession.getCurrentNightAction();
    if (!action || action.playerId !== forPlayerId) return cb?.({ error: 'Not this player\'s turn' });
    const result = currentSession.resolveNightAction(forPlayerId, choices);
    cb?.(result);
    processNightPhase(currentSession);
  });

  socket.on('solo_cast_vote_for', ({ forPlayerId, target }, cb) => {
    if (!currentSession || !currentSession.isSoloTest) return cb?.({ error: 'Not solo mode' });
    currentSession.castVote(forPlayerId, target);
    cb?.({ success: true });
    io.to(currentSession.id).emit('vote_cast', { voter: forPlayerId, hasVoted: true });
    if (currentSession.allVotesIn()) {
      const results = currentSession.resolveVotes();
      io.to(currentSession.id).emit('game_results', results);
    }
  });

  // ── Meta ──

  socket.on('get_roles', (_, cb) => {
    cb?.(ROLES);
  });

  socket.on('get_state', (_, cb) => {
    if (!currentSession) return cb?.({ error: 'No session' });
    cb?.(currentSession.getPlayerView(playerId));
  });

  socket.on('return_to_lobby', (_, cb) => {
    if (!currentSession || playerId !== currentSession.hostId) return cb?.({ error: 'Not host' });
    // Reset session
    currentSession.phase = 'LOBBY';
    currentSession.originalAssignments = {};
    currentSession.currentAssignments = {};
    currentSession.centerCards = [];
    currentSession.nightQueue = [];
    currentSession.nightActionIndex = 0;
    currentSession.votes = {};
    currentSession.marks = {};
    currentSession.links = [];
    currentSession.revealedPlayers.clear();
    currentSession.protectedPlayers.clear();
    currentSession.artifacts = {};
    currentSession.eventLog = [];
    currentSession.touchedCards.clear();
    for (const [_, p] of currentSession.players) {
      p.alive = true;
      p.ready = false;
      p.role = null;
    }
    io.to(currentSession.id).emit('state_update', currentSession.getPublicState());
    cb?.({ success: true });
  });

  socket.on('disconnect', () => {
    if (currentSession) {
      currentSession.removePlayer(playerId);
      io.to(currentSession.id).emit('state_update', currentSession.getPublicState());
      // Clean up empty sessions
      if (currentSession.players.size === 0) {
        sessions.delete(currentSession.id);
      }
    }
  });
});

function processNightPhase(session) {
  if (session.phase !== 'NIGHT') return;

  const action = session.getCurrentNightAction();
  if (!action) {
    // Night is over
    session.phase = 'DAY';
    session.logEvent('phase_change', { phase: 'DAY' });
    io.to(session.id).emit('phase_change', { phase: 'DAY' });
    broadcastPlayerViews(session);
    return;
  }

  const role = ROLES[action.roleKey];
  const actionDef = action.isExtra ? role.extraAction : role;

  // Auto-resolve passive actions
  if (['reveal_team', 'see_team', 'see_role', 'view_self'].includes(actionDef.actionType)) {
    const result = session.resolveNightAction(action.playerId, []);
    // Send result to the player
    io.to(session.id).emit('night_action_result', {
      playerId: action.playerId,
      roleKey: action.roleKey,
      result
    });
    // Continue processing
    setTimeout(() => processNightPhase(session), 100);
    return;
  }

  // Actions that need no input
  if (actionDef.actionType === 'none') {
    session.nightActionIndex++;
    setTimeout(() => processNightPhase(session), 50);
    return;
  }

  // Prompt the player
  io.to(session.id).emit('night_prompt', {
    playerId: action.playerId,
    prompt: session.getPlayerNightPrompt(action.playerId)
  });

  if (session.isSoloTest) {
    io.to(session.id).emit('solo_state', session.getFullState());
  }
}

function broadcastPlayerViews(session) {
  io.to(session.id).emit('state_update', session.getPublicState());
  // In a production app we'd send individual views per socket.
  // For this implementation, we send public state + role info via separate events.
  for (const [pid, p] of session.players) {
    if (session.originalAssignments[pid]) {
      io.to(session.id).emit('role_info', {
        playerId: pid,
        original: session.originalAssignments[pid],
        current: session.phase === 'RESULTS' ? session.currentAssignments[pid] : undefined,
        roleName: ROLES[session.originalAssignments[pid]]?.name,
        roleEmoji: ROLES[session.originalAssignments[pid]]?.emoji,
        roleDescription: ROLES[session.originalAssignments[pid]]?.description
      });
    }
  }
}

// ─── START SERVER ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Ultimate Werewolf server running on http://localhost:${PORT}`);
});
