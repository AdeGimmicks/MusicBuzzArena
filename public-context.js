/* ===================================================
   PUBLIC ARTIST CONTEXT NAVIGATION

   Keeps public navigation inside the artist space currently
   being viewed. No featured, first, or hard-coded artist is
   used as a fallback.
=================================================== */
(function () {
  const LEGAL_PAGES = new Set([
    "about.html",
    "artist-agreement.html",
    "contact.html",
    "copyright.html",
    "dmca-policy.html",
    "no-refund-policy.html",
    "payout-policy.html",
    "privacy.html",
    "terms.html",
  ]);

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function artistSlug(artist) {
    return slugify(artist?.slug || artist?.handle || artist?.name || artist?.id);
  }

  function pathParts() {
    return window.location.pathname.split("/").filter(Boolean);
  }

  function artistTokenFromPath() {
    const parts = pathParts();
    if (!parts.length) return "";
    if (["listen", "download"].includes(parts[0])) return parts.length >= 3 ? parts[1] : "";
    if (parts.length >= 2 && ["music", "video", "videos"].includes(parts[1])) return parts[0];
    if (parts.length === 1 && !parts[0].includes(".") && !["home", "music", "video", "videos", "upload", "dashboard"].includes(parts[0])) {
      return parts[0];
    }
    return "";
  }

  function artistTokenFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("artist") || params.get("artistSlug") || params.get("artistId") || "";
  }

  function findArtist(store, token) {
    const wanted = slugify(token);
    if (!wanted) return null;
    return (store.artists || []).find((artist) => {
      return (
        String(artist.id || "").toLowerCase() === String(token).toLowerCase() ||
        artistSlug(artist) === wanted
      );
    }) || null;
  }

  function legalUrl(file, slug) {
    const url = new URL(file, window.location.origin);
    if (slug) url.searchParams.set("artist", slug);
    return `${url.pathname}${url.search}`;
  }

  function uploadUrl(slug, authenticated) {
    if (authenticated) return "/artist-dashboard";
    const url = new URL("/upload", window.location.origin);
    if (slug) url.searchParams.set("artist", slug);
    return `${url.pathname}${url.search}`;
  }

  function setHref(selector, href) {
    document.querySelectorAll(selector).forEach((link) => {
      link.href = href;
    });
  }

  function rewriteLegalLinks(slug) {
    document.querySelectorAll("a[href]").forEach((link) => {
      const rawHref = link.getAttribute("href") || "";
      if (!rawHref || rawHref.startsWith("#") || /^(https?:|mailto:|tel:)/i.test(rawHref)) return;
      const cleanFile = rawHref.split("?")[0].split("#")[0].replace(/^\//, "");
      if (!LEGAL_PAGES.has(cleanFile)) return;
      link.href = legalUrl(cleanFile, slug);
    });
  }

  function isDownloadOnlyRelease(release) {
    return release?.downloadOnly === true || release?.releaseType === "Beat / Instrumental";
  }

  function catalogLabelForArtist(artist, releases = []) {
    const artistReleases = releases.filter((release) => release.artistId === artist?.id && (release.status || "approved") === "approved");
    if (artistReleases.length && artistReleases.every(isDownloadOnlyRelease)) return "Beats";
    return "Music";
  }

  function catalogPathForLabel(slug, catalogLabel) {
    return catalogLabel === "Beats" ? `/${slug}/beats` : `/${slug}/music`;
  }

  function applyPublicArtistNavigation(artist, options = {}) {
    const slug = artistSlug(artist);
    if (!slug) return;
    const authenticated = Boolean(options.authenticated);
    const catalogLabel = options.catalogLabel || artist.publicCatalogLabel || "Music";
    const urls = {
      home: `/${slug}`,
      music: catalogPathForLabel(slug, catalogLabel),
      videos: `/${slug}/videos`,
      upload: uploadUrl(slug, authenticated),
    };

    document.querySelectorAll(".brand").forEach((brand) => {
      brand.href = urls.home;
    });

    document.querySelectorAll(".site-nav").forEach((nav) => {
      nav.innerHTML = `
        <a href="${urls.home}">Home</a>
        <a href="${urls.music}">${catalogLabel}</a>
        <a href="${urls.videos}">Videos</a>
        <a href="${urls.upload}">Upload</a>
      `;
    });

    setHref('a[href="/home"], a[href="/home#releases"]', urls.home);
    setHref('a[href="/music"]', urls.music);
    setHref('a[href="/video"], a[href="/videos"]', urls.videos);
    setHref('a[href="/upload"], a[href="/artist-dashboard"]', urls.upload);
    rewriteLegalLinks(slug);
  }

  async function artistSessionAuthenticated() {
    try {
      const response = await fetch("/api/artist/session", { cache: "no-store", credentials: "same-origin" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function initPublicArtistContext() {
    if (!window.MBA?.loadStore) return;
    const store = await window.MBA.loadStore({ force: false });
    const artist = findArtist(store, artistTokenFromPath()) || findArtist(store, artistTokenFromQuery());
    if (!artist) return;
    artist.publicCatalogLabel = catalogLabelForArtist(artist, store.releases || []);
    applyPublicArtistNavigation(artist, { authenticated: false, catalogLabel: artist.publicCatalogLabel });
    const authenticated = await artistSessionAuthenticated();
    applyPublicArtistNavigation(artist, { authenticated, catalogLabel: artist.publicCatalogLabel });
  }

  window.MBAPublicContext = {
    applyPublicArtistNavigation,
    artistSlug,
    catalogLabelForArtist,
    catalogPathForLabel,
    findArtist,
    init: initPublicArtistContext,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPublicArtistContext);
  } else {
    initPublicArtistContext();
  }
})();
