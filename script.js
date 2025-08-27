// DOM Elements
const modeModal = document.getElementById('modeModal');
const btnPvP = document.getElementById('btn-pvp');
const btnAi = document.getElementById('btn-ai');
const btnBack = document.getElementById('btn-back');
const toggleTheme = document.getElementById('btn-toggle-theme');
const gameDiv = document.getElementById('game');
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnNewGame = document.getElementById('btn-new-game');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const timeXEl = document.getElementById('time-x');
const timeOEl = document.getElementById('time-o');
const sndMove = document.getElementById('snd-move');
const sndWin = document.getElementById('snd-win');
const sndDraw = document.getElementById('snd-draw');

// Game State
let board = Array(9).fill(null);
let current = 'X';
let gameActive = false;
let mode = 'pvp';
let scoreX = 0, scoreO = 0;
let totalX = 0, totalO = 0, startTime = 0, timerInterval;
let matchesAI = 0;    // Count AI matches
let aiLevel = 1;      // Increase difficulty after first 3 games

const winLines = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

const fmt = s => (Math.round(s * 10) / 10).toFixed(1);

// Event Handlers
btnPvP.onclick = () => selectMode('pvp');
btnAi.onclick = () => selectMode('ai');
btnBack.onclick = goBackToMode;
toggleTheme.onclick = () => document.body.classList.toggle('dark');
btnPlayAgain.onclick = () => startGame(false);
btnNewGame.onclick = () => startGame(true);

function selectMode(m) {
  mode = m;
  modeModal.classList.add('hidden');
  gameDiv.classList.remove('hidden');
  matchesAI = 0;
  aiLevel = 1;
  startGame(true);
}

function goBackToMode() {
  modeModal.classList.remove('hidden');
  gameDiv.classList.add('hidden');
  clearInterval(timerInterval);
}

function startGame(resetAll = false) {
  board.fill(null);
  current = 'X';
  gameActive = true;
  if (resetAll) { scoreX = scoreO = totalX = totalO = aiLevel = matchesAI = 0; }
  scoreXEl.textContent = scoreX;
  scoreOEl.textContent = scoreO;
  startTimer();
  btnPlayAgain.classList.add('hidden');
  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = '';
  board.forEach((val, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (val) {
      cell.textContent = val;
      cell.classList.add(val.toLowerCase());
    }
    cell.onclick = () => handlePlayerMove(idx);
    boardEl.appendChild(cell);
  });
  statusEl.textContent = gameActive ? `Player ${current}'s turn` : 'Game Over';
}

function handlePlayerMove(idx) {
  if (!gameActive || board[idx]) return;
  sndMove.play();
  accumulateTime();
  board[idx] = current;
  renderBoard();
  if (checkEnd()) return;
  current = current === 'X' ? 'O' : 'X';
  if (mode === 'ai' && current === 'O') {
    statusEl.textContent = 'AI thinking…';
    setTimeout(handleAiMove, getAiDelay());
  } else {
    startTimer();
  }
}

function handleAiMove() {
  accumulateTime();
  const moveIdx = computeAIMove();
  board[moveIdx] = 'O';
  sndMove.play();
  renderBoard();
  if (checkEnd()) return;
  current = 'X';
  matchesAI++;
  if (matchesAI >= 3) aiLevel = Math.min(aiLevel + 1, 9);  // ramp up difficulty
  startTimer();
}

function getAiDelay() {
  return Math.max(200, 800 - (aiLevel - 1) * 100);
}

function checkEnd() {
  if (checkWin(current)) {
    endGame(`${current} wins!`);
    return true;
  }
  if (!board.includes(null)) {
    endGame("It's a draw!");
    return true;
  }
  return false;
}

function endGame(msg) {
  gameActive = false;
  accumulateTime();
  clearInterval(timerInterval);
  statusEl.textContent = msg;

  if (msg.includes('wins')) {
    current === 'X' ? scoreX++ : scoreO++;
    scoreXEl.textContent = scoreX;
    scoreOEl.textContent = scoreO;
    highlightWin();
    sndWin.play();
    confetti({ particleCount: 100, spread: 80 });
  } else {
    sndDraw.play();
    confetti({ particleCount: 80, spread: 120, colors: ['#aaa', '#777', '#ccc'] });
  }

  btnPlayAgain.classList.remove('hidden');
}

function checkWin(p) {
  return winLines.some(line => line.every(i => board[i] === p));
}

function highlightWin() {
  const line = winLines.find(line => line.every(i => board[i] === current));
  if (line) line.forEach(i => boardEl.children[i].classList.add('win'));
}

function startTimer() {
  clearInterval(timerInterval);
  startTime = performance.now();
  timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
  const now = performance.now(), run = (now - startTime) / 1000;
  timeXEl.textContent = fmt(totalX + (current === 'X' ? run : 0));
  timeOEl.textContent = fmt(totalO + (current === 'O' ? run : 0));
}

function accumulateTime() {
  const now = performance.now(), delta = (now - startTime) / 1000;
  current === 'X' ? totalX += delta : totalO += delta;
  clearInterval(timerInterval);
  updateTimer();
}

function computeAIMove() {
  const empties = board.map((v, i) => v === null ? i : null).filter(i => i !== null);
  // Easy level
  if (aiLevel < 3) {
    return empties[Math.floor(Math.random() * empties.length)];
  }
  // Medium level (win/block)
  if (aiLevel < 5) {
    for (const i of empties) {
      board[i] = 'O';
      if (checkWin('O')) { board[i] = null; return i; }
      board[i] = null;
    }
    for (const i of empties) {
      board[i] = 'X';
      if (checkWin('X')) { board[i] = null; return i; }
      board[i] = null;
    }
    return empties[Math.floor(Math.random() * empties.length)];
  }
  // Hard level using Minimax
  let bestVal = -Infinity, bestIdx = empties[0];
  for (const i of empties) {
    board[i] = 'O';
    const score = minimax(board, false);
    board[i] = null;
    if (score > bestVal) {
      bestVal = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function minimax(bd, isMax) {
  const result = evaluate(bd);
  if (result !== null) return result;
  let best = isMax ? -Infinity : Infinity;
  bd.forEach((v, i) => {
    if (!v) {
      bd[i] = isMax ? 'O' : 'X';
      const val = minimax(bd, !isMax);
      bd[i] = null;
      best = isMax ? Math.max(best, val) : Math.min(best, val);
    }
  });
  return best;
}

function evaluate(bd) {
  for (const [a,b,c] of winLines) {
    if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) {
      return bd[a] === 'O' ? 10 : -10;
    }
  }
  return bd.every(v => v !== null) ? 0 : null;
}

// Initialization
modeModal.classList.remove('hidden');
gameDiv.classList.add('hidden');
