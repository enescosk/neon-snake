(() => {
  const GRID_SIZE = 20;
  const TICK_MS = 120;
  const FLOATER_LIFE = 8;
  const HEAD_PULSE_DECAY = 0.25;
  const STORAGE_BEST = "snake_best_score";
  const STORAGE_HELP = "snake_has_started";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const boardEl = document.querySelector(".board");
  const scoreEl = document.getElementById("score");
  const statusEl = document.getElementById("status");
  const startBtn = document.getElementById("start");
  const pauseBtn = document.getElementById("pause");
  const controlsEl = document.getElementById("controls");
  const helpEl = document.getElementById("help");
  const overlayEl = document.getElementById("overlay");
  const finalScoreEl = document.getElementById("final-score");
  const bestScoreEl = document.getElementById("best-score");
  const restartBtn = document.getElementById("restart");

  let bestScore = Number(localStorage.getItem(STORAGE_BEST)) || 0;
  let hasStarted = localStorage.getItem(STORAGE_HELP) === "1";

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  function equals(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function isOpposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  function rngDefault() {
    return Math.random();
  }

  function spawnFood(snake, rng) {
    const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
    const empty = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const key = `${x},${y}`;
        if (!occupied.has(key)) empty.push({ x, y });
      }
    }
    if (empty.length === 0) return null;
    const idx = Math.floor(rng() * empty.length);
    return empty[idx];
  }

  function createInitialState(rng = rngDefault) {
    const snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ];
    return {
      snake,
      dir: DIRS.right,
      nextDir: DIRS.right,
      food: spawnFood(snake, rng),
      score: 0,
      running: false,
      paused: false,
      gameOver: false,
      headPulse: 0,
      floaters: [],
      rng,
    };
  }

  function stepState(state) {
    if (!state.running || state.paused || state.gameOver) return state;

    const dir = state.nextDir;
    const head = state.snake[0];
    const rawNext = add(head, dir);
    const nextHead = {
      x: (rawNext.x + GRID_SIZE) % GRID_SIZE,
      y: (rawNext.y + GRID_SIZE) % GRID_SIZE,
    };

    const willEat = state.food && equals(nextHead, state.food);

    const nextSnake = [nextHead, ...state.snake];
    if (!willEat) nextSnake.pop();

    const hitSelf = nextSnake.slice(1).some((p) => equals(p, nextHead));

    let headPulse = Math.max(0, state.headPulse - HEAD_PULSE_DECAY);
    let floaters = state.floaters
      .map((f) => ({ ...f, life: f.life - 1 }))
      .filter((f) => f.life > 0);

    if (willEat && state.food) {
      headPulse = 1;
      floaters = [
        ...floaters,
        { x: state.food.x, y: state.food.y, life: FLOATER_LIFE },
      ];
    }

    if (hitSelf) {
      return { ...state, gameOver: true, running: false, headPulse, floaters };
    }

    let food = state.food;
    let score = state.score;
    if (willEat) {
      score += 1;
      food = spawnFood(nextSnake, state.rng);
    }

    return {
      ...state,
      snake: nextSnake,
      dir,
      food,
      score,
      headPulse,
      floaters,
    };
  }

  function setDirection(state, dir) {
    if (isOpposite(dir, state.dir)) return state;
    return { ...state, nextDir: dir };
  }

  function markStarted() {
    if (hasStarted) return;
    hasStarted = true;
    localStorage.setItem(STORAGE_HELP, "1");
  }

  function updateBest(score) {
    if (score <= bestScore) return;
    bestScore = score;
    localStorage.setItem(STORAGE_BEST, String(bestScore));
  }

  function updateUI(state) {
    scoreEl.textContent = `Score: ${state.score}`;
    helpEl.style.visibility = hasStarted ? "hidden" : "visible";
    helpEl.style.pointerEvents = hasStarted ? "none" : "auto";

    if (state.gameOver) {
      statusEl.textContent = "";
      statusEl.style.color = "var(--muted)";
    } else if (state.paused) {
      statusEl.textContent = "Paused";
      statusEl.style.color = "var(--muted)";
    } else if (!state.running) {
      statusEl.textContent = "Tap Start";
      statusEl.style.color = "var(--muted)";
    } else {
      statusEl.textContent = "";
      statusEl.style.color = "var(--muted)";
    }

    startBtn.textContent = state.paused ? "Resume" : "Start";
    const hideStart = state.running && !state.paused && !state.gameOver;
    startBtn.style.visibility = hideStart ? "hidden" : "visible";
    startBtn.style.pointerEvents = hideStart ? "none" : "auto";

    const showPause = (state.running || state.paused) && hasStarted && !state.gameOver;
    pauseBtn.style.visibility = showPause ? "visible" : "hidden";
    pauseBtn.style.pointerEvents = showPause ? "auto" : "none";
    pauseBtn.disabled = !state.running || state.paused;


    if (state.gameOver) {
      overlayEl.classList.remove("hidden");
      overlayEl.setAttribute("aria-hidden", "false");
      finalScoreEl.textContent = String(state.score);
      bestScoreEl.textContent = String(bestScore);
    } else {
      overlayEl.classList.add("hidden");
      overlayEl.setAttribute("aria-hidden", "true");
    }
  }

  let renderSize = canvas.width;

  function resizeCanvas() {
    const size = Math.floor(Math.min(boardEl.clientWidth, boardEl.clientHeight));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderSize = size;
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
  resizeCanvas();

  function render(state) {
    const size = renderSize || canvas.width;
    const cell = size / GRID_SIZE;

    ctx.clearRect(0, 0, size, size);

    // Grid
    ctx.strokeStyle = "#1e1e2b";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // Food
    if (state.food) {
      ctx.fillStyle = "#ff5a5a";
      ctx.fillRect(
        state.food.x * cell + 2,
        state.food.y * cell + 2,
        cell - 4,
        cell - 4
      );
    }

    // Snake
    state.snake.forEach((segment, idx) => {
      const baseSize = cell - 4;
      let sizePx = baseSize;
      let offset = 2;
      if (idx === 0 && state.headPulse > 0) {
        const extra = baseSize * 0.2 * state.headPulse;
        sizePx = baseSize + extra;
        offset = (cell - sizePx) / 2;
      }
      ctx.fillStyle = idx === 0 ? "#4fe58a" : "#2ed074";
      ctx.fillRect(
        segment.x * cell + offset,
        segment.y * cell + offset,
        sizePx,
        sizePx
      );
    });

    // Floating +1
    if (state.floaters.length > 0) {
      ctx.save();
      ctx.font = `${Math.max(12, Math.floor(cell * 0.55))}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      state.floaters.forEach((f) => {
        const t = f.life / FLOATER_LIFE;
        const rise = (1 - t) * cell * 0.6;
        ctx.globalAlpha = t;
        ctx.fillStyle = "#f1f1f6";
        ctx.fillText(
          "+1",
          f.x * cell + cell / 2,
          f.y * cell + cell / 2 - rise
        );
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  let state = createInitialState();
  updateUI(state);
  render(state);

  function tick() {
    const wasGameOver = state.gameOver;
    state = stepState(state);
    if (!wasGameOver && state.gameOver) {
      updateBest(state.score);
    }
    updateUI(state);
    render(state);
  }

  setInterval(tick, TICK_MS);

  function startGame() {
    if (state.gameOver) return;
    markStarted();
    state = { ...state, running: true, paused: false };
    updateUI(state);
  }

  function pauseGame() {
    if (!state.running || state.paused || state.gameOver) return;
    state = { ...state, paused: true };
    updateUI(state);
  }

  function togglePause() {
    if (!state.running || state.gameOver) return;
    state = { ...state, paused: !state.paused };
    updateUI(state);
  }

  function restartGame() {
    state = createInitialState(state.rng);
    markStarted();
    state = { ...state, running: true, paused: false };
    updateUI(state);
    render(state);
  }

  function handleDir(dir) {
    state = setDirection(state, dir);
  }

  function handleTapMaybe() {
    if (!state.running && !state.gameOver) {
      startGame();
    }
  }

  startBtn.addEventListener("click", startGame);
  pauseBtn.addEventListener("click", pauseGame);
  restartBtn.addEventListener("click", restartGame);

  document.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowUp":
      case "w":
      case "W":
        handleDir(DIRS.up);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        handleDir(DIRS.down);
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        handleDir(DIRS.left);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        handleDir(DIRS.right);
        break;
      case " ":
        togglePause();
        break;
      case "Enter":
        startGame();
        break;
      default:
        break;
    }
  });

  // Touch swipe controls (for canvas and overall document).
  const SWIPE_MIN = 12;
  let touchStart = null;

  function onTouchStart(event) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event) {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < SWIPE_MIN) {
      touchStart = null;
      handleTapMaybe();
      return;
    }

    if (absX > absY) {
      handleDir(dx > 0 ? DIRS.right : DIRS.left);
    } else {
      handleDir(dy > 0 ? DIRS.down : DIRS.up);
    }
    touchStart = null;
  }

  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd, { passive: true });
  canvas.addEventListener("click", handleTapMaybe);
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });

  // Expose for potential tests or debugging.
  window.snakeGame = {
    createInitialState,
    stepState,
    setDirection,
    spawnFood,
    DIRS,
    GRID_SIZE,
  };
})();
