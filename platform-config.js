/* ===================================================
   PLATFORM LINK CONFIGURATION

   CODE OWNER GUIDE

   Defines the social media and streaming platform fields used across upload forms and public pages.
   Used by: artist dashboard and public release pages.
   Does not save data by itself.
=================================================== */

/* ===================================================
   SOCIAL MEDIA LINK DEFINITIONS

   Controls the list of social platforms artists can add
   to their public profile.

   Used by:
   • Artist Dashboard profile form
   • Public artist home/profile pages

   Adding a new row here makes that social platform available
   where the website builds social link fields.
=================================================== */
const SOCIAL_LINKS = [
  ["Instagram", "instagram", "Social media icon/Instagram_logo_2016.svg.png"],
  ["Facebook", "facebook", "Social media icon/Facebook_f_logo_(2021).svg.png"],
  ["X", "x", "Social media icon/twitter-x-logo-png_seeklogo-492397.png"],
  ["YouTube", "youtube", "Social media icon/youtube-icon-lg.png"],
  ["TikTok", "tiktok", "Social media icon/tiktok-logo-tikok-icon-transparent-tikok-app-logo-free-png.webp"],
  ["Spotify", "spotify", "https://cdn.simpleicons.org/spotify/11141B"],
  ["Audiomack", "audiomack", "Music Platforms Logo/audiomack logo.png"],
  ["SoundCloud", "soundcloud", "Music Platforms Logo/soundcloud - Logo .webp"],
  ["Threads", "threads", "https://cdn.simpleicons.org/threads/11141B"],
  ["LinkedIn", "linkedin", "https://cdn.simpleicons.org/linkedin/11141B"],
  ["Snapchat", "snapchat", "https://cdn.simpleicons.org/snapchat/11141B"],
  ["WhatsApp", "whatsapp", "https://cdn.simpleicons.org/whatsapp/11141B"],
  ["Telegram", "telegram", "https://cdn.simpleicons.org/telegram/11141B"],
  ["Email", "email", "https://cdn.simpleicons.org/maildotru/11141B"],
  ["Website", "website", ""],
];

/* ===================================================
   STREAMING PLATFORM LINK DEFINITIONS

   Controls the list of streaming platforms that appear in
   upload forms and public listen/music pages.

   Used by:
   • Upload Wizard streaming step
   • Listen page
   • Music page streaming platform buttons

   This file only defines labels, field names, and icons.
   Click tracking and saving happen in other files.
=================================================== */
const STREAMING_LINKS = [
  ["Spotify", "spotify", "Music Platforms Logo/Spotify_App_Logo.svg.png"],
  ["Apple Music", "appleMusic", "Music Platforms Logo/Apple_Music_icon.svg.png"],
  ["YouTube Music", "youtubeMusic", "Music Platforms Logo/Youtube_Music_icon.svg.png"],
  ["Audiomack", "audiomack", "Music Platforms Logo/audiomack logo.png"],
  ["SoundCloud", "soundcloud", "Music Platforms Logo/soundcloud - Logo .webp"],
  ["Deezer", "deezer", "Music Platforms Logo/Deezer_Logo.jpg"],
  ["iTunes", "itunes", "Music Platforms Logo/itunes-logo-png-transparent.png"],
  ["TIDAL", "tidal", "Music Platforms Logo/tidal-logo-rounded-hd-free-png.webp"],
  ["Amazon Music", "amazonMusic", "Music Platforms Logo/amazon-music-logo-rounded-hd-free-png.webp"],
  ["Pandora", "pandora", "Music Platforms Logo/431-4316215_pandora-music-blue-logo-pandora-music-logo-png.png"],
  ["iHeartRadio", "iHeartRadio", "Music Platforms Logo/iHeartzRadio Logo.webp"],
];

const AUTOMATIC_EMBED_PLATFORM_KEYS = new Set([
  "spotify",
  "appleMusic",
  "youtubeMusic",
  "audiomack",
  "soundcloud",
  "deezer",
  "tidal",
]);

function streamingUrlFromInput(value) {
  const input = String(value || "").trim();
  const iframeSrc = input.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  const candidate = (iframeSrc || input).replace(/&amp;/gi, "&");
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function officialEmbedUrlForPlatform(platformKey, value) {
  const source = streamingUrlFromInput(value);
  if (!source) return "";
  const host = source.hostname.toLowerCase().replace(/^www\./, "");
  const parts = source.pathname.split("/").filter(Boolean);

  if (platformKey === "spotify" && host === "open.spotify.com") {
    const offset = parts[0] === "embed" ? 1 : 0;
    const type = parts[offset];
    const id = parts[offset + 1];
    if (["track", "album", "playlist", "episode", "show", "artist"].includes(type) && id) {
      return `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}`;
    }
  }

  if (platformKey === "appleMusic" && ["music.apple.com", "embed.music.apple.com"].includes(host)) {
    const path = source.pathname.replace(/^\/embed(?=\/)/, "");
    if (path && path !== "/") return `https://embed.music.apple.com${path}${source.search}`;
  }

  if (platformKey === "youtubeMusic") {
    const isYouTubeHost = ["youtube.com", "music.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host);
    if (isYouTubeHost) {
      const videoId = host === "youtu.be"
        ? parts[0]
        : source.searchParams.get("v") || (parts[0] === "embed" ? parts[1] : "");
      if (/^[A-Za-z0-9_-]{6,}$/.test(videoId || "")) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
      }
      const playlistId = source.searchParams.get("list");
      if (/^[A-Za-z0-9_-]{6,}$/.test(playlistId || "")) {
        return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`;
      }
    }
  }

  if (platformKey === "audiomack" && host === "audiomack.com") {
    const embedParts = parts[0] === "embed" ? parts.slice(1) : parts;
    if (embedParts.length >= 3 && ["song", "album", "playlist"].includes(embedParts[1])) {
      return `https://audiomack.com/embed/${embedParts.map(encodeURIComponent).join("/")}`;
    }
  }

  if (platformKey === "soundcloud") {
    if (host === "w.soundcloud.com" && source.pathname.startsWith("/player")) return source.href;
    if (host === "soundcloud.com" && parts.length >= 2) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(source.href)}&auto_play=false&show_artwork=true`;
    }
  }

  if (platformKey === "deezer" && ["deezer.com", "widget.deezer.com"].includes(host)) {
    if (host === "widget.deezer.com" && source.pathname.startsWith("/widget/")) return source.href;
    const typeIndex = parts.findIndex((part) => ["track", "album", "playlist", "artist"].includes(part));
    const type = parts[typeIndex];
    const id = parts[typeIndex + 1];
    if (type && /^\d+$/.test(id || "")) return `https://widget.deezer.com/widget/dark/${type}/${id}`;
  }

  if (platformKey === "tidal" && ["tidal.com", "embed.tidal.com"].includes(host)) {
    if (host === "embed.tidal.com") return source.href;
    const typeIndex = parts.findIndex((part) => ["track", "album", "playlist", "video"].includes(part));
    const type = parts[typeIndex];
    const id = parts[typeIndex + 1];
    const embedType = { track: "tracks", album: "albums", playlist: "playlists", video: "videos" }[type];
    if (embedType && id) return `https://embed.tidal.com/${embedType}/${encodeURIComponent(id)}`;
  }

  if (platformKey === "amazonMusic" && host === "music.amazon.com" && parts[0] === "embed") {
    return source.href;
  }

  return "";
}
