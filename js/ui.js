import { ScoundrelGame } from './game.js';
import { suitSymbol } from './deck.js';

const game = new ScoundrelGame();
const $ = selector => document.querySelector(selector);
const roomEl = $('#room'), dungeonCountEl = $('#dungeon-count'), healthEl = $('#health'), healthBarEl = $('#health-bar');
const weaponEl = $('#weapon'), lastMonsterEl = $('#last-monster'), messageEl = $('#message'), messageTextEl = $('#message-text'), scoreMessageEl = $('#score-message'), turnEl = $('#turn');
const avoidBtn = $('#avoid'), newGameBtn = $('#new-game'), modal = $('#combat-modal');
const modalCard = $('#combat-card'), actionDescription = $('#action-description');
const bareBtn = $('#barehanded'), weaponBtn = $('#weapon-fight'), drinkBtn = $('#drink-potion'), equipBtn = $('#equip-weapon'), closeModalBtn = $('#close-modal');
const cardInfoEl = $('#card-info'), cardInfoTitleEl = $('#card-info-title'), cardInfoTypeEl = $('#card-info-type'), cardInfoTextEl = $('#card-info-text');

function cardLabel(card) { return `${card.rank}${suitSymbol(card.suit)}`; }

function cardImagePath(card) {
  return `cards/${card.suit === 'spades' ? 'picche' : card.suit === 'clubs' ? 'fiori' : card.suit === 'hearts' ? 'cuori' : 'quadri'}_${card.rank.toLowerCase()}.png`;
}
function cardName(card) {
  const ranks = { A: 'Asso', J: 'Fante', Q: 'Donna', K: 'Re' };
  const suits = { clubs: 'di Fiori', spades: 'di Picche', diamonds: 'di Quadri', hearts: 'di Cuori' };
  return `${ranks[card.rank] ?? card.rank} ${suits[card.suit]}`;
}
function typeLabel(type) { return ({ monster: 'Mostro', weapon: 'Arma', potion: 'Pozione' })[type]; }

function cardInfo(card) {
  if (card.type === 'monster') {
    const weaponState = game.weapon
      ? game.canUseWeapon(card) ? `L’arma ${cardName(game.weapon.card)} può essere usata contro questo mostro.` : `L’arma ${cardName(game.weapon.card)} non può essere usata contro questo mostro.`
      : 'Nessuna arma equipaggiata.';
    return { title: cardName(card), type: 'Mostro', text: `Infligge ${card.value} danni a mani nude. ${weaponState}` };
  }
  if (card.type === 'weapon') {
    const limit = game.weapon?.lastMonsterValue;
    return { title: cardName(card), type: 'Arma', text: limit == null ? `Infligge ${card.value} danni ai mostri. Dopo il primo utilizzo potrà essere usata solo contro mostri di valore strettamente inferiore all’ultimo sconfitto.` : `Infligge ${card.value} danni ai mostri. L’arma attuale può essere usata contro mostri di valore < ${limit}.` };
  }
  return { title: cardName(card), type: 'Pozione', text: `Ripristina ${card.value} Salute, fino a un massimo di 20. È possibile usare una sola pozione per turno.` };
}

function showCardInfo(card) {
  const info = cardInfo(card);
  cardInfoTitleEl.textContent = info.title;
  cardInfoTypeEl.textContent = info.type;
  cardInfoTextEl.textContent = info.text;
  cardInfoEl.hidden = false;
}
function hideCardInfo() { cardInfoEl.hidden = true; }

function renderCard(card, { disabled = false, compact = false } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `card card-${card.type}${compact ? ' card-compact' : ''}`;
  button.disabled = disabled || game.status !== 'playing';
  button.dataset.cardId = card.id;
  const image = document.createElement('img');
  image.src = cardImagePath(card);
  image.alt = cardLabel(card);
  image.draggable = false;
  button.append(image);
  button.addEventListener('mouseenter', () => showCardInfo(card));
  button.addEventListener('focus', () => showCardInfo(card));
  button.addEventListener('mouseleave', hideCardInfo);
  button.addEventListener('blur', hideCardInfo);
  button.addEventListener('click', () => handleCardClick(card));
  return button;
}

function render() {
  healthEl.textContent = `${game.health}/20`;
  const healthPercent = Math.max(0, Math.min(100, (game.health / game.startingHealth) * 100));
  const healthHue = healthPercent * 1.2;
  healthBarEl.style.setProperty('--health-percent', `${healthPercent}%`);
  healthBarEl.style.setProperty('--health-color', `hsl(${healthHue} 65% 38%)`);
  healthBarEl.setAttribute('aria-valuenow', String(Math.max(0, Math.min(game.startingHealth, game.health))));
  healthBarEl.classList.toggle('health-dead', game.health <= 0);
  
  dungeonCountEl.textContent = game.dungeon.length;
  turnEl.textContent = game.turn;
  messageTextEl.textContent = game.message;
  
  const showDeathScore = game.status === 'lost' && game.score !== null;
  scoreMessageEl.hidden = !showDeathScore;
  scoreMessageEl.textContent = showDeathScore ? `Punteggio: ${game.score}` : '';

  const currentCardIds = new Set(game.room.map(c => c.id));
  
  Array.from(roomEl.children).forEach(child => {
    if (!currentCardIds.has(child.dataset.cardId)) {
      child.remove();
    }
  });

  game.room.forEach(card => {
    let cardEl = roomEl.querySelector(`[data-card-id="${card.id}"]`);
    if (!cardEl) {
      cardEl = renderCard(card);
      roomEl.append(cardEl);
    }
    cardEl.disabled = game.status !== 'playing';
  });

  if (game.weapon) {
    weaponEl.replaceChildren(renderCard(game.weapon.card, { disabled: true, compact: true }));
    const limit = document.createElement('small'); 
    limit.textContent = game.weapon.lastMonsterValue == null ? 'Nessun limite' : `< ${game.weapon.lastMonsterValue}`; 
    weaponEl.append(limit);
  } else {
    weaponEl.innerHTML = '<div class="empty">Nessuna</div>';
  }

  const lastMonster = game.weapon?.monsters?.at(-1);
  if (lastMonster) {
    lastMonsterEl.replaceChildren(renderCard(lastMonster, { disabled: true, compact: true }));
  } else {
    lastMonsterEl.innerHTML = '<span>Vuoto</span>';
  }

  avoidBtn.disabled = !game.canAvoid;
}

function handleCardClick(card) {
  openCardActionModal(card);
}

function openCardActionModal(card) {
  modalCard.replaceChildren();
  const image = document.createElement('img');
  image.src = cardImagePath(card);
  image.alt = cardLabel(card);
  image.className = 'modal-card-image';
  modalCard.append(image);

  bareBtn.hidden = true;
  weaponBtn.hidden = true;
  drinkBtn.hidden = true;
  drinkBtn.textContent = 'Bevi';
  equipBtn.hidden = true;

  if (card.type === 'monster') {
    actionDescription.textContent = game.weapon
      ? (game.canUseWeapon(card)
        ? `Puoi affrontare ${cardName(card)} a mani nude oppure con l’arma equipaggiata.`
        : `${cardName(card)} infligge ${card.value} danni a mani nude. L’arma equipaggiata non può essere usata contro questo mostro.`)
      : `${cardName(card)} infligge ${card.value} danni a mani nude. Nessuna arma equipaggiata.`;

    bareBtn.hidden = false;
    weaponBtn.hidden = false;
    weaponBtn.disabled = !game.weapon || !game.canUseWeapon(card);
    bareBtn.focus();
  } else if (card.type === 'potion') {
    actionDescription.textContent = game.potionUsedThisTurn
      ? 'Puoi bere anche questa pozione, ma una sola pozione per turno ripristina Salute. Questa verrà scartata senza effetto.'
      : `Ripristina ${card.value} Salute, fino a un massimo di ${game.startingHealth}.`;
    drinkBtn.hidden = false;
    drinkBtn.disabled = false;
    drinkBtn.textContent = game.potionUsedThisTurn ? 'Bevi (nessun effetto)' : `Bevi (+${card.value} Salute)`;
    drinkBtn.focus();
  } else if (card.type === 'weapon') {
    actionDescription.textContent = `Impugna l’arma. Dopo aver sconfitto un mostro, potrà essere usata solo contro mostri di valore strettamente inferiore a quello dell’ultimo mostro sconfitto.`;
    equipBtn.hidden = false;
    equipBtn.focus();
  }

  modal.dataset.cardId = card.id;
  modal.showModal();
}

function closeModal() { 
  modal.close(); 
  delete modal.dataset.cardId; 
}

function playModalCard(method = null) {
  const id = modal.dataset.cardId;
  closeModal();
  game.playCard(id, method);
  render();
}

bareBtn.addEventListener('click', () => playModalCard('barehanded'));
weaponBtn.addEventListener('click', () => playModalCard('weapon'));
drinkBtn.addEventListener('click', () => playModalCard());
equipBtn.addEventListener('click', () => playModalCard());
closeModalBtn.addEventListener('click', closeModal);
avoidBtn.addEventListener('click', () => { game.avoidRoom(); render(); });
newGameBtn.addEventListener('click', () => { game.reset(); closeModal(); hideCardInfo(); render(); });

render();
