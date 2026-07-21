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
  const LEGAL_PAGE_CONFIG = {
    "about.html": { key: "about", title: "About MusicBusiness Arena" },
    "artist-agreement.html": { key: "artistAgreement", title: "Artist Agreement" },
    "contact.html": { key: "contact", title: "Contact Us" },
    "copyright.html": { key: "copyright", title: "Copyright Policy" },
    "dmca-policy.html": { key: "dmca", title: "DMCA Policy" },
    "no-refund-policy.html": { key: "noRefundPolicy", title: "No Refund Policy" },
    "payout-policy.html": { key: "payoutPolicy", title: "Payout Policy" },
    "privacy.html": { key: "privacy", title: "Privacy Policy" },
    "terms.html": { key: "terms", title: "Terms of Service" },
    about: { key: "about", title: "About MusicBusiness Arena" },
    "artist-agreement": { key: "artistAgreement", title: "Artist Agreement" },
    contact: { key: "contact", title: "Contact Us" },
    copyright: { key: "copyright", title: "Copyright Policy" },
    "dmca-policy": { key: "dmca", title: "DMCA Policy" },
    "no-refund-policy": { key: "noRefundPolicy", title: "No Refund Policy" },
    "payout-policy": { key: "payoutPolicy", title: "Payout Policy" },
    privacy: { key: "privacy", title: "Privacy Policy" },
    terms: { key: "terms", title: "Terms of Service" },
  };
  const DEFAULT_SITE = {
    logo: "Mba Logos/MusicBusiness Logo.png",
    title: "MusicBusiness Arena",
    footerTagline: "Artist Profiles. Music Downloads. Streaming Links.",
    footerDescription: "MusicBusiness Arena is a platform for artists to showcase their music, share streaming links, and sell downloadable songs directly to fans.",
    copyrightText: "© 2026 MusicBusiness Arena. All rights reserved.",
    favicon: "Mba Logos/MBA Favicon.png",
    socials: {},
  };
  const SOCIAL_LABELS = {
    x: "X",
    facebook: "Facebook",
    instagram: "Instagram",
    youtube: "YouTube",
    tiktok: "TikTok",
    twitch: "Twitch",
  };
  const RESERVED_ROUTES = new Set([
    "artist-dashboard",
    "artist-forgot-password",
    "artist-login",
    "artist-register",
    "artist-reset-password",
    "artist-verify",
    "dashboard",
    "home",
    "music",
    "store-manager",
    "upload",
    "video",
    "videos",
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
    if (parts.length === 1 && !parts[0].includes(".") && !RESERVED_ROUTES.has(parts[0])) {
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

  function setText(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function faviconElement() {
    let link = document.querySelector('link[rel~="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.append(link);
    }
    return link;
  }

  function applySiteChrome(store = {}) {
    const site = { ...DEFAULT_SITE, ...(store.site || {}) };
    const title = site.title || DEFAULT_SITE.title;
    document.title = document.title.includes("|")
      ? document.title.replace(/[^|]+$/, title)
      : title;
    document.querySelectorAll("[data-logo]").forEach((img) => {
      img.src = site.logo || DEFAULT_SITE.logo;
      img.alt = `${title} logo`;
    });
    faviconElement().href = site.favicon || DEFAULT_SITE.favicon;
    setText('[data-site="title"]', title);
    setText('[data-site="tagline"]', site.tagline);
    setText('[data-site="intro"]', site.intro);
    setText(".footer-tagline", site.footerTagline || DEFAULT_SITE.footerTagline);
    setText(".footer-description", site.footerDescription || DEFAULT_SITE.footerDescription);
    setText(".footer-copy", site.copyrightText || DEFAULT_SITE.copyrightText);

    document.querySelectorAll(".footer-socials").forEach((container) => {
      Object.entries(SOCIAL_LABELS).forEach(([key, label]) => {
        const link = container.querySelector(`a[aria-label="${label}"]`);
        if (!link) return;
        const href = site.socials?.[key] || "";
        if (href) {
          link.hidden = false;
          link.href = href;
        }
      });
    });
  }

  function pageFilename() {
    const parts = pathParts();
    return parts[parts.length - 1] || "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderLegalText(text) {
    const blocks = String(text || "")
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
    return blocks.map((block) => {
      if (block.startsWith("## ")) return `<h2>${escapeHtml(block.slice(3).trim())}</h2>`;
      if (block.startsWith("# ")) return `<h1>${escapeHtml(block.slice(2).trim())}</h1>`;
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines.map((line) => `<li>${escapeHtml(line.slice(2).trim())}</li>`).join("")}</ul>`;
      }
      return `<p>${lines.map(escapeHtml).join("<br>")}</p>`;
    }).join("");
  }

  function applyLegalPageContent(store = {}) {
    const config = LEGAL_PAGE_CONFIG[pageFilename()];
    if (!config) return;
    const savedContent = store.site?.legalPages?.[config.key];
    if (!savedContent || !String(savedContent).trim()) return;
    const container = document.querySelector(".legal-container");
    if (!container) return;
    const rendered = renderLegalText(savedContent);
    const contentHtml = rendered.includes("<h1>")
      ? rendered
      : `<h1>${escapeHtml(config.title)}</h1>${rendered}`;
    if (config.key === "contact") {
      const form = container.querySelector("form");
      container.innerHTML = form
        ? `${contentHtml}<h2>Contact Form</h2>${form.outerHTML}`
        : contentHtml;
      return;
    }
    container.innerHTML = contentHtml;
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
    applySiteChrome(store);
    applyLegalPageContent(store);
    const artist = findArtist(store, artistTokenFromPath()) || findArtist(store, artistTokenFromQuery());
    if (!artist) return;
    artist.publicCatalogLabel = catalogLabelForArtist(artist, store.releases || []);
    applyPublicArtistNavigation(artist, { authenticated: false, catalogLabel: artist.publicCatalogLabel });
    const authenticated = await artistSessionAuthenticated();
    applyPublicArtistNavigation(artist, { authenticated, catalogLabel: artist.publicCatalogLabel });
  }

  window.MBAPublicContext = {
    applyPublicArtistNavigation,
    applySiteChrome,
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
