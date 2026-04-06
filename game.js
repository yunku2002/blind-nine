/* =====================================================
   BLIND NINE — Game Logic
   ===================================================== */

'use strict';

// =====================================================
// STATE
// =====================================================
const state = {
  phase: 'setup',           // 'setup' | 'playing' | 'gameover'
  currentRound: 0,          // 0-indexed
  firstPlayerThisRound: 0,  // 0 or 1
  currentTurnPlayer: 0,
  playPhase: 'selecting',   // 'selecting' | 'waiting' | 'countdown' | 'showing-result'
  selectedCard: null,
  roundPlays: [null, null],
  allRounds: [],
  scores: [0, 0],
  options: {
    theme: 'light',
    boardSplit: 'side-by-side',
    oneBeatNine: true,
    showMyPlayedCards: false,
    keepRoundResults: true,
  },
  _countdownTimer: null,
  _resultTimer: null,
  _countdownText: '',
  _overlayShowing: [null, null], // 'options' | 'rules' | 'whosfirst' | null
};

// =====================================================
// CONSTANTS
// =====================================================
const RULES_HTML = `
<p><b>Setup:</b> Place a physical barrier in the middle to hide each player's cards from their opponent.</p>
<p><b>Cards:</b> Each player receives number cards 1–9. The back of each card shows "EVEN" or "odd", informing the opponent of its parity.</p>
<p><b>Winning:</b> The first to win 5 rounds wins the game. If all 9 rounds are played, the player with more wins wins; if equal, the game is a draw.</p>
<p><b>Playing a round:</b> Players take turns playing one card face-down to the play area. The higher card wins. Exception: 1 beats 9 (unless disabled in options). Press a card once to select it and confirm, or press it twice to play immediately.</p>
<p><b>Turn order:</b> The winner of the previous round plays first next round. After a tie, the previous first player goes first again.</p>
<p><b>Results:</b> Round results are announced after each round. Opponents' played cards are only revealed when the game ends.</p>
`;

// =====================================================
// DOM HELPERS
// =====================================================
function el(id) { return document.getElementById(id); }
function mk(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// =====================================================
// BUILD DOM
// =====================================================
function buildDOM() {
  const app = el('app');
  app.innerHTML = '';

  // Apply theme & split class
  applyTheme();
  applySplitClass();

  // Player 1 area
  app.appendChild(buildPlayerArea(0));

  // Barrier
  const barrier = mk('div', 'barrier');
  app.appendChild(barrier);

  // Player 2 area
  app.appendChild(buildPlayerArea(1));
}

function buildPlayerArea(p) {
  const area = mk('div', `player-area p${p + 1}`);
  area.id = `player-area-${p}`;

  // Top bar
  const topBar = mk('div', 'top-bar');

  // New Game button + confirm
  const newGameWrap = mk('div', 'top-bar-left');
  const btnNewGame = mk('button', 'icon-btn btn-newgame', 'New Game');
  btnNewGame.id = `btn-newgame-${p}`;
  btnNewGame.addEventListener('click', () => promptNewGame(p));
  newGameWrap.appendChild(btnNewGame);
  topBar.appendChild(newGameWrap);

  const topRight = mk('div', 'top-bar-right');
  const btnRules = mk('button', 'icon-btn', '?');
  btnRules.title = 'Rules';
  btnRules.addEventListener('click', () => showRules(p));
  const btnOptions = mk('button', 'icon-btn', '⚙');
  btnOptions.title = 'Options';
  btnOptions.addEventListener('click', () => showOptions(p));
  topRight.appendChild(btnRules);
  topRight.appendChild(btnOptions);
  topBar.appendChild(topRight);
  area.appendChild(topBar);

  // New game confirm (hidden by default)
  const ngConfirm = mk('div', 'newgame-confirm hidden');
  ngConfirm.id = `ng-confirm-${p}`;
  ngConfirm.innerHTML = `<span>Start over?</span><div class="btn-row">
    <button class="btn btn-yes" id="ng-yes-${p}">Yes</button>
    <button class="btn btn-no"  id="ng-no-${p}">No</button>
  </div>`;
  area.appendChild(ngConfirm);

  // Score bar
  const scoreBar = mk('div', 'score-bar');
  scoreBar.id = `score-bar-${p}`;
  scoreBar.innerHTML = `<span class="score-red"  id="score-red-${p}">Red: 0</span>
                        <span class="score-blue" id="score-blue-${p}">Blue: 0</span>`;
  // Spacer: absorbs extra space above the score
  area.appendChild(mk('div', 'area-spacer'));

  area.appendChild(scoreBar);

  // Opponent's played cards row (9 slots)
  const oppRow = mk('div', 'cards-row');
  oppRow.id = `opp-row-${p}`;
  for (let i = 0; i < 9; i++) {
    const slot = mk('div', 'card-slot');
    slot.id = `opp-slot-${p}-${i}`;
    oppRow.appendChild(slot);
  }
  area.appendChild(oppRow);

  // Player's own played cards row (9 slots)
  const myRow = mk('div', 'cards-row');
  myRow.id = `my-row-${p}`;
  for (let i = 0; i < 9; i++) {
    const slot = mk('div', 'card-slot');
    slot.id = `my-slot-${p}-${i}`;
    myRow.appendChild(slot);
  }
  area.appendChild(myRow);

  // Results row
  const resultsRow = mk('div', 'results-row');
  resultsRow.id = `results-row-${p}`;
  for (let i = 0; i < 9; i++) {
    const rSlot = mk('div', 'result-slot');
    rSlot.id = `result-slot-${p}-${i}`;
    resultsRow.appendChild(rSlot);
  }
  area.appendChild(resultsRow);

  // Instructions area
  const instrArea = mk('div', 'instructions-area');
  instrArea.id = `instr-area-${p}`;
  area.appendChild(instrArea);

  // Hand row
  const handRow = mk('div', 'hand-row');
  handRow.id = `hand-row-${p}`;
  area.appendChild(handRow);

  // Spacer: absorbs extra space below the unplayed cards
  area.appendChild(mk('div', 'area-spacer'));

  // Player overlay (options / rules)
  const playerOverlay = mk('div', 'player-overlay hidden');
  playerOverlay.id = `player-overlay-${p}`;
  area.appendChild(playerOverlay);

  return area;
}

// =====================================================
// LOCAL STORAGE
// =====================================================
const STORAGE_KEY = 'blindNine_options';

function saveOptions() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.options)); } catch (e) {}
}

function loadOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(state.options, JSON.parse(raw));
  } catch (e) {}
}

// =====================================================
// THEME / LAYOUT
// =====================================================
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.options.theme);
}

function applySplitClass() {
  const app = el('app');
  app.classList.remove('split-side-by-side', 'split-end-to-end');
  app.classList.add(state.options.boardSplit === 'side-by-side'
    ? 'split-side-by-side'
    : 'split-end-to-end');
}

// =====================================================
// OPTIONS PANEL
// =====================================================

// Re-render the other player's options panel if they have it open.
function syncOptionsPanel(changedByPlayer) {
  const other = 1 - changedByPlayer;
  if (state._overlayShowing[other] === 'options') {
    showOptions(other);
  }
}

function showOptions(p) {
  const overlay = el(`player-overlay-${p}`);
  overlay.innerHTML = '';
  overlay.classList.remove('hidden');
  state._overlayShowing[p] = 'options';

  const panel = mk('div', 'player-panel');
  panel.innerHTML = `<h3>Options</h3>`;

  const form = mk('div', 'options-form');

  // Theme
  const themeRow = mk('div', 'option-row');
  themeRow.innerHTML = `<label>Theme</label>
    <div class="radio-group">
      <label><input type="radio" name="opt-theme-${p}" value="light" ${state.options.theme === 'light' ? 'checked' : ''}> Light</label>
      <label><input type="radio" name="opt-theme-${p}" value="dark"  ${state.options.theme === 'dark'  ? 'checked' : ''}> Dark</label>
    </div>`;
  form.appendChild(themeRow);
  themeRow.querySelectorAll('input[type=radio]').forEach(r =>
    r.addEventListener('change', () => {
      state.options.theme = r.value;
      applyTheme();
      refreshBothAreas();
      saveOptions();
      syncOptionsPanel(p);
    })
  );

  // Board Split
  const splitRow = mk('div', 'option-row');
  splitRow.innerHTML = `<label>Board Split</label>
    <div class="radio-group">
      <label><input type="radio" name="opt-split-${p}" value="side-by-side" ${state.options.boardSplit === 'side-by-side' ? 'checked' : ''}> Side-by-Side</label>
      <label><input type="radio" name="opt-split-${p}" value="end-to-end"   ${state.options.boardSplit === 'end-to-end'   ? 'checked' : ''}> End-to-End</label>
    </div>`;
  form.appendChild(splitRow);
  splitRow.querySelectorAll('input[type=radio]').forEach(r =>
    r.addEventListener('change', () => {
      state.options.boardSplit = r.value;
      applySplitClass();
      saveOptions();
      syncOptionsPanel(p);
    })
  );

  // 1 Beats 9
  form.appendChild(buildCheckbox(`opt-1b9-${p}`, '1 Beats 9', state.options.oneBeatNine, v => {
    state.options.oneBeatNine = v;
    saveOptions();
    syncOptionsPanel(p);
  }));

  // Show My Played Cards
  form.appendChild(buildCheckbox(`opt-show-${p}`, 'Show My Played Cards', state.options.showMyPlayedCards, v => {
    state.options.showMyPlayedCards = v;
    refreshBothAreas();
    saveOptions();
    syncOptionsPanel(p);
  }));

  // Keep Round Results Shown
  form.appendChild(buildCheckbox(`opt-keep-${p}`, 'Keep Round Results Shown', state.options.keepRoundResults, v => {
    state.options.keepRoundResults = v;
    refreshBothAreas();
    saveOptions();
    syncOptionsPanel(p);
  }));

  panel.appendChild(form);

  const closeBtn = mk('button', 'btn', 'Close');
  closeBtn.style.marginTop = '0.8rem';
  closeBtn.style.width = '100%';
  closeBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    state._overlayShowing[p] = null;
  });
  panel.appendChild(closeBtn);
  overlay.appendChild(panel);
}

function buildCheckbox(id, label, checked, onChange) {
  const row = mk('div', 'option-row');
  row.innerHTML = `<label for="${id}">${label}</label>
    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>`;
  row.querySelector('input').addEventListener('change', e => onChange(e.target.checked));
  return row;
}

// =====================================================
// RULES PANEL
// =====================================================
function showRules(p) {
  const overlay = el(`player-overlay-${p}`);
  overlay.innerHTML = '';
  overlay.classList.remove('hidden');
  state._overlayShowing[p] = 'rules';

  const panel = mk('div', 'player-panel');
  panel.innerHTML = `<h3>Rules</h3>`;

  const rulesDiv = mk('div', 'rules-text');
  rulesDiv.innerHTML = RULES_HTML;
  panel.appendChild(rulesDiv);

  const closeBtn = mk('button', 'btn', 'Close');
  closeBtn.style.marginTop = '0.8rem';
  closeBtn.style.width = '100%';
  closeBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    state._overlayShowing[p] = null;
  });
  panel.appendChild(closeBtn);
  overlay.appendChild(panel);
}

// =====================================================
// NEW GAME FLOW
// =====================================================
function promptNewGame(p) {
  const ngConfirm = el(`ng-confirm-${p}`);
  ngConfirm.classList.remove('hidden');
  el(`ng-yes-${p}`).onclick = () => { ngConfirm.classList.add('hidden'); startNewGame(); };
  el(`ng-no-${p}`).onclick  = () => ngConfirm.classList.add('hidden');
}

function startNewGame() {
  // Clear any pending timers
  if (state._countdownTimer) clearTimeout(state._countdownTimer);
  if (state._resultTimer)    clearTimeout(state._resultTimer);

  // Reset state
  state.phase = 'setup';
  state.currentRound = 0;
  state.firstPlayerThisRound = 0;
  state.currentTurnPlayer = 0;
  state.playPhase = 'selecting';
  state.selectedCard = null;
  state.roundPlays = [null, null];
  state.allRounds = [];
  state.scores = [0, 0];
  state._countdownTimer = null;
  state._resultTimer = null;
  state._countdownText = '';
  state._overlayShowing = [null, null];

  // Hide all overlays / confirms
  [0, 1].forEach(p => {
    el(`ng-confirm-${p}`).classList.add('hidden');
    el(`player-overlay-${p}`).classList.add('hidden');
  });

  refreshBothAreas();
  showWhoGoesFirst();
}

// =====================================================
// WHO GOES FIRST
// =====================================================
function showWhoGoesFirst() {
  [0, 1].forEach(p => {
    const overlay = el(`player-overlay-${p}`);
    overlay.innerHTML = '';
    overlay.classList.remove('hidden');
    state._overlayShowing[p] = 'whosfirst';

    const panel = mk('div', 'player-panel');
    panel.innerHTML = `<h3>Who goes first?</h3>`;

    const btnRow = mk('div', 'panel-buttons');

    const btnRed    = mk('button', 'btn btn-red',     'Red');
    const btnBlue   = mk('button', 'btn btn-blue',    'Blue');
    const btnRandom = mk('button', 'btn btn-neutral', 'Random');

    btnRed.addEventListener('click',    () => chooseFirst(0));
    btnBlue.addEventListener('click',   () => chooseFirst(1));
    btnRandom.addEventListener('click', () => chooseFirst(Math.random() < 0.5 ? 0 : 1));

    btnRow.appendChild(btnRed);
    btnRow.appendChild(btnBlue);
    btnRow.appendChild(btnRandom);
    panel.appendChild(btnRow);
    overlay.appendChild(panel);
  });
}

function chooseFirst(playerIndex) {
  [0, 1].forEach(p => {
    el(`player-overlay-${p}`).classList.add('hidden');
    state._overlayShowing[p] = null;
  });
  state.firstPlayerThisRound = playerIndex;
  state.currentTurnPlayer    = playerIndex;
  state.phase = 'playing';
  state.playPhase = 'selecting';
  refreshBothAreas();
}

// =====================================================
// CARD RENDERING
// =====================================================
function makeCard(number, playerIndex, faceUp, selectable, selected) {
  const card = mk('div', `card p${playerIndex + 1}`);
  if (selectable) card.classList.add('selectable');
  if (selected)   card.classList.add('selected');

  const numEl  = mk('div', 'card-number');
  const lblEl  = mk('div', 'card-label');

  if (faceUp) {
    numEl.textContent = number;
    lblEl.textContent = '';
  } else {
    numEl.textContent = '';
    lblEl.textContent = number % 2 === 0 ? 'EVEN' : 'odd';
  }

  card.appendChild(numEl);
  card.appendChild(lblEl);
  return card;
}

// =====================================================
// REFRESH BOTH PLAYER AREAS
// =====================================================
function refreshBothAreas() {
  [0, 1].forEach(p => refreshPlayerArea(p));
}

function refreshPlayerArea(p) {
  // Score bar
  el(`score-red-${p}`).textContent  = `Red: ${state.scores[0]}`;
  el(`score-blue-${p}`).textContent = `Blue: ${state.scores[1]}`;

  // Opponent index from p's perspective
  const opp = 1 - p;

  // --- Opponent's played cards row ---
  const oppRow = el(`opp-row-${p}`);
  oppRow.innerHTML = '';
  for (let round = 0; round < 9; round++) {
    if (round < state.allRounds.length) {
      // Card was played in a completed round
      const roundData = state.allRounds[round];
      const oppCard = roundData.plays[opp];
      // Opponent's cards are face-down until game over
      const faceUp = state.phase === 'gameover';
      const card = makeCard(oppCard, opp, faceUp, false, false);
      oppRow.appendChild(card);
    } else if (round === state.currentRound && state.roundPlays[opp] !== null) {
      // Opponent has played this round (current round in progress)
      const faceUp = state.phase === 'gameover';
      const card = makeCard(state.roundPlays[opp], opp, faceUp, false, false);
      oppRow.appendChild(card);
    } else {
      oppRow.appendChild(mk('div', 'card-slot'));
    }
  }

  // --- My played cards row ---
  const myRow = el(`my-row-${p}`);
  myRow.innerHTML = '';
  for (let round = 0; round < 9; round++) {
    if (round < state.allRounds.length) {
      const roundData = state.allRounds[round];
      const myCard = roundData.plays[p];
      // Show face-up if option enabled or game over
      const faceUp = state.options.showMyPlayedCards || state.phase === 'gameover';
      const card = makeCard(myCard, p, faceUp, false, false);
      myRow.appendChild(card);
    } else if (round === state.currentRound && state.roundPlays[p] !== null) {
      const faceUp = state.options.showMyPlayedCards || state.phase === 'gameover';
      const card = makeCard(state.roundPlays[p], p, faceUp, false, false);
      myRow.appendChild(card);
    } else {
      myRow.appendChild(mk('div', 'card-slot'));
    }
  }

  // --- Results row ---
  const resultsRow = el(`results-row-${p}`);
  resultsRow.innerHTML = '';
  for (let round = 0; round < 9; round++) {
    const slot = mk('div', 'result-slot');
    if (round < state.allRounds.length) {
      if (state.options.keepRoundResults) {
        const w = state.allRounds[round].winner;
        if (w === 'draw') {
          slot.textContent = 'DRAW';
          slot.classList.add('draw');
        } else if (w === p) {
          slot.textContent = 'WIN';
          slot.classList.add('win');
        } else {
          slot.textContent = 'LOSE';
          slot.classList.add('lose');
        }
      } else {
        slot.textContent = 'Done';
        slot.classList.add('draw'); // reuse gray colour
      }
    }
    resultsRow.appendChild(slot);
  }

  // --- Instructions area ---
  renderInstructions(p);

  // --- Hand row ---
  renderHand(p);
}

// =====================================================
// RENDER INSTRUCTIONS
// =====================================================
function renderInstructions(p) {
  const area = el(`instr-area-${p}`);
  area.innerHTML = '';

  if (state.phase === 'setup') {
    area.appendChild(mk('div', 'instr-text', 'Welcome to Blind Nine!'));
    return;
  }

  if (state.phase === 'gameover') {
    const myScore  = state.scores[p];
    const oppScore = state.scores[1 - p];
    let msgClass, msgText;
    if (myScore > oppScore) {
      msgClass = 'game-win';  msgText = 'You WIN the game!';
    } else if (myScore < oppScore) {
      msgClass = 'game-lose'; msgText = 'You LOSE the game!';
    } else {
      msgClass = 'game-draw'; msgText = 'The game is a DRAW!';
    }
    area.appendChild(mk('div', `instr-big ${msgClass}`, msgText));
    return;
  }

  // playing phase
  const playPhase = state.playPhase;

  if (playPhase === 'countdown') {
    area.appendChild(mk('div', 'instr-big', state._countdownText || ''));
    return;
  }

  if (playPhase === 'showing-result') {
    // Show round result
    const lastRound = state.allRounds[state.allRounds.length - 1];
    if (lastRound) {
      const w = lastRound.winner;
      let cls, txt;
      if (w === 'draw') { cls = 'draw'; txt = 'DRAW'; }
      else if (w === p) { cls = 'win';  txt = 'WIN';  }
      else              { cls = 'lose'; txt = 'LOSE'; }
      area.appendChild(mk('div', `instr-big ${cls}`, txt));
    }
    return;
  }

  // selecting or waiting
  if (state.currentTurnPlayer !== p) {
    // Waiting
    const colorName = state.currentTurnPlayer === 0 ? 'Red' : 'Blue';
    area.appendChild(mk('div', 'instr-text', `Waiting for ${colorName} to play...`));
    return;
  }

  // My turn
  if (state.selectedCard === null) {
    area.appendChild(mk('div', 'instr-text', 'Select a card to play.'));
  } else {
    // Confirmation
    const confirmDiv = mk('div', 'instr-confirm');
    confirmDiv.appendChild(mk('p', '', `Play ${state.selectedCard}?`));
    const btnRow = mk('div', 'btn-row');

    const yesBtn = mk('button', 'btn btn-yes', 'Yes');
    yesBtn.addEventListener('click', () => confirmPlay(p));

    const noBtn = mk('button', 'btn btn-no', 'No');
    noBtn.addEventListener('click', () => {
      state.selectedCard = null;
      refreshBothAreas();
    });

    btnRow.appendChild(yesBtn);
    btnRow.appendChild(noBtn);
    confirmDiv.appendChild(btnRow);
    area.appendChild(confirmDiv);
  }
}

// =====================================================
// RENDER HAND
// =====================================================
function renderHand(p) {
  const handRow = el(`hand-row-${p}`);
  handRow.innerHTML = '';

  const isMyTurn  = state.currentTurnPlayer === p;
  const canSelect = state.phase === 'playing'
                 && state.playPhase === 'selecting'
                 && isMyTurn;

  // Compute which cards this player has already played
  const played = new Set(state.allRounds.map(r => r.plays[p]));
  if (state.roundPlays[p] !== null) played.add(state.roundPlays[p]);

  // Always render slots 1–9 in fixed positions
  for (let num = 1; num <= 9; num++) {
    if (played.has(num)) {
      handRow.appendChild(mk('div', 'card-slot'));
    } else {
      const isSelected = state.selectedCard === num && isMyTurn;
      const card = makeCard(num, p, true, canSelect, isSelected);
      if (canSelect) {
        card.addEventListener('click', () => selectCard(p, num));
      }
      handRow.appendChild(card);
    }
  }
}

// =====================================================
// CARD SELECTION & PLAY
// =====================================================
function selectCard(p, num) {
  if (state.phase !== 'playing') return;
  if (state.playPhase !== 'selecting') return;
  if (state.currentTurnPlayer !== p) return;

  if (state.selectedCard === num) {
    confirmPlay(p); // double-press: skip confirmation
  } else {
    state.selectedCard = num;
    refreshBothAreas();
  }
}

function confirmPlay(p) {
  if (state.selectedCard === null) return;
  if (state.currentTurnPlayer !== p) return;

  const card = state.selectedCard;
  state.selectedCard = null;

  // Place in roundPlays
  state.roundPlays[p] = card;

  // Switch turn or proceed to countdown
  const opp = 1 - p;
  if (state.roundPlays[opp] === null) {
    // Opponent hasn't played yet
    state.currentTurnPlayer = opp;
    state.playPhase = 'selecting';
    refreshBothAreas();
  } else {
    // Both have played — start countdown
    state.playPhase = 'countdown';
    refreshBothAreas();
    startCountdown();
  }
}

// =====================================================
// COUNTDOWN & RESULT
// =====================================================
function startCountdown() {
  const counts = ['3', '2', '1'];
  let i = 0;

  function tick() {
    if (i < counts.length) {
      setCountdownText(counts[i]);
      i++;
      state._countdownTimer = setTimeout(tick, 1000);
    } else {
      // Resolve the round
      resolveRound();
    }
  }
  tick();
}

function setCountdownText(text) {
  state._countdownText = text;
  [0, 1].forEach(p => {
    const area = el(`instr-area-${p}`);
    area.innerHTML = '';
    area.appendChild(mk('div', 'instr-big', text));
  });
}

function resolveRound() {
  const [c0, c1] = state.roundPlays;
  let winner;

  if (c0 === c1) {
    winner = 'draw';
  } else if (state.options.oneBeatNine && ((c0 === 1 && c1 === 9) || (c0 === 9 && c1 === 1))) {
    winner = c0 === 1 ? 0 : 1;
  } else {
    winner = c0 > c1 ? 0 : 1;
  }

  // Update scores
  if (winner !== 'draw') state.scores[winner]++;

  // Record round
  state.allRounds.push({
    plays: [c0, c1],
    winner,
  });

  // Determine next first player
  if (winner !== 'draw') {
    state.firstPlayerThisRound = winner;
  }
  // (tie: keep firstPlayerThisRound unchanged)

  state.roundPlays = [null, null];
  state.currentRound++;

  // Show result for 3 seconds
  state.playPhase = 'showing-result';
  refreshBothAreas();

  state._resultTimer = setTimeout(() => {
    // Check game over
    const winner0Wins = state.scores[0] >= 5;
    const winner1Wins = state.scores[1] >= 5;
    const noMoreRounds = state.currentRound >= 9;

    if (winner0Wins || winner1Wins || noMoreRounds) {
      endGame();
    } else {
      // Next round
      state.currentTurnPlayer = state.firstPlayerThisRound;
      state.playPhase = 'selecting';
      refreshBothAreas();
    }
  }, 3000);
}

// =====================================================
// GAME OVER
// =====================================================
function endGame() {
  state.phase = 'gameover';
  refreshBothAreas();
}

// =====================================================
// INIT
// =====================================================
function init() {
  loadOptions();
  buildDOM();
  refreshBothAreas();
  showWhoGoesFirst();
}

// Kick off
init();
