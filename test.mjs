import assert from 'node:assert/strict';
import { ScoundrelGame } from './js/game.js';
import { createDungeon, makeCard, SUITS } from './js/deck.js';

function setRoom(game, cards) {
  game.room = cards;
  game.dungeon = [
    makeCard(SUITS.CLUBS, '10'),
    makeCard(SUITS.SPADES, '10'),
    makeCard(SUITS.CLUBS, '9'),
    makeCard(SUITS.SPADES, '8'),
    makeCard(SUITS.CLUBS, '7'),
    makeCard(SUITS.SPADES, '6')
  ];
  game.status = 'playing';
  game.health = 100;
  game.startingHealth = 100;
  game.cardsPlayedThisTurn = 0;
  game.potionUsedThisTurn = false;
  game.previousTurnWasAvoided = false;
  game.score = null;
}

// All'avvio la Stanza può essere evitata.
let g = new ScoundrelGame();
assert.equal(g.canAvoid, true);

// Dopo un evitamento, la Stanza immediatamente successiva non può essere evitata.
assert.equal(g.avoidRoom(), true);
assert.equal(g.previousTurnWasAvoided, true);
assert.equal(g.canAvoid, false);
assert.equal(g.avoidRoom().ok, false);

// Un turno normale riabilita l'evitamento per il turno successivo.
g = new ScoundrelGame();
setRoom(g, [
  makeCard(SUITS.CLUBS, '2'),
  makeCard(SUITS.CLUBS, '3'),
  makeCard(SUITS.CLUBS, '4'),
  makeCard(SUITS.CLUBS, '5')
]);
for (let i = 0; i < 3; i += 1) {
  assert.equal(g.playCard(g.room[0].id, 'barehanded'), true);
}
assert.equal(g.cardsPlayedThisTurn, 0);
assert.equal(g.previousTurnWasAvoided, false);
assert.equal(g.canAvoid, true);

// L'evitamento non è disponibile dopo aver iniziato ad affrontare la Stanza.
g = new ScoundrelGame();
setRoom(g, [
  makeCard(SUITS.CLUBS, '2'),
  makeCard(SUITS.CLUBS, '3'),
  makeCard(SUITS.CLUBS, '4'),
  makeCard(SUITS.CLUBS, '5')
]);
assert.equal(g.playCard(g.room[0].id, 'barehanded'), true);
assert.equal(g.canAvoid, false);
assert.equal(g.avoidRoom().ok, false);

// Dopo aver completato il turno, l'evitamento torna disponibile.
g.playCard(g.room[0].id, 'barehanded');
g.playCard(g.room[0].id, 'barehanded');
assert.equal(g.canAvoid, true);

// Sequenza: evita -> turno successivo non evitabile -> gioca normalmente -> nuovamente evitabile.
g = new ScoundrelGame();
g.health = 100;
g.startingHealth = 100;
assert.equal(g.avoidRoom(), true);
assert.equal(g.canAvoid, false);
for (let i = 0; i < 3; i += 1) {
  assert.equal(g.playCard(g.room[0].id, 'barehanded'), true);
}
assert.equal(g.status, 'playing');
assert.equal(g.previousTurnWasAvoided, false);
assert.equal(g.canAvoid, true);


// Un'arma può essere riutilizzata solo contro un mostro di valore strettamente inferiore.
g = new ScoundrelGame();
g.weapon = {
  card: makeCard(SUITS.DIAMONDS, '10'),
  monsters: [],
  lastMonsterValue: 10
};
assert.equal(g.canUseWeapon(makeCard(SUITS.CLUBS, '9')), true);
assert.equal(g.canUseWeapon(makeCard(SUITS.CLUBS, '10')), false);
assert.equal(g.canUseWeapon(makeCard(SUITS.CLUBS, '11')), false);

console.log('Tutti i test del motore sono superati.');

// Il Dungeon deve contenere esattamente 44 carte: 13 Fiori, 13 Picche,
// 9 Quadri e 9 Cuori (2–10).
const deck = createDungeon();
assert.equal(deck.length, 44);
assert.equal(deck.filter(c => c.suit === SUITS.CLUBS).length, 13);
assert.equal(deck.filter(c => c.suit === SUITS.SPADES).length, 13);
assert.equal(deck.filter(c => c.suit === SUITS.DIAMONDS).length, 9);
assert.equal(deck.filter(c => c.suit === SUITS.HEARTS).length, 9);
assert.deepEqual(
  deck.filter(c => c.suit === SUITS.HEARTS).map(c => c.rank).sort(),
  ['10','2','3','4','5','6','7','8','9']
);
