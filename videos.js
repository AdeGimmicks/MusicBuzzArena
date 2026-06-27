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
  if (!frame || !videoId) return;
  frame.src = embedUrl(videoId);
}

function applyLink(link, href) {
  if (!link || !href) return;
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

function artistSlugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && ["videos", "video"].includes(parts[1])) return parts[0];
  return "";
}

function setArtistNav(artist) {
  const nav = document.querySelector("#siteNav");
  if (!nav || !artist) return;
  const slug = artistSlug(artist);
  nav.innerHTML = `
    <a href="/${slug}">${artist.name || "Artist"}</a>
    <a href="/${slug}/music">Music</a>
    <a href="/${slug}/videos">Videos</a>
    <a href="/upload">Upload</a>
  `;
}

function artistForVideoPage(store) {
  const params = new URLSearchParams(window.location.search);
  const artistId = params.get("artist");
  const releaseId = params.get("release");
  const pathSlug = artistSlugFromPath();
  const release = releaseId ? (store.releases || []).find((item) => item.id === releaseId) : null;

  return (
    store.artists?.find((artist) => artist.id === release?.artistId) ||
    store.artists?.find((artist) => artistSlug(artist) === pathSlug) ||
    store.artists?.find((artist) => artist.id === artistId) ||
    store.artists?.find((artist) => artist.id === store.site?.featuredArtistId) ||
    store.artists?.[0]
  );
}

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

  const videos = artist?.videos || store.site?.videos || {};
  const artistName = artist?.name || "Focuzman";

  applyFrame(document.querySelector("#mainVideoFrame"), videos.mainVideoUrl || "https://www.youtube.com/watch?v=5-YcPo7bsqs");
  applyFrame(document.querySelector("#shortVideoFrame"), videos.shortVideoUrl || "https://www.youtube.com/shorts/07x9uu4EQiA");

  const title = document.querySelector("#mainVideoTitle");
  if (title) title.textContent = videos.mainVideoTitle || `${artistName} Video`;

  applyLink(document.querySelector("#mainVideoLink"), videos.mainVideoUrl || "https://www.youtube.com/watch?v=5-YcPo7bsqs");
  applyLink(document.querySelector("#moreVideosLink"), videos.moreVideosUrl || `https://www.youtube.com/@${artistName}/videos`);
  applyLink(document.querySelector("#moreShortsLink"), videos.moreShortsUrl || `https://www.youtube.com/@${artistName}/shorts`);

  const moreVideos = document.querySelector("#moreVideosLink");
  const moreShorts = document.querySelector("#moreShortsLink");
  if (moreVideos) moreVideos.textContent = `Watch more videos from ${artistName}`;
  if (moreShorts) moreShorts.textContent = `Watch more shorts from ${artistName}`;
}

renderVideos();
