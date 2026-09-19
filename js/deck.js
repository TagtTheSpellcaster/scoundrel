export const SUITS = Object.freeze({
  CLUBS: 'clubs',
  SPADES: 'spades',
  DIAMONDS: 'diamonds',
  HEARTS: 'hearts'
});

export const RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
const VALUES = Object.freeze({ A: 14, J: 11, Q: 12, K: 13 });

export function cardValue(rank) {
  return VALUES[rank] ?? Number(rank);
}

export function cardType(suit) {
  if (suit === SUITS.CLUBS || suit === SUITS.SPADES) return 'monster';
  if (suit === SUITS.DIAMONDS) return 'weapon';
  if (suit === SUITS.HEARTS) return 'potion';
  throw new Error(`Seme sconosciuto: ${suit}`);
}

export function suitSymbol(suit) {
  return ({ clubs: '♣', spades: '♠', diamonds: '♦', hearts: '♥' })[suit];
}

export function makeCard(suit, rank) {
  return { id: `${rank}-${suit}`, suit, rank, value: cardValue(rank), type: cardType(suit) };
}

export function createDungeon() {
  const deck = [];
  for (const suit of Object.values(SUITS)) {
    const ranks = (suit === SUITS.HEARTS || suit === SUITS.DIAMONDS) ? RANKS.filter(rank => !['A', 'J', 'Q', 'K'].includes(rank)) : RANKS;
    for (const rank of ranks) deck.push(makeCard(suit, rank));
  }
  return deck;
}

export function shuffle(cards, rng = Math.random) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
