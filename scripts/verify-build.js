const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "server.js",
  "index.html",
  "artist-dashboard.html",
  "artist-page.html",
  "artist-page-2.html",
  "videos.html",
  "styles.css",
  "mba-storage.js",
  "platform-config.js",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length) {
  console.error(`Missing required deployment files: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("MusicBusiness Arena build verification passed.");
