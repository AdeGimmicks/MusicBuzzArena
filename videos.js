/* ===================================================
   ARTIST VIDEO PAGE SCRIPT

   CODE OWNER GUIDE

   Loads YouTube video links, builds embeds, and updates video navigation.
   Used by: videos.html.
   Does not affect music downloads or Stripe payments.
=================================================== */

/* ===================================================
   VIDEO URL HELPERS

   Reads YouTube video links and prepares embed URLs used on
   the artist video page.

   Used by:
   - videos.html
=================================================== */
function youtubeIdFromUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

  try {
    const url = new URL(text);
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = ["shorts", "embed", "video"].find((item) => parts.includes(item));
    if (marker) return parts[parts.indexOf(marker) + 1] || "";
    if (url.hostname.includes("youtu.be")) return parts[0] || "";
  } catch {
    return "";
  }

  return "";
}

function embedUrl(videoId) {
  const origin = encodeURIComponent(window.location.origin || "http://127.0.0.1:8010");
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&origin=${origin}`;
}

function applyFrame(frame, url) {
  const videoId = youtubeIdFromUrl(url);
  if (!frame) return;
  const card = frame.closest("article");
  if (!videoId) {
    frame.removeAttribute("src");
    if (card) card.hidden = true;
    return;
  }
  if (card) card.hidden = false;
  frame.src = embedUrl(videoId);
}

function applyLink(link, href) {
  if (!link) return;
  if (!href) {
    link.hidden = true;
    link.removeAttribute("href");
    return;
  }
  link.hidden = false;
  link.href = href;
}

function slugify(value) {
  return String(value || "artist")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function artistSlug(artist) {
  return slugify(artist?.slug || artist?.handle || artist?.name || artist?.id);
}

/* ===================================================
   ARTIST VIDEO ROUTING AND NAVIGATION

   Finds the artist being viewed from the URL and updates the
   public navigation for that artist.
=================================================== */
function artistSlugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && ["videos", "video"].includes(parts[1])) return parts[0];
  return "";
}

function setArtistNav(artist) {
  if (!artist) return;
  window.MBAPublicContext?.applyPublicArtistNavigation(artist);
}

function artistForVideoPage(store) {
  const params = new URLSearchParams(window.location.search);
  const artistId = params.get("artist");
  const releaseId = params.get("release");
  const pathSlug = artistSlugFromPath();
  const release = releaseId ? (store.releases || []).find((item) => item.id === releaseId) : null;

  const releaseArtist = store.artists?.find((artist) => artist.id === release?.artistId);
  if (releaseArtist) return releaseArtist;

  if (pathSlug) {
    return store.artists?.find((artist) => artistSlug(artist) === pathSlug) || null;
  }

  const queryArtist = artistId ? store.artists?.find((artist) => artist.id === artistId) : null;
  if (queryArtist) return queryArtist;

  return null;
}

/* ===================================================
   VIDEO PAGE RENDER

   Loads saved artist video links and displays music videos,
   short videos, and watch buttons.
=================================================== */
async function renderVideos() {
  const store = await window.MBA.loadStore({ force: true });
  const artist = artistForVideoPage(store);
  setArtistNav(artist);

  if (artist) {
    const result = await window.MBA.incrementAnalytics(
      "artist",
      artist.id,
      "videoPageVisits"
    );
    if (result) artist.videoPageVisits = result.value;
  }

  const videos = artist?.videos || {};
  const artistName = artist?.name || "Artist";

  applyFrame(document.querySelector("#mainVideoFrame"), videos.mainVideoUrl);
  applyFrame(document.querySelector("#shortVideoFrame"), videos.shortVideoUrl);

  const title = document.querySelector("#mainVideoTitle");
  if (title) title.textContent = videos.mainVideoTitle || `${artistName} Video`;

  applyLink(document.querySelector("#mainVideoLink"), videos.mainVideoUrl);
  applyLink(document.querySelector("#moreVideosLink"), videos.moreVideosUrl);
  applyLink(document.querySelector("#moreShortsLink"), videos.moreShortsUrl);

  const moreVideos = document.querySelector("#moreVideosLink");
  const moreShorts = document.querySelector("#moreShortsLink");
  if (moreVideos) moreVideos.textContent = `Watch more videos from ${artistName}`;
  if (moreShorts) moreShorts.textContent = `Watch more shorts from ${artistName}`;
}

renderVideos();
