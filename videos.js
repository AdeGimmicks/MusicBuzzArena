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

async function renderVideos() {
  const store = await window.MBA.loadStore();
  const videos = store.site?.videos || {};
  const artist = store.artists?.[0];
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
