"use strict";

/**
 * Electron main process for the Daily Speaking Coach desktop build.
 *
 * The renderer (the visible window) runs exactly the same Expo web bundle that
 * `npm run desktop:web` produces. Everything a web page cannot do on its own is
 * done here and exposed to the page through a narrow, explicitly listed set of
 * IPC channels (see preload.js). The page never gets Node access.
 *
 * Three jobs live in this file:
 *
 *  1. Serving the bundle from a custom `app://` protocol instead of `file://`.
 *     This matters more than it looks: `file://` is not a "secure context", and
 *     browsers only grant microphone access to secure contexts. A custom scheme
 *     registered as `secure` is, so recording works. It also gives the bundle's
 *     absolute asset paths (`/_expo/...`) a sensible root.
 *
 *  2. Making backend calls from here rather than from the page. Requests issued
 *     by the main process carry no `Origin` header — the same as the requests
 *     the phone app makes — so the server's CORS allowlist does not need to know
 *     the desktop build exists.
 *
 *  3. Writing real files: PDFs into the user's Documents folder, and recordings
 *     into the app's own data folder.
 */

const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");

/** Only this backend may be reached through the IPC proxy. */
const ALLOWED_API_ORIGINS = new Set(["https://daily-speaking-coach.onrender.com"]);

const APP_SCHEME = "app";
const BUNDLE_HOST = "local";
const MEDIA_HOST = "media";
const APP_START_URL = `${APP_SCHEME}://${BUNDLE_HOST}/index.html`;

const WEB_ROOT = path.join(__dirname, "web");

/**
 * The window icon, which is also what Windows shows in the taskbar.
 * Two locations are checked because the app runs from two layouts: straight out
 * of the project during development, and from `resources/app` inside the built
 * portable app, where the icon sits next to this file.
 */
const ICON_CANDIDATES = [
  path.join(__dirname, "app-icon.ico"),
  path.join(__dirname, "..", "assets", "icons", "app-icon.ico")
];

function resolveIconPath() {
  return ICON_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}
const RECORDINGS_DIR = path.join(app.getPath("userData"), "recordings");
const DOCUMENTS_DIR = path.join(app.getPath("documents"), "Daily Speaking Coach");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webm": "audio/webm",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf"
};

// Must run before `app.ready`. `secure: true` is what makes getUserMedia (the
// microphone) available; `supportFetchAPI` lets the page fetch its own
// recordings back for upload.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true
    }
  }
]);

let mainWindow = null;

/* ------------------------------------------------------------------ *
 * Path safety
 * ------------------------------------------------------------------ */

/**
 * Resolves `requestedPath` inside `rootDir` and refuses anything that escapes
 * it (`../../`, absolute paths, symlink tricks). Every filesystem entry point in
 * this file goes through here, so a bug in the page cannot reach arbitrary
 * files on the user's disk.
 */
function resolveInside(rootDir, requestedPath) {
  const normalizedRoot = path.resolve(rootDir);
  const candidate = path.resolve(normalizedRoot, `.${path.sep}${requestedPath}`);
  const relative = path.relative(normalizedRoot, candidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return candidate;
}

/** Strips characters Windows forbids in file names, keeping the extension. */
function sanitizeRelativeFilePath(relativePath) {
  return String(relativePath || "")
    .split(/[\\/]+/)
    .map((segment) =>
      segment
        .replace(/[<>:"|?*]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^\.+$/, "")
        .trim()
        .slice(0, 120)
    )
    .filter(Boolean)
    .join(path.sep);
}

/* ------------------------------------------------------------------ *
 * app:// protocol
 * ------------------------------------------------------------------ */

function contentTypeFor(filePath) {
  // Recordings are saved as "<id>-audio.webm" / "<id>-video.webm" because both
  // are WebM containers and the extension alone cannot say which. Serving a
  // video as audio/webm makes a <video> element refuse it outright.
  const lower = filePath.toLowerCase();
  if (lower.endsWith("-video.webm")) {
    return "video/webm";
  }
  if (lower.endsWith("-audio.webm")) {
    return "audio/webm";
  }

  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

/**
 * Everything the app needs comes from its own bundle, from `blob:` (recordings
 * held in memory) or from `data:` (inlined fonts and images). Nothing is ever
 * loaded over the network by the page itself — backend calls go through the
 * main process — so remote origins are simply not allowed.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self' app:",
  "script-src 'self' app:",
  "style-src 'self' app: 'unsafe-inline'",
  "img-src 'self' app: data: blob:",
  "font-src 'self' app: data:",
  "media-src 'self' app: blob: data:",
  "connect-src 'self' app: blob: data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join("; ");

async function serveFile(filePath) {
  try {
    const data = await fsp.readFile(filePath);
    const headers = { "content-type": contentTypeFor(filePath) };

    if (filePath.toLowerCase().endsWith(".html")) {
      headers["content-security-policy"] = CONTENT_SECURITY_POLICY;
    }

    return new Response(data, { status: 200, headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    const decodedPath = decodeURIComponent(url.pathname);

    if (url.host === MEDIA_HOST) {
      const mediaPath = resolveInside(RECORDINGS_DIR, decodedPath);
      return mediaPath ? serveFile(mediaPath) : new Response("Forbidden", { status: 403 });
    }

    if (url.host !== BUNDLE_HOST) {
      return new Response("Not found", { status: 404 });
    }

    const requested = decodedPath === "/" ? "/index.html" : decodedPath;
    const bundlePath = resolveInside(WEB_ROOT, requested);
    if (!bundlePath) {
      return new Response("Forbidden", { status: 403 });
    }

    // The Expo bundle is a single-page app: any unknown path is still the app.
    if (!fs.existsSync(bundlePath)) {
      return serveFile(path.join(WEB_ROOT, "index.html"));
    }

    return serveFile(bundlePath);
  });
}

/* ------------------------------------------------------------------ *
 * IPC: backend proxy
 * ------------------------------------------------------------------ */

ipcMain.handle("api:request", async (_event, request) => {
  const { url, method, headers, body } = request ?? {};

  let parsedUrl;
  try {
    parsedUrl = new URL(String(url));
  } catch {
    throw new Error("Invalid request URL.");
  }

  if (!ALLOWED_API_ORIGINS.has(parsedUrl.origin)) {
    throw new Error(`Requests to ${parsedUrl.origin} are not allowed from the desktop app.`);
  }

  const response = await net.fetch(parsedUrl.toString(), {
    method: String(method || "GET").toUpperCase(),
    headers: headers && typeof headers === "object" ? headers : {},
    body: body ? Buffer.from(body) : undefined
  });

  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const responseBody = new Uint8Array(await response.arrayBuffer());

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody
  };
});

/* ------------------------------------------------------------------ *
 * IPC: files
 * ------------------------------------------------------------------ */

ipcMain.handle("file:savePdfFromHtml", async (_event, input) => {
  const html = String(input?.html || "");
  const relativeName = sanitizeRelativeFilePath(input?.fileName || "report.pdf");

  if (!html) {
    throw new Error("There was no lesson content to export.");
  }

  const targetPath = resolveInside(DOCUMENTS_DIR, relativeName);
  if (!targetPath) {
    throw new Error("That export location is not allowed.");
  }

  await fsp.mkdir(path.dirname(targetPath), { recursive: true });

  // Chromium renders the HTML off-screen and prints it. This is the same engine
  // that draws the app, so the PDF matches what the report is designed to look
  // like — no separate HTML-to-PDF library involved.
  const tempHtmlPath = path.join(os.tmpdir(), `dsc-${crypto.randomUUID()}.html`);
  await fsp.writeFile(tempHtmlPath, html, "utf8");

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { javascript: false, sandbox: true, contextIsolation: true }
  });

  try {
    await printWindow.loadURL(pathToFileURL(tempHtmlPath).toString());
    const pdfBuffer = await printWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: { marginType: "custom", top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
    });
    await fsp.writeFile(targetPath, pdfBuffer);
  } finally {
    printWindow.destroy();
    await fsp.unlink(tempHtmlPath).catch(() => undefined);
  }

  return { filePath: targetPath, mediaUrl: pathToFileURL(targetPath).toString() };
});

ipcMain.handle("file:saveMedia", async (_event, input) => {
  const data = input?.data;
  const fileName = sanitizeRelativeFilePath(input?.fileName || `${Date.now()}.webm`);

  if (!data || typeof data.byteLength !== "number" || data.byteLength === 0) {
    throw new Error("The recording was empty.");
  }

  const targetPath = resolveInside(RECORDINGS_DIR, fileName);
  if (!targetPath) {
    throw new Error("That recording location is not allowed.");
  }

  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.writeFile(targetPath, Buffer.from(data));

  const relativeUrlPath = path
    .relative(RECORDINGS_DIR, targetPath)
    .split(path.sep)
    .map(encodeURIComponent)
    .join("/");

  return {
    filePath: targetPath,
    mediaUrl: `${APP_SCHEME}://${MEDIA_HOST}/${relativeUrlPath}`
  };
});

/**
 * The page stores either a real path (PDFs) or an `app://media/...` URL
 * (recordings). Both are accepted here and mapped back to a path that is
 * verified to sit inside one of the two folders this app owns.
 */
function resolveManagedPath(target) {
  const value = String(target || "");
  if (!value) {
    return null;
  }

  if (value.startsWith(`${APP_SCHEME}://${MEDIA_HOST}/`)) {
    const url = new URL(value);
    return resolveInside(RECORDINGS_DIR, decodeURIComponent(url.pathname));
  }

  const resolved = path.resolve(value);
  const insideDocuments = resolveInside(DOCUMENTS_DIR, path.relative(DOCUMENTS_DIR, resolved));
  if (insideDocuments && insideDocuments === resolved) {
    return resolved;
  }

  const insideRecordings = resolveInside(RECORDINGS_DIR, path.relative(RECORDINGS_DIR, resolved));
  if (insideRecordings && insideRecordings === resolved) {
    return resolved;
  }

  return null;
}

ipcMain.handle("file:delete", async (_event, input) => {
  const target = resolveManagedPath(input?.target);
  if (!target) {
    return { deleted: false };
  }

  await fsp.unlink(target).catch(() => undefined);
  return { deleted: true };
});

ipcMain.handle("file:exists", async (_event, input) => {
  const target = resolveManagedPath(input?.target);
  if (!target) {
    return { exists: false };
  }

  try {
    await fsp.access(target);
    return { exists: true };
  } catch {
    return { exists: false };
  }
});

ipcMain.handle("file:open", async (_event, input) => {
  const target = resolveManagedPath(input?.target);
  if (!target) {
    return { opened: false };
  }

  const error = await shell.openPath(target);
  if (error) {
    // Falling back to the folder is more useful than a silent failure when the
    // user has no PDF viewer associated.
    shell.showItemInFolder(target);
  }
  return { opened: true };
});

ipcMain.handle("file:reveal", async (_event, input) => {
  const target = resolveManagedPath(input?.target);
  if (!target) {
    return { revealed: false };
  }

  shell.showItemInFolder(target);
  return { revealed: true };
});

ipcMain.handle("app:version", () => app.getVersion());

/* ------------------------------------------------------------------ *
 * Window
 * ------------------------------------------------------------------ */

function createWindow() {
  const iconPath = resolveIconPath();

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 420,
    minHeight: 640,
    backgroundColor: "#F7F7F2",
    title: "Daily Speaking Coach",
    autoHideMenuBar: true,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const session = mainWindow.webContents.session;

  // Chromium asks before handing a page the microphone. There is exactly one
  // app loaded in this window and it is ours, so audio/video capture is granted
  // and everything else is refused.
  session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media" || permission === "mediaKeySystem");
  });
  const allowedPermissionChecks = new Set(["media", "clipboard-read", "clipboard-sanitized-write"]);
  session.setPermissionCheckHandler((_webContents, permission) => allowedPermissionChecks.has(permission));

  // The window only ever shows the local bundle. Any other destination — a link
  // in a lesson, for example — opens in the user's normal browser instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_SCHEME}://${BUNDLE_HOST}`)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) {
        void shell.openExternal(url);
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(APP_START_URL);
}

// A second copy of the app would fight over the same recordings folder, so the
// running window is focused instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    registerAppProtocol();
    await fsp.mkdir(RECORDINGS_DIR, { recursive: true }).catch(() => undefined);
    await fsp.mkdir(DOCUMENTS_DIR, { recursive: true }).catch(() => undefined);

    if (!fs.existsSync(path.join(WEB_ROOT, "index.html"))) {
      dialog.showErrorBox(
        "Web build missing",
        "The app bundle was not found.\n\nRun \"npm run desktop:web\" in the project root to build it, then start the desktop app again."
      );
      app.quit();
      return;
    }

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
