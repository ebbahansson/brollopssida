/* ========================================
   SNAKE-SPEL - KONFIGURATION OCH VARIABLER
   ======================================== */

// Spelkonstanter
const BOARD_COLS = 16;
const BOARD_ROWS = 16;
const BASE_CELL_SIZE = 24;
const IMAGE_SCALE = 3;
const TICK_MS = 180;

// Spelvariabler
let canvas, ctx;
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let cols = 0, rows = 0;
let cellSize = 28;
let gameInterval = null;
let running = false;
let score = 0;

/* ========================================
   SCORE STORAGE - VÄXLA MELLAN LOCALSTORAGE OCH GOOGLE SHEETS
   ======================================== */
const STORAGE_TYPE = 'googleSheets'; // Byt till 'googleSheets' senare

// Google Sheets config (fylls i när du är redo att byta)
const GOOGLE_SHEETS_CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbzqQ0UGgXukZWe45ETIg481eYdO0dVtOj0pm1_vp4pEMF03pkdjPn5s2CN27mxO4xsgrQ/exec',
  sheetName: 'Highscores'
};

const ScoreStorage = {
  // Hämta topplista
  async getHighScores() {
    if (STORAGE_TYPE === 'localStorage') {
      return this.getLocalScores();
    } else {
      return this.getGoogleScores();
    }
  },

  // Spara nytt score
  async saveScore(playerName, score) {
    if (STORAGE_TYPE === 'localStorage') {
      return this.saveLocalScore(playerName, score);
    } else {
      return this.saveGoogleScore(playerName, score);
    }
  },

  // === LOCAL STORAGE METODER ===
  getLocalScores() {
    const stored = localStorage.getItem('snakeHighScores');
    if (!stored) return [];
    const scores = JSON.parse(stored);
    return scores.sort((a, b) => b.score - a.score).slice(0, 5);
  },

  saveLocalScore(playerName, score) {
    const scores = this.getLocalScores();
    scores.push({ name: playerName, score: score, date: new Date().toISOString() });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('snakeHighScores', JSON.stringify(scores.slice(0, 5)));
    return Promise.resolve(scores.slice(0, 5));
  },

  // === GOOGLE SHEETS METODER (tom tills du konfigurerar) ===
  async getGoogleScores() {
    try {
      const response = await fetch(GOOGLE_SHEETS_CONFIG.scriptUrl + '?action=getScores');
      const data = await response.json();
      return (data.scores || []).slice(0, 5);
    } catch (error) {
      console.error('Kunde inte hämta scores från Google Sheets:', error);
      return [];
    }
  },

  async saveGoogleScore(playerName, score) {
    try {
      // Skicka som urlencoded för att undvika CORS-preflight
      const body = new URLSearchParams({
        action: 'saveScore',
        name: playerName,
        score: String(score)
      });

      const response = await fetch(GOOGLE_SHEETS_CONFIG.scriptUrl, {
        method: 'POST',
        body
      });
      const data = await response.json();
      return (data.scores || []).slice(0, 5);
    } catch (error) {
      console.error('Kunde inte spara score till Google Sheets:', error);
      return this.getGoogleScores();
    }
  }
};

// Bilder
const headImg = new Image();
headImg.src = 'bilder/snake/bryan.png';
headImg.onerror = () => console.error('Kunde inte ladda bilder/bryan_pussar.png');

const foodImg = new Image();
foodImg.src = 'bilder/snake/ebba.png';
foodImg.onerror = () => console.error('Kunde inte ladda bilder/ebba.png');


/* ========================================
   DOM-INITIALISERING OCH EVENT LISTENERS
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
  /* ========================================
     PRE-GATE / LÖSENORDSSIDAN
     ======================================== */
  const preGate = document.getElementById('preGate');
  // Enter-knappen borttagen – formuläret visas direkt
  const gatePasswordForm = document.getElementById('gatePasswordForm');
  const gatePasswordInput = document.getElementById('gatePasswordInput');
  // Ändra lösenordet här:
  const SITE_PASSWORD = 'Kigali'; // <-- BYT TILL ERT RIKTIGA LÖSENORD

  if (preGate && gatePasswordForm) {
    // Kolla om användaren redan har loggat in denna session
    if (sessionStorage.getItem('siteAccess') === 'granted') {
      preGate.remove();
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      // Hantera formulärets submit direkt
      gatePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = gatePasswordInput.value.trim();
        if (val === SITE_PASSWORD) {
          // Spara access i sessionStorage (försvinner när fliken stängs)
          sessionStorage.setItem('siteAccess', 'granted');
          // Ta bort overlay
          preGate.classList.add('hidden');
          setTimeout(() => {
            preGate.remove();
            window.scrollTo({ top: 0, behavior: 'instant' });
          }, 600);
        } else {
          // Fel lösenord – skaka input / tydlig feedback
          gatePasswordInput.style.animation = 'shake .4s';
          gatePasswordInput.addEventListener('animationend', () => {
            gatePasswordInput.style.animation = '';
          }, { once: true });
        }
      });
    }
  }

  // Liten keyframes animation för fel lösenord (skaka)
  const styleEl = document.createElement('style');
  styleEl.textContent = `@keyframes shake { 
    0%,100% { transform: translateX(0);} 
    25% { transform: translateX(-6px);} 
    50% { transform: translateX(6px);} 
    75% { transform: translateX(-3px);} 
  }`;
  document.head.appendChild(styleEl);

  const btn = document.getElementById('easterEggBtn');
  const popup = document.getElementById('easterEggPopup');
  const closeBtn = document.getElementById('eggCloseBtn');
  const startBtn = document.getElementById('startGameBtn');
  const restartBtn = document.getElementById('restartBtn');
  ensureMobileHighscoreUI();

  // Översätt sidan vid laddning
  translatePage();
  updateApeImages();

  // Lägg till event listeners för båda språkknapparna
  const preGateLanguageBtn = document.getElementById('preGateLanguageBtn');
  if (preGateLanguageBtn) {
    preGateLanguageBtn.addEventListener('click', toggleLanguage);
  }
  // Fånga alla språkknappar i menyerna (oavsett id)
  const menuLanguageButtons = document.querySelectorAll('.language-btn');
  if (menuLanguageButtons.length) {
    menuLanguageButtons.forEach(btn => btn.addEventListener('click', toggleLanguage));
  }

  canvas = document.getElementById('snakeCanvas');
  if (canvas) {
    ctx = canvas.getContext('2d');

    // Öppna popup
    btn?.addEventListener('click', () => {
      openPopup();
      updateHighScoreDisplay(); // Ladda topplistan när popup öppnas
    });

    // Stäng popup (X eller klick utanför)
    closeBtn?.addEventListener('click', closePopup);
    popup?.addEventListener('click', (e) => {
      if (e.target === popup) closePopup();
    });

    // Starta spel
    startBtn?.addEventListener('click', () => {
      document.getElementById('startScreen').style.display = 'none';
      document.getElementById('gameScreen').style.display = 'block';
      startGame();
    });

    // Restart (efter game over)
    restartBtn?.addEventListener('click', () => {
      startGame();
      restartBtn.style.display = 'none';
    });

    // Tangentkontroll
    document.addEventListener('keydown', handleKey);

    // Mobila pilknappar
    const arrowUp = document.getElementById('arrowUp');
    const arrowDown = document.getElementById('arrowDown');
    const arrowLeft = document.getElementById('arrowLeft');
    const arrowRight = document.getElementById('arrowRight');

    arrowUp?.addEventListener('click', () => changeDirection({ x: 0, y: -1 }));
    arrowDown?.addEventListener('click', () => changeDirection({ x: 0, y: 1 }));
    arrowLeft?.addEventListener('click', () => changeDirection({ x: -1, y: 0 }));
    arrowRight?.addEventListener('click', () => changeDirection({ x: 1, y: 0 }));

    function changeDirection(newDir) {
      if (newDir.x === -direction.x && newDir.y === -direction.y) return;
      nextDirection = newDir;
    }

    // Touch/swipe support för mobil
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // Lyssna på touch-events på canvas
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Förhindra scrollning
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchEndX = touch.clientX;
      touchEndY = touch.clientY;
      handleSwipe();
    }, { passive: false });

    function handleSwipe() {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const minSwipeDistance = 30;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > minSwipeDistance) {
          if (deltaX > 0) {
            handleSwipeDirection({ x: 1, y: 0 });
          } else {
            handleSwipeDirection({ x: -1, y: 0 });
          }
        }
      } else {
        if (Math.abs(deltaY) > minSwipeDistance) {
          if (deltaY > 0) {
            handleSwipeDirection({ x: 0, y: 1 });
          } else {
            handleSwipeDirection({ x: 0, y: -1 });
          }
        }
      }
    }

    function handleSwipeDirection(newDir) {
      if (newDir.x === -direction.x && newDir.y === -direction.y) return;
      nextDirection = newDir;
    }
  }
});


/* ========================================
   POPUP-HANTERING
   ======================================== */
function openPopup() {
  const popup = document.getElementById('easterEggPopup');
  // Ta bort aria-hidden FÖRE vi visar popup och sätter fokus
  popup.setAttribute('aria-hidden', 'false');
  popup.style.display = 'flex';

  document.getElementById('startScreen').style.display = 'block';
  document.getElementById('gameScreen').style.display = 'none';
  stopGame();
  const sheet = document.getElementById('highScoreSheet');
  const toggle = document.getElementById('highscoreToggle');
  if (sheet) {
    sheet.classList.remove('visible');
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
  }
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
  }
  
  // Kör översättning för popupen
  if (typeof translatePage === 'function') {
    translatePage();
  }
}

function closePopup() {
  const popup = document.getElementById('easterEggPopup');
  // Dölj först, sedan sätt aria-hidden
  popup.style.display = 'none';
  popup.setAttribute('aria-hidden', 'true');
  stopGame();
  document.dispatchEvent(new Event('closeHighscoreSheet'));
}


/* ========================================
   SPELLOGIK - START, STOPP OCH KONTROLLER
   ======================================== */
function startGame() {
  stopGame();
  
  // Dölj restart-knappen när spelet startar
  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) restartBtn.style.display = 'none';

  cols = BOARD_COLS;
  rows = BOARD_ROWS;
  cellSize = BASE_CELL_SIZE;

  // Anpassa canvas för mobil
  const maxWidth = Math.min(window.innerWidth - 40, cols * cellSize);
  const scaledCellSize = Math.floor(maxWidth / cols);
  cellSize = scaledCellSize;

  const canvasPx = cols * cellSize;
  canvas.width = canvasPx;
  canvas.height = canvasPx;
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';

  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';

  snake = [
    { x: 0, y: Math.floor(rows / 2) },
    { x: 1, y: Math.floor(rows / 2) }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  updateScore();

  placeFood();
  running = true;
  gameInterval = setInterval(gameTick, TICK_MS);
  draw();
}

function stopGame() {
  running = false;
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
}

function handleKey(e) {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault();
  const newDir =
    e.key === 'ArrowUp' ? { x: 0, y: -1 } :
    e.key === 'ArrowDown' ? { x: 0, y: 1 } :
    e.key === 'ArrowLeft' ? { x: -1, y: 0 } :
    { x: 1, y: 0 };

  if (newDir.x === -direction.x && newDir.y === -direction.y) return;
  nextDirection = newDir;
}


/* ========================================
   GAME LOOP OCH KOLLISIONSHANTERING
   ======================================== */
function gameTick() {
  if (!running) return;
  direction = nextDirection;
  const head = snake[snake.length - 1];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
    return gameOver();
  }

  if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
    return gameOver();
  }

  snake.push(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    score++;
    updateScore();
    placeFood();
  } else {
    snake.shift();
  }

  draw();
}

function placeFood() {
  let x, y;
  do {
    x = Math.floor(Math.random() * cols);
    y = Math.floor(Math.random() * rows);
  } while (snake.some(seg => seg.x === x && seg.y === y));
  food = { x, y };
}


/* ========================================
   RITNING - CANVAS RENDERING
   ======================================== */
function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Anpassa lineWidth baserat på cellSize för att se bra ut på alla storlekar
  ctx.strokeStyle = '#32543c';
  ctx.lineWidth = Math.max(1, Math.floor(cellSize / 24));
  
  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      ctx.strokeRect(gx * cellSize + 0.5, gy * cellSize + 0.5, cellSize - 1, cellSize - 1);
    }
  }

  // Anpassa bildstorlek baserat på faktisk cellSize
  const imgScale = Math.max(2, Math.min(IMAGE_SCALE, cellSize / 8));
  const imgSize = Math.floor(cellSize * imgScale);
  const imgOffset = Math.floor((imgSize - cellSize) / 2);

  const foodPx = food.x * cellSize;
  const foodPy = food.y * cellSize;
  if (foodImg.complete && foodImg.naturalWidth > 0) {
    ctx.drawImage(foodImg, foodPx - imgOffset + 2, foodPy - imgOffset + 2, imgSize - 4, imgSize - 4);
  } else {
    ctx.fillStyle = '#ff4545';
    ctx.fillRect(foodPx + 4, foodPy + 4, cellSize - 8, cellSize - 8);
  }

  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const sx = seg.x * cellSize;
    const sy = seg.y * cellSize;
    const isHead = i === snake.length - 1;

    if (isHead && headImg.complete && headImg.naturalWidth > 0) {
      ctx.drawImage(headImg, sx - imgOffset + 2, sy - imgOffset + 2, imgSize - 4, imgSize - 4);
    } else {
      ctx.font = `${cellSize - 4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💋', sx + cellSize / 2, sy + cellSize / 2);
    }
  }
}


/* ========================================
   GAME OVER OCH POÄNGHANTERING
   ======================================== */
function updateScore() {
  const el = document.getElementById('score');
  if (el) el.textContent = translations[currentLanguage]['game-score'] + ': ' + score;
}

async function gameOver() {
  stopGame();
  
  // Visa prompt för namn
  const playerName = await promptPlayerName();
  
  // Spara score om användaren inte kryssat i "spara inte"
  if (playerName !== null) {
    await ScoreStorage.saveScore(playerName || 'Gäst', score);
    // Uppdatera topplistan
    await updateHighScoreDisplay();
  }
  
  const restartBtn = document.getElementById('restartBtn');
  restartBtn.style.display = 'inline-block';
}

function promptPlayerName() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '10000';
    
    const box = document.createElement('div');
    box.style.background = '#2E5339';
    box.style.padding = '2rem';
    box.style.borderRadius = '12px';
    box.style.textAlign = 'center';
    box.style.maxWidth = '400px';
    box.style.width = '90%';
    box.style.position = 'relative';
    
    const lang = currentLanguage;
    box.innerHTML = `
      <button id="skipSaveCheckbox" style="position: absolute; top: 1rem; right: 1rem; background: transparent; 
        border: 2px solid #fff5d6; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; 
        color: #fff5d6; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; 
        transition: all 0.2s ease;">✕</button>
      <h3 style="color: #efbc22; font-family: 'Kage2', cursive; font-size: 2rem; margin: 0 0 1rem 0;">${translations[lang]['game-over-title']}</h3>
      <p style="color: #fff5d6; margin-bottom: 1.5rem; font-size: 1.1rem;">${translations[lang]['game-over-text']} <strong>${score}</strong> ${translations[lang]['game-over-kisses']}</p>
      <input type="text" id="playerNameInput" placeholder="${translations[lang]['game-player-name']}" maxlength="20" 
        style="width: 100%; padding: 0.75rem; border: none; border-radius: 8px; font-size: 1rem; 
        font-family: 'Codesaver', monospace; background: #fff5d6; color: #2E5339; margin-bottom: 1rem; box-sizing: border-box;">
      <button id="submitNameBtn" style="background: #efbc22; color: #2E5339; border: none; 
        padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; font-weight: 700; 
        cursor: pointer; font-family: 'Codesaver', monospace; width: 100%;">${translations[lang]['game-save']}</button>
    `;
    
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    
    const input = document.getElementById('playerNameInput');
    const submitBtn = document.getElementById('submitNameBtn');
    const skipBtn = document.getElementById('skipSaveCheckbox');
    
    input.focus();
    
    const submit = () => {
      const name = input.value.trim();
      document.body.removeChild(overlay);
      resolve(name);
    };
    
    const skip = () => {
      document.body.removeChild(overlay);
      resolve(null); // Returnera null för att inte spara
    };
    
    submitBtn.addEventListener('click', submit);
    skipBtn.addEventListener('click', skip);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submit();
    });
  });
}

async function updateHighScoreDisplay() {
  const highScores = await ScoreStorage.getHighScores();
  const containers = [];
  const desktopList = document.getElementById('highScoreList');
  const mobileSheet = document.getElementById('highScoreSheet');
  if (desktopList) containers.push(desktopList);
  if (mobileSheet) containers.push(mobileSheet);
  if (!containers.length) return;

  const lang = currentLanguage;
  const heading = translations[lang]['game-leaderboard'];
  const noScores = translations[lang]['game-no-scores'];
  const scoreLabel = translations[lang]['game-score'].toLowerCase();
  const guestLabel = translations[lang]['game-guest'];

  containers.forEach(container => {
    container.innerHTML = `<h3>${heading}</h3>`;
    if (highScores.length === 0) {
      container.innerHTML += `<p style="font-size: 0.9rem;">${noScores}</p>`;
      return;
    }

    const list = document.createElement('ol');
    list.style.margin = '0';
    list.style.padding = '0 0 0 1.5rem';
    list.style.color = '#fff5d6';
    list.style.fontSize = '0.95rem';

    highScores.forEach(entry => {
      const li = document.createElement('li');
      li.style.marginBottom = '0.3rem';
      const name = entry.name || guestLabel;
      li.innerHTML = `${name}: <strong>${entry.score}</strong> ${scoreLabel}`;
      list.appendChild(li);
    });

    container.appendChild(list);
  });
}

function flashMessage(text) {
  const box = document.createElement('div');
  box.textContent = text;
  box.style.position = 'absolute';
  box.style.top = '50%';
  box.style.left = '50%';
  box.style.transform = 'translate(-50%, -50%)';
  box.style.background = 'rgba(0,0,0,0.75)';
  box.style.color = '#fff';
  box.style.padding = '0.8rem 1.2rem';
  box.style.borderRadius = '12px';
  box.style.fontSize = '1rem';
  box.style.fontWeight = '600';
  box.style.zIndex = '10';
  const wrapper = document.querySelector('.egg-box');
  wrapper.appendChild(box);
  setTimeout(() => box.remove(), 1800);
}

function ensureMobileHighscoreUI() {
  const gameScreen = document.getElementById('gameScreen');
  if (!gameScreen) return;

  // Skapa bottom sheet för mobil inne i spelet
  let sheet = document.getElementById('highScoreSheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'highScoreSheet';
    sheet.className = 'highscore-sheet';
    sheet.setAttribute('aria-hidden', 'true');
    gameScreen.appendChild(sheet);
  }

  // Skapa toggle-knapp inne i spelet, placerad efter mobilkontroller
  let toggle = document.getElementById('highscoreToggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.id = 'highscoreToggle';
    toggle.className = 'highscore-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'highScoreSheet');
    toggle.classList.add('mounted');
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls && mobileControls.parentNode === gameScreen) {
      mobileControls.insertAdjacentElement('afterend', toggle);
    } else {
      gameScreen.appendChild(toggle);
    }
  }

  // Uppdatera etikett enligt språk
  syncHighscoreToggleLabel();

  const closeSheet = () => {
    sheet.classList.remove('is-open');
    sheet.classList.remove('visible');
    sheet.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const handleOutsideClick = (event) => {
    if (!sheet.classList.contains('is-open')) return;
    const target = event.target;
    if (sheet.contains(target)) return;
    if (toggle.contains(target)) return;
    closeSheet();
  };

  toggle.addEventListener('click', () => {
    const willOpen = !sheet.classList.contains('is-open');
    if (willOpen) {
      sheet.classList.add('is-open');
      sheet.classList.add('visible');
      sheet.setAttribute('aria-hidden', 'false');
    } else {
      sheet.classList.remove('is-open');
      sheet.classList.remove('visible');
      sheet.setAttribute('aria-hidden', 'true');
    }
    toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  });

  // Stäng vid klick utanför sheet och toggle, inom spelrutan
  gameScreen.addEventListener('click', handleOutsideClick);

  // Stäng när popup stängs
  document.addEventListener('closeHighscoreSheet', closeSheet);
}

function syncHighscoreToggleLabel() {
  const toggle = document.getElementById('highscoreToggle');
  if (toggle && translations[currentLanguage]) {
    toggle.textContent = translations[currentLanguage]['game-leaderboard'];
  }
}


/* ========================================
   ÖVERSÄTTNINGAR
   ======================================== */
const translations = {
  sv: {
    // Navigation
    'nav-home': 'Hem',
    'nav-about': 'Om oss',
    'nav-travel': 'Resa och boende',
    'nav-rwanda': 'Om Rwanda',
    'nav-form': 'Formulär',
    'back-link': '← Tillbaka',
    
    // Lösenordssida
    'password-placeholder': 'Lösenord',
    'password-button': 'Kom in',
    
    // Startsida
    'hero-title': 'Vi ska gifta oss!',
    'date-location': '3 JULI 2027  |  RWANDA',
    'info-text-1': 'Så här ligger det till - vi ska gifta oss! I Rwanda den 3 juli 2027!',
    'info-text-2': 'Det är alltså inte nästa år, utan året därpå. Eftersom kombinationen bröllop + annan världsdel kan vara lite av ett pussel vill vi informera i god tid så att alla som vill kan vara med och fira med oss.',
    'info-text-3': 'På den här sidan kommer vi lägga upp all information ni behöver inför resan och bröllopet.',
    'cta-banner': 'Intresseanmälan',
    'cta-symbols-desktop': 'ᯓ ✈︎ ',
    'cta-symbols-mobile': 'ᯓ ✈︎',
    
    // Footer
    'footer-title': 'Vi längtar efter att ses!',
    'footer-text-1': 'Det här kommer bli en resa och ett firande vi aldrig glömmer,',
    'footer-text-2': 'tack för att du vill vara en del av den.',
    
    // Formulär
    'form-title': 'Intresseanmälan',
    'form-intro': 'Vi är i full gång med planeringen och skulle behöva lite hjälp för att få en känsla av hur många som kan tänka sig att följa med till Rwanda.<br><br>Fyll gärna i formuläret nedan så får vi en första indikation på om du har möjlighet att komma.',
    'form-name': 'Ditt namn',
    'form-email': 'Din e-post',
    'form-guests': 'Vill du lägga till fler gäster?',
    'form-guest-name': 'Namn',
    'form-guest-email': 'E-post',
    'form-attend-question': 'Kommer du till vårt bröllop?',
    'form-attend-yes': 'Ja',
    'form-attend-maybe': 'Kanske',
    'form-attend-no': 'Nej',
    'form-message': 'Något annat på hjärtat?',
    'form-submit': 'Skicka din anmälan',
    'form-info-title': 'Missa ingen information',
    'form-info-text': 'Vi kommer även använda uppgifterna från formuläret ovan till framtida informationsutskick, så även om du inte vet just nu så skriv gärna upp dig så du inte missar någon information.',
    
    // Page 2 & 3
    'page2-hero-title': 'Resa och boende',
    'page2-section1-title': 'Här var det visst lite tomt...',
    'page2-section1-text 1': 'Här kommer vi fylla på med information om resan till Rwanda och hur ni ska göra med resa, boende, visum och allt sånt.',
    'page2-section1-text 2': 'Håll utkik, och glöm inte att fylla i intresseanmälan så att ni inte missar någon viktig information!',

    'page2-section2-title': 'Boende',
    'page2-section2-text': 'Information om boende...',
    
    'page3-hero-title': 'Om Rwanda',
    'page3-section1-title': 'Välkommen till Rwanda',
    'page3-section1-text 1': 'I nordöstra Rwanda, i byn Rukara–Gahini, föddes Bryans mormor Olivia. Hon växte upp omgiven av sin stora familj och det vardagsliv som präglade byn. Idag bor många i Bryans släkt fortfarande kvar i Rwanda, och precis som dem är vi supertaggade på att samla alla vi tycker om till vårt bröllop.',
    'page3-section1-text 2': 'Vi vill fira vår kärlek – och samtidigt knyta an till Rwanda, som snart blir en naturlig del av våra liv tillsammans.',
    'page3-section1-text 3': 'Vi hoppas att ni som följer med får uppleva Rwanda med allt som gör landet så speciellt. Det är litet, grönt och kuperat, mitt i hjärtat av Östafrika, och kallas inte “landet med de tusen kullarna” utan anledning. Här möts böljande berg, djupa dalar och glittrande sjöar – och vi längtar efter att få dela allt detta med er.',
    'page3-gallery-title': 'Såhär kan en semester i Rwanda kan se ut!',
    'page3-activities-title': 'Att göra i Rwanda',
    'page3-activities-subtitle': '(förutom att gå på bröllop)',
    'page3-activity-gorillas': 'Vandra med bergsgorillor i <strong>Volcanoes National Park</strong>',
    'page3-activity-safari': 'Safari i <strong>Akagera National Park</strong> och se lejon och elefanter',
    'page3-activity-colobus': 'Vandring bland kolobusapor i <strong>Nyungwe Forest</strong>',
    'page3-activity-markets': 'Utforska <strong>Kigalis</strong> livliga marknader och mysiga kaféer (eller rooftop barer)',
    'page3-activity-genocide': 'Besök <strong>Kigali Genocide Memorial</strong>',
    'page3-activity-tea': 'Besök <strong>teplantager och kaffeodlingar</strong>',
    'page3-activity-dance': 'Upplev traditionell <strong>dans och musik</strong>',
    'page3-activity-neighbours': 'Eller… ta en avstickare till ett av Rwandas fantastiska grannländer, som <strong>Uganda eller Kenya</strong>!',
    'page3-fact-capital': '<strong>Huvudstad:</strong> Kigali',
    'page3-fact-languages': '<strong>Officiella språk:</strong> Kinyarwanda, engelska, franska',
    'page3-fact-currency': '<strong>Valuta:</strong> Rwandisk franc (RWF)',
    'page3-fact-area': '<strong>Yta:</strong> 26 338 km² (Ungefär dubbelt så stort som Skåne)',
    'page3-fact-population': '<strong>Invånare:</strong> Cirka 13 miljoner',
    'page3-security-title': 'Säkerhet i Rwanda',
    'page3-security-text': 'Rwanda anses nu som ett av de säkraste länderna i Afrika, och Kigali är känt för att vara rent, organiserat och relativt lugnt. Våldsbrott mot besökare är sällsynta, men normal uppmärksamhet och sunt förnuft gäller alltid.',
    'page3-security-link-text': 'Läs mer på UD:s webbplats:',
    'page3-security-link': 'Sverige utomlands – Rwanda säkerhetssituation',
    // Spel
    'game-title': 'Kyssjakten 💋',
    'game-subtitle': 'Hur många kyssar kan Ebba få?',
    'game-start': 'Starta',
    'game-score': 'Kyssar',
    'game-restart': 'Spela igen',
    'game-hint': 'Styr Bryan med hjälp av piltangenterna!',
    'game-over-title': 'Game Over! 💋',
    'game-over-text': 'Ebba fick',
    'game-over-kisses': 'kyssar!',
    'game-player-name': 'Ditt namn',
    'game-save': 'Spara',
    'game-leaderboard': 'Kyssjakten leaderboard',
    'game-no-scores': 'Inga resultat än!',
    'game-guest': 'Gäst'
  },
  en: {
    // Navigation
    'nav-home': 'Home',
    'nav-about': 'About us',
    'nav-travel': 'Travel & Accommodation',
    'nav-rwanda': 'About Rwanda',
    'nav-form': 'Registration form',
    'back-link': '← Back',
    
    // Password page
    'password-placeholder': 'Password',
    'password-button': 'Enter',
    
    // Homepage
    'hero-title': "We're getting married!",
    'date-location': 'JULY 3, 2027  |  RWANDA',
    'info-text-1': "Here's the thing - we're getting married! In Rwanda on July 3, 2027!",
    'info-text-2': "So it's not next year, but the year after. Since the combination of wedding + another continent can be a bit of a puzzle, we want to inform you well in advance so that everyone who wants to can join us in celebrating.",
    'info-text-3': 'On this page, we will post all the information you need before the trip and the wedding.',
    'cta-banner': 'Register your interest',
    'cta-symbols-desktop': 'ᯓ ✈︎ ',
    'cta-symbols-mobile': 'ᯓ ✈︎',
    
    // Footer
    'footer-title': 'We look forward to seeing you!',
    'footer-text-1': 'This will be a journey and a celebration we will never forget,',
    'footer-text-2': 'thank you for wanting to be a part of it.',
    
    // Form
    'form-title': 'Register your interest',
    'form-intro': "We're in full swing with the planning and could use some help to get a sense of how many might be able to join us in Rwanda.<br><br>Please fill out the form below so we can get an initial indication of whether you'll be able to come.",
    'form-name': 'Your name',
    'form-email': 'Your email',
    'form-guests': 'Do you want to add more guests?',
    'form-guest-name': "Name",
    'form-guest-email': "Email",
    'form-attend-question': 'Will you come to our wedding?',
    'form-attend-yes': 'Yes',
    'form-attend-maybe': 'Maybe',
    'form-attend-no': 'No',
    'form-message': 'Anything else on your mind?',
    'form-submit': 'Submit your registration',
    'form-info-title': "Don't miss any information",
    'form-info-text': "We will also use the information from the form above for future mailings, so even if you don't know right now, feel free to sign up so you don't miss any information.",
    
    // Page 2
    'page2-hero-title': 'Travel & Accommodation',
    'page2-section1-title': 'Looks a little empty here...',
    'page2-section1-text 1': 'We’ll soon fill this section with information about the trip to Rwanda and everything you need to know about travel, accommodation, visas, and more.',
    'page2-section1-text 2': 'Stay tuned and don’t forget to fill in the registration form so you don’t miss any important information!',
    'page2-section2-title': 'Accommodation',
    'page2-section2-text': 'Accommodation information...',

    // Page 3 - Rwanda
    'page3-hero-title': 'About Rwanda',
    'page3-fact-capital': '<strong>Capital:</strong> Kigali',
    'page3-fact-languages': '<strong>Official languages:</strong> Kinyarwanda, English, French',
    'page3-fact-currency': '<strong>Currency:</strong> Rwandan franc (RWF)',
    'page3-fact-area': '<strong>Area:</strong> 26,338 km² (About twice the size of Skåne)',
    'page3-fact-population': '<strong>Population:</strong> About 13 million',
    'page3-why-title': 'Why Rwanda?',
    'page3-why-text': 'Rwanda is home to much of Bryan’s family. Like them, we are so excited to gather all our loved ones for our wedding!',
    'page3-why-desc': 'Rwanda is a small, green, and hilly country in the heart of East Africa, often called "the land of a thousand hills." The landscape is full of rolling mountains, deep valleys, and large lakes.',
    'page3-activities-title': 'Things to do in Rwanda',
    'page3-activities-subtitle': '(besides going to a wedding)',
    'page3-activity-gorillas': 'Hike with mountain gorillas in <strong>Volcanoes National Park</strong>',
    'page3-activity-safari': 'Safari in <strong>Akagera National Park</strong> and see lions and elephants',
    'page3-activity-colobus': 'Hike with colobus monkeys in <strong>Nyungwe Forest</strong>',
    'page3-activity-markets': 'Explore <strong>Kigali’s</strong> lively markets and cozy cafés',
    'page3-activity-genocide': 'Visit the <strong>Kigali Genocide Memorial</strong>',
    'page3-activity-tea': 'Visit <strong>tea plantations and coffee farms</strong>',
    'page3-activity-dance': 'Experience traditional <strong>dance and music</strong>',
    'page3-activity-neighbours': 'Or... visit one of Rwanda’s amazing neighbors, such as <strong>Uganda or Kenya</strong>!',
    'page3-security-title': 'Safety in Rwanda',
    'page3-security-text': 'Rwanda is now considered one of the safest countries in Africa, and Kigali is known for being clean, organized, and relatively calm. Violent crime against visitors is rare, but normal attention and common sense always apply.',
    'page3-security-link-text': 'Read more on the Swedish Ministry for Foreign Affairs website:',
    'page3-security-link': 'Sweden Abroad – Rwanda safety situation',
    'page3-gallery-title': 'This is what a holiday in Rwanda can look like!',
    // Rwanda intro paragraphs (match keys used in page3.html)
    'page3-section1-text 1': "In northeastern Rwanda, in the village of Rukara–Gahini, Bryan’s grandmother Olivia was born. She grew up surrounded by her large family and the everyday life of the village. Today, many of Bryan’s relatives still live in Rwanda, and like them, we are super excited to gather everyone we love for our wedding.",
    'page3-section1-text 2': 'We want to celebrate our love — and at the same time connect with Rwanda, which will soon become a natural part of our lives together.',
    'page3-section1-text 3': "We hope that those of you who join us will experience Rwanda with everything that makes the country so special. It’s small, green, and hilly, in the heart of East Africa, and it’s not called “the land of a thousand hills” for nothing. Rolling mountains, deep valleys, and shimmering lakes — we can’t wait to share it all with you.",
    
    // Game
    'game-title': 'The Kiss Hunt 💋',
    'game-subtitle': 'How many kisses can Ebba get?',
    'game-start': 'Start',
    'game-score': 'Kisses',
    'game-restart': 'Play again',
    'game-hint': 'Control Bryan with the arrow keys!',
    'game-over-title': 'Game Over! 💋',
    'game-over-text': 'Ebba got',
    'game-over-kisses': 'kisses!',
    'game-player-name': 'Your name',
    'game-save': 'Save',
    'game-leaderboard': 'The Kiss Hunt - Leaderboard',
    'game-no-scores': 'No results yet!',
    'game-guest': 'Guest'
  }
};

let currentLanguage = localStorage.getItem('siteLanguage') || 'sv';

// Gör översättningar tillgängliga globalt
window.translations = translations;
window.currentLanguage = currentLanguage;

function translatePage() {
  // Uppdatera globalt språk
  window.currentLanguage = currentLanguage;
  const lang = currentLanguage;
  
  // Översätt alla element med data-i18n attribut
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[lang][key]) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translations[lang][key];
      } else {
        element.innerHTML = translations[lang][key];
      }
    }
  });
  
  // Uppdatera språkknappen
  const langLabels = document.querySelectorAll('.lang-text');
  if (langLabels.length) {
    langLabels.forEach(el => el.textContent = (lang === 'sv' ? 'EN' : 'SV'));
  }
  
  // Spara valt språk
  localStorage.setItem('siteLanguage', lang);
  // Byt bilder på förstasidan
  updateFrontpageImages();
  // Byt bild på page1
  updatePage1Image();
  // Uppdatera mobila topplist-knappen
  syncHighscoreToggleLabel();
  if (document.getElementById('highScoreList') || document.getElementById('highScoreSheet')) {
    updateHighScoreDisplay();
  }
}

// Uppdatera apa-bilder baserat på aktuellt språk
function updateApeImages() {
  const apes = document.querySelectorAll('#easterEggBtn, .easter-egg-ape');
  apes.forEach(ape => {
    const svImg = ape.querySelector('.ape-sv');
    const enImg = ape.querySelector('.ape-en');
    if (currentLanguage === 'sv') {
      svImg && (svImg.style.display = 'block');
      enImg && (enImg.style.display = 'none');
    } else {
      svImg && (svImg.style.display = 'none');
      enImg && (enImg.style.display = 'block');
    }
  });
}

function toggleLanguage() {
  currentLanguage = currentLanguage === 'sv' ? 'en' : 'sv';
  translatePage();
  updateApeImages();
  updatePage1Image();

  // Stäng hamburgermenyn om språkknappen i menyn trycks
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const menuOverlay = document.getElementById('menuOverlay');
  if (hamburgerMenu && hamburgerMenu.classList.contains('active')) {
    hamburgerMenu.classList.remove('active');
    hamburgerBtn && hamburgerBtn.classList.remove('active');
    menuOverlay && (menuOverlay.style.display = 'none');
    hamburgerMenu.setAttribute('aria-hidden', 'true');
  }

  // Uppdatera highscore-listan om den är synlig
  const highScoreList = document.getElementById('highScoreList');
  if (highScoreList && highScoreList.innerHTML) {
    updateHighScoreDisplay();
  }

  // Uppdatera score om spelet körs
  if (running) {
    updateScore();
  }
}

// === BYT BILDER VID SPRÅKBYTE PÅ FÖRSTASIDAN ===
function updateFrontpageImages() {
  // Endast på startsidan
  if (!document.body.classList.contains('frontpage')) return;
  const imageLinks = document.querySelectorAll('.image-link img');
  if (!imageLinks.length) return;
  if (currentLanguage === 'en') {
    // Byt till engelska bilder
    imageLinks[0].src = 'bilder/Om/En/1.png';
    imageLinks[1].src = 'bilder/Om/En/2.png';
    imageLinks[2].src = 'bilder/Om/En/3.png';
  } else {
    // Byt till svenska bilder
    imageLinks[0].src = 'bilder/Om/Sv/1.png';
    imageLinks[1].src = 'bilder/Om/Sv/2.png';
    imageLinks[2].src = 'bilder/Om/Sv/3.png';
  }
}

// === BYT BILD VID SPRÅKBYTE PÅ PAGE1 ===
function updatePage1Image() {
  const page1Image = document.getElementById('page1Image');
  if (!page1Image) return;
  if (currentLanguage === 'en') {
    page1Image.src = page1Image.dataset.srcEn;
  } else {
    page1Image.src = page1Image.dataset.srcSv;
  }
}

// Kör vid språkbyte och vid sidladdning
document.addEventListener('DOMContentLoaded', () => {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const menuOverlay = document.getElementById('menuOverlay');

  (function initHamburger() {
    const btn = document.getElementById('hamburgerBtn');
    const menu = document.getElementById('hamburgerMenu');
    const overlay = document.getElementById('menuOverlay');
    if (!btn || !menu || !overlay) return;

    function close() {
      btn.classList.remove('active');
      menu.classList.remove('active');
      overlay.style.display = 'none';
      menu.setAttribute('aria-hidden', 'true');
    }
    function open() {
      btn.classList.add('active');
      menu.classList.add('active');
      overlay.style.display = 'block';
      menu.setAttribute('aria-hidden', 'false');
    }

    btn.addEventListener('click', () => {
      const isOpen = btn.classList.contains('active');
      if (isOpen) close(); else open();
    });
    overlay.addEventListener('click', close);
    document.addEventListener('keyup', e => {
      if (e.key === 'Escape') close();
    });
  })();

  /* ========================================
     PAGE HEADER SCROLL EFFECT
     ======================================== */
  const pageHeader = document.getElementById('pageHeader');
  const pageHeaderLogo = document.querySelector('.page-header-logo');
  
  if (pageHeader) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      // Växla mellan liten (top) och större (scrollad) logga
      if (pageHeaderLogo) {
        const isMobile = window.innerWidth <= 768;
        const maxScroll = 200;
        const startHeight = isMobile ? 42 : 70; // vid toppen
        const endHeight = isMobile ? 38 : 52;   // mindre när man scrollar
        const scrollPercent = Math.min(scrollY / maxScroll, 1);
        const logoHeight = startHeight - ((startHeight - endHeight) * scrollPercent);
        pageHeaderLogo.style.height = logoHeight + 'px';
      }
      
      // Lägg till scrolled class för bakgrund
      if (scrollY > 50) {
        pageHeader.classList.add('scrolled');
      } else {
        pageHeader.classList.remove('scrolled');
      }
    });
    // Sätt initial höjd direkt
    if (pageHeaderLogo) {
      const isMobileInit = window.innerWidth <= 768;
      pageHeaderLogo.style.height = (isMobileInit ? 42 : 70) + 'px';
    }
  }

  /* ========================================
     RWANDA GALLERY LIGHTBOX
     ======================================== */
  function initRwandaLightbox() {
    const images = Array.from(document.querySelectorAll('.rwanda-gallery-grid .gallery-item img'));
    if (!images.length) return; // Ingen galleri på sidan

    // Skapa overlay om den inte redan finns
    let overlay = document.querySelector('.lightbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = `
        <div class="lightbox-dialog">
          <div class="lightbox-image-wrapper">
            <button class="lightbox-nav-btn prev" aria-label="Föregående bild">‹</button>
            <img alt="" />
            <button class="lightbox-nav-btn next" aria-label="Nästa bild">›</button>
            <button class="lightbox-close-btn" aria-label="Stäng">✕</button>
          </div>
          <div class="lightbox-caption" aria-live="polite"></div>
        </div>`;
      document.body.appendChild(overlay);
    }

    const imgEl = overlay.querySelector('img');
    const captionEl = overlay.querySelector('.lightbox-caption');
    const btnPrev = overlay.querySelector('.lightbox-nav-btn.prev');
    const btnNext = overlay.querySelector('.lightbox-nav-btn.next');
    const btnClose = overlay.querySelector('.lightbox-close-btn');
    let currentIndex = 0;

    function show(index) {
      if (index < 0) index = images.length - 1;
      if (index >= images.length) index = 0;
      currentIndex = index;
      const sourceImg = images[currentIndex];
      imgEl.src = sourceImg.src;
      imgEl.alt = sourceImg.alt || '';
      captionEl.textContent = sourceImg.alt || '';
    }

    function open(index) {
      show(index);
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      btnClose.focus();
      document.addEventListener('keydown', handleKeys);
      overlay.addEventListener('click', backdropClose);
    }

    function close() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeys);
      overlay.removeEventListener('click', backdropClose);
    }

    function handleKeys(e) {
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowRight') { show(currentIndex + 1); }
      else if (e.key === 'ArrowLeft') { show(currentIndex - 1); }
    }

    function backdropClose(e) {
      if (e.target === overlay) close();
    }

    // Event listeners på thumbnails
    images.forEach((img, idx) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => open(idx));
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(idx); }
      });
      img.setAttribute('tabindex', '0');
    });

    btnPrev.addEventListener('click', () => show(currentIndex - 1));
    btnNext.addEventListener('click', () => show(currentIndex + 1));
    btnClose.addEventListener('click', close);
  }

  initRwandaLightbox();
  /* ========================================
     GALLERI 4x5 MED 3 STORA 2x2 BILDER (BIG) – FIXA POSITIONER
     ======================================== */
  function placeBigGalleryItems() {
    const grid = document.querySelector('.rwanda-gallery-grid');
    if (!grid) return;
    const items = Array.from(grid.querySelectorAll('.gallery-item'));
    if (items.length === 0) return;

    // Ta bort tidigare state
    items.forEach(it => {
      it.classList.remove('big','size-2','size-3');
      it.style.gridRow = '';
      it.style.gridColumn = '';
    });

    // Välj 3 första som BIG (2x2)
    const bigItems = items.slice(0, Math.min(3, items.length));
    bigItems.forEach(it => it.classList.add('big'));

    // På desktop (≥769px): lägg dem på fasta positioner i en 5x4 grid
    const isDesktop = window.innerWidth >= 769;
    if (!isDesktop) {
      // Mobil: låt standardflödet gälla (big spänner 2x2 via CSS)
      return;
    }

    // Fasta 2x2-startpositioner (rad, kol), 1-indexerat
    const bigPositions = [
      { r: 1, c: 3 }, // över mitten
      { r: 2, c: 1 }, // mitten-vänster
      { r: 3, c: 3 }  // neder mitten
    ];

    bigItems.forEach((item, idx) => {
      const pos = bigPositions[idx];
      if (!pos) return;
      item.style.gridRow = `${pos.r} / span 2`;
      item.style.gridColumn = `${pos.c} / span 2`;
    });

    // Markera upptagna celler av big-blocken
    const occupied = new Set();
    function key(r, c) { return `${r},${c}`; }
    bigPositions.slice(0, bigItems.length).forEach(({ r, c }) => {
      occupied.add(key(r, c));
      occupied.add(key(r, c + 1));
      occupied.add(key(r + 1, c));
      occupied.add(key(r + 1, c + 1));
    });

    // Lista alla återstående singel-celler (1x1) i läsordning
    const singleSlots = [];
    for (let rr = 1; rr <= 4; rr++) {
      for (let cc = 1; cc <= 5; cc++) {
        if (!occupied.has(key(rr, cc))) singleSlots.push({ r: rr, c: cc });
      }
    }

    // Tilldela resterande items till singel-celler
    const rest = items.slice(bigItems.length);
    rest.forEach((it, i) => {
      const slot = singleSlots[i];
      if (!slot) return; // fler bilder än rutor → låt dem auto-placeras
      it.style.gridRow = `${slot.r}`;
      it.style.gridColumn = `${slot.c}`;
    });
  }

  placeBigGalleryItems();
});

/* ========================================
   EASTER EGG - APE BUTTONS
   ======================================== */
document.addEventListener('DOMContentLoaded', function() {
  // Lägg till eventlyssnare för alla easter egg-apor
  const easterEggApesElements = document.querySelectorAll('.easter-egg-ape');
  
  easterEggApesElements.forEach(ape => {
    ape.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Trigger the hidden easter egg button
      const btn = document.getElementById('easterEggBtn');
      if (btn) {
        btn.click();
      }
    });
  });
});