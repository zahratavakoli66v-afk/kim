const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* اندازه واقعی بازی */
canvas.width = 1200;
canvas.height = 600;

/* عناصر HTML */
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const jumpSound = document.getElementById("jumpSound");

/* تصاویر */
const kimImg = new Image();
kimImg.src = "kim.png";

const bombImg = new Image();
bombImg.src = "bomb.png";

const nukeImg = new Image();
nukeImg.src = "nuke.png";

/* زمین */
const GROUND_Y = canvas.height - 40;

/* وضعیت بازی */
let gameRunning = false;
let gameOver = false;

/* امتیاز */
let score = 0;
let bestScore = localStorage.getItem("bestScore") || 0;
bestScoreEl.textContent = bestScore;

/* سرعت */
let gameSpeed = 6;
let speedTimer = 0;
const SPEED_INTERVAL = 10 * 60;
const MAX_SPEED = 17;

/* کاراکتر */
const kim = {
  x: 120,
  width: 110,
  height: 110,
  y: GROUND_Y - 110,
  dy: 0,
  gravity: 1,
  jumpPower: -16,
  jumpCount: 0,
  maxJump: 2
};

/* موانع */
let obstacles = [];
let gameStartTime = null;
let bombSpawnCount = 0;

/* ساخت wave */
function spawnObstacleWave() {
  const elapsed = (performance.now() - gameStartTime) / 1000;
  let type = elapsed > 15 && Math.random() < 0.3 ? "nuke" : "bomb";

  let count = 1;

  if (type === "bomb") {
    bombSpawnCount++;
    count = bombSpawnCount <= 3 ? 1 : Math.floor(Math.random() * 3) + 1;
  } else {
    count = Math.floor(Math.random() * 2) + 1;
  }

  const startX = canvas.width + 40;

  for (let i = 0; i < count; i++) {
    obstacles.push({
      type,
      x: startX + i * (type === "nuke" ? 80 : 65),
      width: type === "nuke" ? 70 : 55,
      height: type === "nuke" ? 165 : 55,
      y: type === "nuke" ? GROUND_Y - 165 : GROUND_Y - 55,
      scored: false,
      points: type === "nuke" ? 20 : 10,
      isLeader: i === 0,
      spawnedNext: false
    });
  }
}

/* Hitbox */
function getKimHitbox() {
  return {
    x: kim.x + 35,
    y: kim.y + 30,
    width: kim.width - 70,
    height: kim.height - 45
  };
}

function getObstacleHitbox(o) {
  return {
    x: o.x + 15,
    y: o.y + 15,
    width: o.width - 30,
    height: o.height - 30
  };
}

/* شروع */
function startGame() {
  resetGame();
  gameRunning = true;
  overlay.style.display = "none";
}

startBtn.onclick = startGame;

/* کنترل */
function handleJump() {
  if (!gameRunning) {
    startGame();
    return;
  }

  if (kim.jumpCount < kim.maxJump) {
    kim.dy = kim.jumpPower;
    kim.jumpCount++;
    jumpSound.currentTime = 0;
    jumpSound.play();
  }
}

document.addEventListener("keydown", e => {
  if (e.code === "Space") handleJump();
});

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  handleJump();
}, { passive: false });

/* ریست */
function resetGame() {
  score = 0;
  scoreEl.textContent = score;

  gameSpeed = 6;
  speedTimer = 0;

  kim.y = GROUND_Y - kim.height;
  kim.dy = 0;
  kim.jumpCount = 0;

  obstacles = [];
  bombSpawnCount = 0;

  gameStartTime = performance.now();
  spawnObstacleWave();

  gameOver = false;
}

/* آپدیت */
function update() {
  if (!gameRunning || gameOver) return;

  speedTimer++;
  if (speedTimer >= SPEED_INTERVAL && gameSpeed < MAX_SPEED) {
    gameSpeed++;
    speedTimer = 0;
  }

  kim.dy += kim.gravity;
  kim.y += kim.dy;

  if (kim.y + kim.height >= GROUND_Y) {
    kim.y = GROUND_Y - kim.height;
    kim.dy = 0;
    kim.jumpCount = 0;
  }

  obstacles.forEach(o => (o.x -= gameSpeed));

  const leader = obstacles.find(o => o.isLeader && !o.spawnedNext);
  if (leader && leader.x + leader.width < canvas.width / 2) {
    spawnObstacleWave();
    leader.spawnedNext = true;
  }

  obstacles = obstacles.filter(o => o.x + o.width > -200);

  obstacles.forEach(o => {
    if (!o.scored && kim.x > o.x + o.width) {
      score += o.points;
      scoreEl.textContent = score;
      o.scored = true;
    }
  });

  const k = getKimHitbox();
  obstacles.forEach(o => {
    const ob = getObstacleHitbox(o);
    if (
      k.x < ob.x + ob.width &&
      k.x + k.width > ob.x &&
      k.y < ob.y + ob.height &&
      k.y + k.height > ob.y
    ) {
      gameOver = true;
      gameRunning = false;
      overlay.style.display = "flex";

      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
        bestScoreEl.textContent = bestScore;
      }
    }
  });
}

/* رسم */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();

  ctx.drawImage(kimImg, kim.x, kim.y, kim.width, kim.height);

  obstacles.forEach(o => {
    ctx.drawImage(o.type === "nuke" ? nukeImg : bombImg, o.x, o.y, o.width, o.height);
  });
}

/* حلقه اصلی */
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
