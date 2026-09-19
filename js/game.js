import { createDungeon, shuffle } from './deck.js';

export class ScoundrelGame {
  constructor({ rng = Math.random } = {}) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.health = 20;
    this.startingHealth = 20;
    this.dungeon = shuffle(createDungeon(), this.rng);
    this.room = [];
    this.discard = [];
    this.weapon = null;
    this.turn = 0;
    this.cardsPlayedThisTurn = 0;
    this.potionUsedThisTurn = false;
    this.previousTurnWasAvoided = false;
    this.lastCardPlayed = null;
    this.status = 'playing';
    this.score = null;
    this.message = 'La partita è iniziata.';
    this.lastAction = null;
    this.startTurn();
  }

  // L'evitamento è una proprietà della sequenza di turni:
  // dopo un evitamento è bloccato per il turno successivo; dopo un
  // turno affrontato normalmente torna disponibile.
  get canAvoid() {
    return this.status === 'playing'
      && !this.previousTurnWasAvoided
      && this.cardsPlayedThisTurn === 0
      && this.room.length === 4;
  }

  startTurn() {
    if (this.status !== 'playing') return;

    this.turn += 1;
    this.cardsPlayedThisTurn = 0;
    this.potionUsedThisTurn = false;

    while (this.room.length < 4 && this.dungeon.length > 0) {
      this.room.push(this.dungeon.pop());
    }

    this.message = this.room.length === 4
      ? (this.canAvoid ? 'Scegli una carta da affrontare oppure evita la Stanza.' : 'Scegli una carta da affrontare.')
      : 'Scegli le ultime carte della Stanza.';
  }

  avoidRoom() {
    if (this.status !== 'playing') return this.reject('La partita è terminata.');
    if (this.previousTurnWasAvoided) return this.reject('Non è possibile evitare due Stanze consecutive.');
    if (this.cardsPlayedThisTurn !== 0) return this.reject('La Stanza può essere evitata solo all’inizio del turno.');
    if (this.room.length !== 4) return this.reject('Questa Stanza non contiene quattro carte.');

    this.dungeon.unshift(...this.room);
    this.room = [];
    this.previousTurnWasAvoided = true;
    this.lastAction = 'avoid';
    this.message = 'Stanza evitata. Le quattro carte sono state spostate in fondo al Dungeon.';
    this.startTurn();
    return true;
  }

  playCard(cardId, method = null) {
    if (this.status !== 'playing') return this.reject('La partita è terminata.');
    const card = this.room.find(card => card.id === cardId);
    if (!card) return this.reject('Carta non presente nella Stanza.');

    if (card.type === 'monster') return this.playMonster(card, method);
    if (card.type === 'weapon') return this.playWeapon(card);
    if (card.type === 'potion') return this.playPotion(card);
    return this.reject('Tipo di carta non riconosciuto.');
  }

  playWeapon(card) {
    if (this.cardsPlayedThisTurn >= 3) return this.reject('Hai già affrontato tre carte in questo turno.');
    this.removeFromRoom(card.id);
    if (this.weapon) {
      this.discard.push(this.weapon.card, ...this.weapon.monsters);
    }
    this.weapon = { card, monsters: [], lastMonsterValue: null };
    this.cardsPlayedThisTurn += 1;
    this.lastCardPlayed = card;
    this.lastAction = 'weapon';
    this.message = `Arma ${card.rank}${this.symbol(card)} equipaggiata.`;
    return this.afterAction();
  }

  playPotion(card) {
    if (this.cardsPlayedThisTurn >= 3) return this.reject('Hai già affrontato tre carte in questo turno.');
    this.removeFromRoom(card.id);
    this.discard.push(card);
    this.cardsPlayedThisTurn += 1;
    this.lastCardPlayed = card;
    this.lastAction = 'potion';

    if (this.potionUsedThisTurn) {
      this.message = `Pozione ${card.rank}${this.symbol(card)} scartata: è già stata usata una pozione in questo turno.`;
    } else {
      const oldHealth = this.health;
      this.health = Math.min(this.startingHealth, this.health + card.value);
      this.potionUsedThisTurn = true;
      this.message = `Pozione ${card.rank}${this.symbol(card)} usata: Salute ${oldHealth} → ${this.health}.`;
    }
    return this.afterAction();
  }

  playMonster(card, method = null) {
    if (this.cardsPlayedThisTurn >= 3) return this.reject('Hai già affrontato tre carte in questo turno.');
    const canWeapon = this.canUseWeapon(card);
    if (!method) {
      if (canWeapon && this.weapon) return { ok: false, needsChoice: true, cardId: card.id, options: ['barehanded', 'weapon'] };
      return this.fightBarehanded(card);
    }
    if (method === 'weapon') {
      if (!canWeapon) return this.reject('L’arma non può essere usata contro questo mostro.');
      return this.fightWithWeapon(card);
    }
    if (method === 'barehanded') return this.fightBarehanded(card);
    return this.reject('Metodo di combattimento non valido.');
  }

  canUseWeapon(monster) {
    if (!this.weapon) return false;
    if (this.weapon.lastMonsterValue === null) return true;
    return monster.value < this.weapon.lastMonsterValue;
  }

  fightBarehanded(card) {
    this.removeFromRoom(card.id);
    this.discard.push(card);
    this.health -= card.value;
    this.cardsPlayedThisTurn += 1;
    this.lastCardPlayed = card;
    this.lastAction = 'barehanded';
    this.message = `Mostro ${card.rank}${this.symbol(card)} affrontato a mani nude: −${card.value} Salute.`;
    if (this.health <= 0) return this.endGame('dead');
    return this.afterAction();
  }

  fightWithWeapon(card) {
    if (!this.canUseWeapon(card)) return this.reject('L’arma non può essere usata contro questo mostro.');
    this.removeFromRoom(card.id);
    const damage = Math.max(0, card.value - this.weapon.card.value);
    this.health -= damage;
    this.weapon.monsters.push(card);
    this.weapon.lastMonsterValue = card.value;
    this.cardsPlayedThisTurn += 1;
    this.lastCardPlayed = card;
    this.lastAction = 'weapon-combat';
    this.message = `Mostro ${card.rank}${this.symbol(card)} combattuto con l’arma ${this.weapon.card.rank}: −${damage} Salute.`;
    if (this.health <= 0) return this.endGame('dead');
    return this.afterAction();
  }

  afterAction() {
    if (this.status !== 'playing') return true;

    if (this.dungeon.length === 0 && this.room.length === 0) {
      return this.endGame('won');
    }

    if (this.cardsPlayedThisTurn === 3) {
      // Un turno affrontato normalmente interrompe la sequenza di evitamento.
      this.previousTurnWasAvoided = false;
      this.startTurn();
    }

    if (this.dungeon.length === 0 && this.room.length === 0) {
      return this.endGame('won');
    }
    return true;
  }

  endGame(reason) {
    if (this.status !== 'playing') return false;
    this.status = reason === 'dead' ? 'lost' : 'won';

    if (reason === 'dead') {
      const remainingMonsterValue = this.dungeon
        .filter(card => card.type === 'monster')
        .reduce((sum, card) => sum + card.value, 0);
      this.score = -remainingMonsterValue;
      const deathMessages = [
        'Il suo viaggio finisce qui. Le tenebre hanno prevalso.',
        'È caduto nell’oscurità del Dungeon, ma il suo coraggio non sarà dimenticato.',
        'Ha combattuto fino all’ultimo respiro. Il Dungeon lo reclama.',
        'È caduto, ma ha affrontato l’oscurità fino alla fine.',
        'Il Dungeon ha avuto l’ultima parola.',
        'Le tenebre lo hanno inghiottito. La sua impresa finisce qui.',
        'Ha sfidato il Dungeon senza arretrare. Ora riposa tra le sue ombre.',
        'Il suo coraggio non è bastato. Il Dungeon resta in piedi.',
        'L’ultimo colpo è stato sferrato. La sua avventura finisce qui.',
        'Ha spinto il proprio coraggio oltre ogni limite. Qui trova la sua fine.',
        'Il Dungeon ha preteso il suo tributo. Il suo viaggio è finito.',
        'Ha camminato nell’oscurità fino a non poter più avanzare.',
        'Nessuna luce oltre questa soglia. Il suo viaggio termina qui.',
        'Ha affrontato mostri e tenebre. Alla fine, è caduto.',
        'Il suo nome si perde nelle profondità del Dungeon, ma la sua sfida rimane.',
        'Ha combattuto contro l’oscurità. L’oscurità ha vinto.',
        'Le sue forze sono finite, ma non il coraggio con cui ha combattuto.',
        'Il Dungeon lo ha sconfitto. La sua impresa, però, è compiuta fino all’ultimo respiro.',
        'È caduto nelle profondità, dopo aver dato tutto ciò che aveva.',
        'Qui finisce la sua impresa. Le tenebre hanno prevalso.'
      ];
      this.message = deathMessages[Math.floor(Math.random() * deathMessages.length)];
      return true;
    }

    this.score = this.health;
    if (this.health === 20 && this.lastCardPlayed?.type === 'potion') {
      this.score += this.lastCardPlayed.value;
    }
    this.message = `Dungeon completato. Salute finale: ${this.health}. Punteggio: ${this.score}.`;
    return true;
  }

  removeFromRoom(cardId) {
    const index = this.room.findIndex(card => card.id === cardId);
    if (index === -1) throw new Error('La carta non è nella Stanza.');
    return this.room.splice(index, 1)[0];
  }

  reject(message) {
    this.message = message;
    return { ok: false, error: message };
  }

  symbol(card) {
    return ({ clubs: '♣', spades: '♠', diamonds: '♦', hearts: '♥' })[card.suit];
  }

  snapshot() {
    return structuredClone({
      health: this.health, dungeon: this.dungeon, room: this.room, discard: this.discard,
      weapon: this.weapon, turn: this.turn, cardsPlayedThisTurn: this.cardsPlayedThisTurn,
      potionUsedThisTurn: this.potionUsedThisTurn, canAvoid: this.canAvoid,
      previousTurnWasAvoided: this.previousTurnWasAvoided, lastCardPlayed: this.lastCardPlayed,
      status: this.status, score: this.score, message: this.message, lastAction: this.lastAction
    });
  }
}
