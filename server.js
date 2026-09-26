const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const styles = [
  { id: 1, name: "Royal Blue", color: "#1147bb" },
  { id: 2, name: "Weathered Olive", color: "#696754" },
  { id: 3, name: "Washed Clay", color: "#dbcdc7" },
  { id: 4, name: "Powder Blue", color: "#77a3c5" },
  { id: 5, name: "Deep Navy", color: "#092354" },
  { id: 6, name: "Ash Gray", color: "#8f9186" },
  { id: 7, name: "Dust Rose", color: "#b6867b" },
  { id: 8, name: "Night Black", color: "#07090d" }
];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function defaultDb() {
  return {
    styles,
    users: {},
    sessions: {},
    scans: []
  };
}

async function readDb() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const db = JSON.parse(raw);
    return {
      ...defaultDb(),
      ...db,
      styles: db.styles?.length ? db.styles : styles,
      users: db.users || {},
      sessions: db.sessions || {},
      scans: db.scans || []
    };
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    return defaultDb();
  }
}

async function writeDb(db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const candidate = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(candidate.hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function publicUser(user) {
  return {
    username: user.username,
    unlockedIds: user.unlockedIds || [],
    unlockedAt: user.unlockedAt || {},
    lastUnlock: user.lastUnlock || ""
  };
}

function tokenFrom(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function getSessionUser(db, request) {
  const token = tokenFrom(request);
  const username = token ? db.sessions[token] : "";
  return username ? db.users[username] : null;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function colorDistance(a, b) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function closestStyle(sample, db) {
  return db.styles
    .map((style) => {
      const rgb = hexToRgb(style.color);
      return { ...style, distance: colorDistance(sample, rgb) };
    })
    .sort((a, b) => a.distance - b.distance)[0];
}

function leaderboard(db) {
  return Object.values(db.users)
    .map((user) => publicUser(user))
    .sort((a, b) => {
      const countDelta = b.unlockedIds.length - a.unlockedIds.length;
      if (countDelta) return countDelta;
      return (b.lastUnlock || "").localeCompare(a.lastUnlock || "") || a.username.localeCompare(b.username);
    });
}

async function handleApi(request, response, pathname) {
  const db = await readDb();

  if (request.method === "GET" && pathname === "/api/styles") {
    sendJson(response, 200, { styles: db.styles });
    return;
  }

  if (request.method === "GET" && pathname === "/api/me") {
    const user = getSessionUser(db, request);
    sendJson(response, user ? 200 : 401, user ? { user: publicUser(user), leaderboard: leaderboard(db), styles: db.styles } : { error: "Not signed in." });
    return;
  }

  if (request.method === "POST" && pathname === "/api/register") {
    const body = await readBody(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      sendJson(response, 400, { error: "Username and password are required." });
      return;
    }

    if (db.users[username]) {
      sendJson(response, 409, { error: "That username already exists." });
      return;
    }

    const { salt, hash } = hashPassword(password);
    db.users[username] = {
      username,
      salt,
      passwordHash: hash,
      unlockedIds: [],
      unlockedAt: {},
      lastUnlock: "",
      createdAt: new Date().toISOString()
    };

    const token = crypto.randomBytes(24).toString("hex");
    db.sessions[token] = username;
    await writeDb(db);
    sendJson(response, 201, { token, user: publicUser(db.users[username]), leaderboard: leaderboard(db), styles: db.styles });
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    const body = await readBody(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const user = db.users[username];

    if (!user || !verifyPassword(password, user)) {
      sendJson(response, 401, { error: "Username or password did not match." });
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");
    db.sessions[token] = username;
    await writeDb(db);
    sendJson(response, 200, { token, user: publicUser(user), leaderboard: leaderboard(db), styles: db.styles });
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    const token = tokenFrom(request);
    if (token) {
      delete db.sessions[token];
      await writeDb(db);
    }
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && pathname === "/api/scan") {
    const user = getSessionUser(db, request);
    if (!user) {
      sendJson(response, 401, { error: "Sign in before scanning." });
      return;
    }

    const body = await readBody(request);
    const sample = {
      r: Number(body.r),
      g: Number(body.g),
      b: Number(body.b)
    };

    if (![sample.r, sample.g, sample.b].every((value) => Number.isFinite(value) && value >= 0 && value <= 255)) {
      sendJson(response, 400, { error: "A valid RGB sample is required." });
      return;
    }

    const match = closestStyle(sample, db);
    const tolerance = Number(body.manual) ? 999 : 150;

    if (!match || match.distance > tolerance) {
      sendJson(response, 422, { error: "No confident shirt match. Try again with the shirt centered and the flash on.", sample, closest: match });
      return;
    }

    const date = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (!user.unlockedIds.includes(match.id)) {
      user.unlockedIds.push(match.id);
      user.unlockedAt[match.id] = date;
      user.lastUnlock = date;
    }

    db.scans.push({
      username: user.username,
      sample,
      matchedStyleId: match.id,
      distance: Math.round(match.distance),
      createdAt: new Date().toISOString()
    });

    await writeDb(db);
    sendJson(response, 200, {
      user: publicUser(user),
      leaderboard: leaderboard(db),
      styles: db.styles,
      match: { id: match.id, name: match.name, color: match.color, distance: Math.round(match.distance) }
    });
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

async function serveStatic(request, response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT, requestedPath));

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "content-type": mimeTypes[extension] || "application/octet-stream" });
    response.end(file);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }

    await serveStatic(request, response, decodeURIComponent(url.pathname));
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error." });
  }
});

server.listen(PORT, () => {
  console.log(`Marco Tracker running at http://localhost:${PORT}`);
});
