const bingoCard = document.getElementById("bingoCard");
const drawnBalls = document.getElementById("drawnBalls");
const lastNumber = document.getElementById("lastNumber");
const progressInfo = document.getElementById("progressInfo");
const startButton = document.getElementById("startButton");
const bingoButton = document.getElementById("bingoButton");
const resetButton = document.getElementById("resetButton");
const statusMessage = document.getElementById("statusMessage");

const messageModal = document.getElementById("messageModal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const closeModalButton = document.getElementById("closeModalButton");
const messageBox = document.querySelector(".message-box");

const drawSound = new Audio("assets/draw.mp3");
const winnerSound = new Audio("assets/winner.mp3");
const backgroundMusic = new Audio("assets/background-music.mp3");

backgroundMusic.loop = true;
backgroundMusic.volume = 0.15;

let card = [];
let drawnNumbers = [];
let availableNumbers = [];
let drawInterval = null;
let isGameRunning = false;
let isGameFinished = false;
let isDrawingNumber = false;

function createIrishBingoCard() {
  const rows = Array.from({ length: 3 }, () => Array(9).fill(null));

  const columnRanges = [
    [1, 9],
    [10, 19],
    [20, 29],
    [30, 39],
    [40, 49],
    [50, 59],
    [60, 69],
    [70, 79],
    [80, 90]
  ];

  const columnNumbers = columnRanges.map(([min, max]) => {
    const numbers = [];

    for (let number = min; number <= max; number++) {
      numbers.push(number);
    }

    return shuffleArray(numbers).slice(0, 3).sort((a, b) => a - b);
  });

  for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
    const selectedColumns = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 5);

    selectedColumns.forEach((columnIndex) => {
      rows[rowIndex][columnIndex] = columnNumbers[columnIndex].shift();
    });
  }

  return rows;
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function renderCard() {
  bingoCard.innerHTML = "";

  card.forEach((row, rowIndex) => {
    row.forEach((number, columnIndex) => {
      const cell = document.createElement("div");

      cell.classList.add("cell");

      if (number === null || number === undefined) {
        cell.classList.add("empty");
        cell.textContent = "";
      } else {
        cell.classList.add("number");
        cell.textContent = number;
        cell.dataset.number = number;
        cell.dataset.row = rowIndex;
        cell.dataset.column = columnIndex;

        cell.addEventListener("click", () => toggleMarked(cell));
        cell.addEventListener("touchstart", (event) => {
          event.preventDefault();
          toggleMarked(cell);
        });
      }

      bingoCard.appendChild(cell);
    });
  });
}

function toggleMarked(cell) {
  if (isGameFinished) return;

  cell.classList.toggle("marked");
  cell.classList.remove("available-to-mark");

  const number = Number(cell.dataset.number);
  const label = getBingoLabel(number);
  const balls = document.querySelectorAll(".ball");

  balls.forEach((ball) => {
    if (ball.textContent === label) {
      if (cell.classList.contains("marked")) {
        ball.classList.add("marked-ball");
      } else {
        ball.classList.remove("marked-ball");
      }
    }
  });
}

function startGame() {
  if (isGameRunning || isGameFinished) return;

  isGameRunning = true;
  backgroundMusic.volume = 0.15;
  backgroundMusic.play();

  startButton.disabled = true;
  statusMessage.textContent = "Game running. Numbers are being drawn automatically.";

  drawNumber();
  drawInterval = setInterval(drawNumber, 5000);
}

function drawNumber() {
  if (isDrawingNumber || isGameFinished) return;

  if (availableNumbers.length === 0) {
    stopGame();
    statusMessage.textContent = "All numbers have been drawn.";
    return;
  }

  isDrawingNumber = true;
  lastNumber.textContent = "🎱";
  lastNumber.classList.remove("reveal");
  lastNumber.classList.add("rolling");

  setTimeout(() => {
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const selectedNumber = availableNumbers.splice(randomIndex, 1)[0];

    drawnNumbers.push(selectedNumber);
    updateProgress();

    const label = getBingoLabel(selectedNumber);

    lastNumber.classList.remove("rolling");
    lastNumber.textContent = label;

    void lastNumber.offsetWidth;

    lastNumber.classList.add("reveal");

    drawSound.currentTime = 0;
    drawSound.play();

    renderDrawnBall(selectedNumber);
    highlightDrawnNumberOnCard(selectedNumber);

    isDrawingNumber = false;
  }, 900);
}

function getBingoLabel(number) {
  if (number >= 1 && number <= 18) return `B-${number}`;
  if (number >= 19 && number <= 36) return `I-${number}`;
  if (number >= 37 && number <= 54) return `N-${number}`;
  if (number >= 55 && number <= 72) return `G-${number}`;
  return `O-${number}`;
}

function renderDrawnBall(number) {
  const ball = document.createElement("div");
  ball.classList.add("ball");
  ball.textContent = getBingoLabel(number);

  drawnBalls.prepend(ball);
}

function highlightDrawnNumberOnCard(number) {
  const cells = document.querySelectorAll(".cell.number");

  cells.forEach((cell) => {
    const cellNumber = Number(cell.dataset.number);

    if (cellNumber === number && !cell.classList.contains("marked")) {
      cell.classList.add("available-to-mark");
    }
  });
}

function updateProgress() {
  progressInfo.textContent = `Drawn: ${drawnNumbers.length} / 90 | Remaining: ${availableNumbers.length}`;
}

function checkBingo() {
  if (isGameFinished) return;

  stopGame();

  const winningLine = getValidWinningLine();

  if (winningLine) {
    isGameFinished = true;

    backgroundMusic.volume = 0.03;

    winnerSound.currentTime = 0;
    winnerSound.play();

    confetti({
      particleCount: 300,
      spread: 130,
      origin: { y: 0.6 }
    });

    showMessage(
      "🏆 BINGO! 🏆",
      "Congratulations! Your card has a valid completed line.",
      true
    );

    statusMessage.textContent = "Winner confirmed!";
    startButton.disabled = true;
    highlightWinningLine(winningLine);
    return;
  }

  showMessage(
    "Not yet!",
    "The marked numbers do not form a valid completed line based on the numbers already drawn."
  );

  resumeGameAfterError();
}

function getValidWinningLine() {
  for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
    const rowCells = document.querySelectorAll(`.cell.number[data-row="${rowIndex}"]`);

    const hasFiveNumbers = rowCells.length === 5;

    const allNumbersMarked = [...rowCells].every((cell) => {
      return cell.classList.contains("marked");
    });

    const allMarkedNumbersWereDrawn = [...rowCells].every((cell) => {
      const number = Number(cell.dataset.number);
      return drawnNumbers.includes(number);
    });

    if (hasFiveNumbers && allNumbersMarked && allMarkedNumbersWereDrawn) {
      return [...rowCells];
    }
  }

  return null;
}

function highlightWinningLine(cells) {
  cells.forEach((cell) => {
    cell.classList.add("marked");
    cell.classList.remove("available-to-mark");
  });
}

function stopGame() {
  clearInterval(drawInterval);
  drawInterval = null;
  isGameRunning = false;

  if (!isGameFinished) {
    startButton.disabled = false;
  }
}

function resumeGameAfterError() {
  setTimeout(() => {
    if (!isGameFinished) {
      closeModal();
      startGame();
    }
  }, 2500);
}

function showMessage(title, text, winner = false) {
  modalTitle.textContent = title;
  modalText.textContent = text;

  if (winner) {
    messageBox.classList.add("winner");
  } else {
    messageBox.classList.remove("winner");
  }

  messageModal.classList.add("show");
}

function closeModal() {
  messageModal.classList.remove("show");
}

function resetGame() {
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
  backgroundMusic.volume = 0.15;

  stopGame();

  card = createIrishBingoCard();
  drawnNumbers = [];
  availableNumbers = Array.from({ length: 90 }, (_, index) => index + 1);
  isGameRunning = false;
  isGameFinished = false;
  isDrawingNumber = false;

  drawnBalls.innerHTML = "";
  lastNumber.textContent = "--";
  lastNumber.classList.remove("rolling", "reveal");

  statusMessage.textContent = "Click “Start Game” to begin.";
  startButton.disabled = false;

  closeModal();
  renderCard();
  updateProgress();
}

startButton.addEventListener("click", startGame);
bingoButton.addEventListener("click", checkBingo);
resetButton.addEventListener("click", resetGame);
closeModalButton.addEventListener("click", closeModal);

resetGame();