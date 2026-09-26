const TOKEN_KEY = "marco-tracker-token";

let token = localStorage.getItem(TOKEN_KEY) || "";
let currentUser = null;
let styles = [];
let leaderboardRows = [];
let authMode = "signin";
let cameraStream = null;

const authScreen = document.querySelector("#auth-screen");
const authForm = document.querySelector("#auth-form");
const authMessage = document.querySelector("#auth-message");
const authSubmit = document.querySelector("#auth-submit");
const authModeButtons = [...document.querySelectorAll("[data-auth-mode]")];
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const activeUser = document.querySelector("#active-user");
const signoutButton = document.querySelector("#signout-button");
const views = [...document.querySelectorAll(".view")];
const tabButtons = [...document.querySelectorAll(".tab-button")];
const unlockedCount = document.querySelector("#unlocked-count");
const shirtFill = document.querySelector("#shirt-fill");
const colorLine = document.querySelector("#color-line");
const homeHelper = document.querySelector("#home-helper");
const scanOptions = document.querySelector("#scan-options");
const collectionGrid = document.querySelector("#collection-grid");
const leaderboard = document.querySelector("#leaderboard");
const cameraFrame = document.querySelector(".camera-frame");
const cameraVideo = document.querySelector("#camera-video");
const captureCanvas = document.querySelector("#capture-canvas");
const cameraStatus = document.querySelector("#camera-status");
const cameraDot = document.querySelector("#camera-dot");
const startCameraButton = document.querySelector("#start-camera");
const captureButton = document.querySelector("#capture-shirt");
const stopCameraButton = document.querySelector("#stop-camera");
const scanResult = document.querySelector("#scan-result");

async function api(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

function showView(viewName) {
  views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
}

function setAuthMode(mode) {
  authMode = mode;
  authModeButtons.forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  authSubmit.textContent = mode === "create" ? "Create account" : "Sign in";
  passwordInput.autocomplete = mode === "create" ? "new-password" : "current-password";
  authMessage.textContent = "";
}

function applyPayload(payload) {
  currentUser = payload.user || currentUser;
  styles = payload.styles || styles;
  leaderboardRows = payload.leaderboard || leaderboardRows;
  render();
}

function signedIn(tokenValue, payload) {
  token = tokenValue;
  localStorage.setItem(TOKEN_KEY, token);
  authScreen.classList.add("hidden");
  showView("home");
  applyPayload(payload);
}

async function signOut() {
  try {
    await api("/api/logout", { method: "POST", body: "{}" });
  } catch {
    // Signing out should still clear this browser even if the server is unavailable.
  }

  token = "";
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  stopCamera();
  authScreen.classList.remove("hidden");
  activeUser.textContent = "Signed out";
  render();
  usernameInput.focus();
}

function setCameraState(message, isActive = false) {
  cameraStatus.textContent = message;
  cameraDot.classList.toggle("active", isActive);
  cameraFrame.classList.toggle("camera-on", isActive);
  captureButton.disabled = !isActive;
  stopCameraButton.disabled = !isActive;
  startCameraButton.disabled = isActive;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    scanResult.textContent = "This browser does not support camera scanning.";
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();

    const [track] = cameraStream.getVideoTracks();
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    if (capabilities.torch) {
      try {
        await track.applyConstraints({ advanced: [{ torch: true }] });
        setCameraState("Camera on with torch", true);
      } catch {
        setCameraState("Camera on, torch blocked", true);
      }
    } else {
      setCameraState("Camera on, torch unavailable", true);
    }
  } catch (error) {
    scanResult.textContent = error.message || "Camera could not start.";
    setCameraState("Camera not started", false);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }

  cameraStream = null;
  cameraVideo.srcObject = null;
  setCameraState("Camera not started", false);
}

function sampleCameraColor() {
  const context = captureCanvas.getContext("2d", { willReadFrequently: true });
  const width = captureCanvas.width;
  const height = captureCanvas.height;

  context.drawImage(cameraVideo, 0, 0, width, height);

  const regionSize = 34;
  const startX = Math.floor((width - regionSize) / 2);
  const startY = Math.floor((height - regionSize) / 2);
  const pixels = context.getImageData(startX, startY, regionSize, regionSize).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    r += pixels[index];
    g += pixels[index + 1];
    b += pixels[index + 2];
    count += 1;
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

async function submitScan(sample, manual = false) {
  const payload = await api("/api/scan", {
    method: "POST",
    body: JSON.stringify({ ...sample, manual })
  });

  applyPayload(payload);
  scanResult.textContent = `Matched ${payload.match.name}.`;
}

async function captureScan() {
  if (!cameraStream) {
    scanResult.textContent = "Start the camera first.";
    return;
  }

  try {
    const sample = sampleCameraColor();
    await submitScan(sample);
  } catch (error) {
    scanResult.textContent = error.message;
  }
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function renderProgress() {
  const unlockedIds = currentUser?.unlockedIds || [];
  unlockedCount.textContent = unlockedIds.length;

  shirtFill.innerHTML = styles
    .map((style) => {
      const isUnlocked = unlockedIds.includes(style.id);
      return `<span class="shirt-stripe" style="--cell-color: ${style.color}; --cell-opacity: ${isUnlocked ? 1 : 0}"></span>`;
    })
    .join("");

  colorLine.innerHTML = styles
    .map((style) => {
      const isUnlocked = unlockedIds.includes(style.id);
      return `<span class="line-segment ${isUnlocked ? "scanned" : ""}" style="--cell-color: ${style.color}" title="${style.name}"></span>`;
    })
    .join("");

  if (!currentUser) {
    homeHelper.textContent = "Sign in to start filling Marco's shirt.";
  } else if (unlockedIds.length === styles.length) {
    homeHelper.textContent = `${currentUser.username} has completed the full Marco set.`;
  } else {
    const remaining = styles.length - unlockedIds.length;
    homeHelper.textContent = `${currentUser.username} needs ${remaining} more shirt ${remaining === 1 ? "style" : "styles"}.`;
  }
}

function renderScanOptions() {
  const unlockedIds = currentUser?.unlockedIds || [];
  scanOptions.innerHTML = styles
    .map((style) => {
      const isUnlocked = unlockedIds.includes(style.id);
      return `
        <button class="swatch-button" type="button" data-unlock="${style.id}" ${isUnlocked ? "disabled" : ""}>
          <span class="swatch" style="--swatch-color: ${style.color}"></span>
          <span>${isUnlocked ? "Unlocked" : "Unlock"} ${style.name}</span>
        </button>
      `;
    })
    .join("");
}

function renderCollection() {
  const unlockedIds = currentUser?.unlockedIds || [];
  const unlockedAt = currentUser?.unlockedAt || {};
  collectionGrid.innerHTML = styles
    .map((style) => {
      const isUnlocked = unlockedIds.includes(style.id);
      return `
        <article class="shirt-card ${isUnlocked ? "" : "locked"}">
          <div class="mini-shirt" style="--swatch-color: ${style.color}"></div>
          <h3>${isUnlocked ? style.name : `Style ${style.id}`}</h3>
          <p>${isUnlocked ? `Unlocked${unlockedAt[style.id] ? ` on ${unlockedAt[style.id]}` : ""}` : "Locked until Marco wears it."}</p>
        </article>
      `;
    })
    .join("");
}

function renderLeaderboard() {
  if (!leaderboardRows.length) {
    leaderboard.innerHTML = `<p class="empty-state">No accounts yet.</p>`;
    return;
  }

  leaderboard.innerHTML = leaderboardRows
    .map((leader, index) => `
      <article class="leader-row">
        <span class="rank">${index + 1}</span>
        <div>
          <h3>${escapeHtml(leader.username)}</h3>
          <p>${escapeHtml(leader.lastUnlock ? `Last unlock ${leader.lastUnlock}` : "No scans yet")}</p>
        </div>
        <span class="score">${leader.unlockedIds.length}/8</span>
      </article>
    `)
    .join("");
}

function render() {
  activeUser.textContent = currentUser?.username || "Signed out";
  renderProgress();
  renderScanOptions();
  renderCollection();
  renderLeaderboard();
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    authMessage.textContent = "Enter both fields.";
    return;
  }

  authMessage.textContent = "";
  authSubmit.disabled = true;

  try {
    const endpoint = authMode === "create" ? "/api/register" : "/api/login";
    const payload = await api(endpoint, {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    signedIn(payload.token, payload);
    authForm.reset();
  } catch (error) {
    authMessage.textContent = error.message;
  } finally {
    authSubmit.disabled = false;
  }
});

authModeButtons.forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});

signoutButton.addEventListener("click", signOut);
startCameraButton.addEventListener("click", startCamera);
captureButton.addEventListener("click", captureScan);
stopCameraButton.addEventListener("click", stopCamera);

document.addEventListener("click", async (event) => {
  const tab = event.target.closest("[data-view]");
  const jump = event.target.closest("[data-view-jump]");
  const unlock = event.target.closest("[data-unlock]");

  if (tab) {
    showView(tab.dataset.view);
  }

  if (jump) {
    showView(jump.dataset.viewJump);
  }

  if (unlock) {
    const style = styles.find((candidate) => candidate.id === Number(unlock.dataset.unlock));
    if (!style) return;

    try {
      await submitScan(hexToRgb(style.color), true);
    } catch (error) {
      scanResult.textContent = error.message;
    }
  }
});

async function boot() {
  setAuthMode(authMode);
  setCameraState("Camera not started", false);

  try {
    const publicPayload = await api("/api/styles");
    styles = publicPayload.styles || [];
  } catch (error) {
    authMessage.textContent = error.message;
  }

  if (token) {
    try {
      const payload = await api("/api/me");
      authScreen.classList.add("hidden");
      applyPayload(payload);
      return;
    } catch {
      token = "";
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  authScreen.classList.remove("hidden");
  render();
}

boot();
