(function () {
  const page = document.getElementById("downloadPage");
  const params = new URLSearchParams(window.location.search);
  const releaseId = params.get("release");
  const checkoutState = params.get("checkout");
  let previewAudio = null;

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function money(amount, currency) {
    const code = String(currency || "usd").toUpperCase();
    const value = Number(amount || 0.99);
    return `${code} ${Number.isFinite(value) ? value.toFixed(2) : "0.99"}`;
  }

  function releaseDateLabel(release) {
    if (!release.releaseDate) return "Release date will appear here";
    const date = new Date(release.releaseDate);
    if (Number.isNaN(date.getTime())) return release.releaseDate;
    return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  function approvedReleases(store) {
    return (store.releases || []).filter((release) => release.status === "approved");
  }

  function selectedRelease(store) {
    const releases = approvedReleases(store);
    return releases.find((release) => release.id === releaseId) || releases[0] || null;
  }

  function selectedArtist(store, release) {
    return (store.artists || []).find((artist) => artist.id === release?.artistId) || {};
  }

  function renderEmpty() {
    page.innerHTML = `
      <div class="download-empty">
        <p class="download-eyebrow">MusicBusiness Arena</p>
        <h1>No release selected</h1>
        <p>Approved songs will be available for paid download here.</p>
        <a class="pay-now-button" href="/home">Back to Home</a>
      </div>
    `;
  }

  function renderPage(store) {
    const release = selectedRelease(store);
    if (!release) {
      renderEmpty();
      return;
    }

    const artist = selectedArtist(store, release);
    const artistName = artist.name || release.artistName || "Independent Artist";
    const artwork = release.cover || artist.photo || "Mba Logos/MusicBusiness Logo.png";
    const isSuccess = checkoutState === "success";
    const isCancelled = checkoutState === "cancelled";
    const price = money(release.price, release.currency);

    page.innerHTML = `
      <article class="download-card">
        <div>
          <img class="download-artwork" src="${escapeHtml(artwork)}" alt="${escapeHtml(release.title)} artwork" />
        </div>
        <div class="download-info">
          <p class="download-eyebrow">Paid Download</p>
          <h1>${escapeHtml(release.title || "Untitled Song")}</h1>
          <p class="download-subtitle">${escapeHtml(artistName)} · ${escapeHtml(releaseDateLabel(release))}</p>
          <p class="download-price">${price}</p>
          ${renderPreview(release)}
          <div class="download-actions">
            ${
              isSuccess
                ? `<a class="download-file-button" href="${escapeHtml(release.audioUrl || "#")}" download>Download Song File</a>`
                : `<button class="pay-now-button" id="payNowButton" type="button">Pay Now</button>`
            }
            <a class="download-secondary-link" href="/listen?release=${encodeURIComponent(release.id)}">Streaming Links</a>
          </div>
          <p class="download-status ${isSuccess ? "is-success" : isCancelled ? "is-error" : ""}" id="downloadStatus">
            ${
              isSuccess
                ? "Payment complete. Your song file is ready."
                : isCancelled
                  ? "Payment was cancelled. You can try again."
                  : "Preview the sample, then pay to unlock the download."
            }
          </p>
        </div>
      </article>
    `;

    setupPreview(release);
    setupCheckout(release);
  }

  function renderPreview(release) {
    if (!release.audioUrl) {
      return `<div class="preview-panel"><p>No preview audio is available for this release yet.</p></div>`;
    }

    return `
      <div class="preview-panel">
        <p>Preview before paying</p>
        <div class="preview-controls">
          <button class="preview-play-button" id="previewButton" type="button">Preview</button>
          <div class="preview-track" aria-label="Preview progress">
            <div class="preview-fill" id="previewFill"></div>
          </div>
        </div>
      </div>
    `;
  }

  function setupPreview(release) {
    const button = document.getElementById("previewButton");
    const fill = document.getElementById("previewFill");
    if (!button || !fill || !release.audioUrl) return;

    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }

    const start = Math.max(0, Number(release.previewStart || 0));
    const defaultEnd = start + Number(release.previewDuration || 60);
    const configuredEnd = Number(release.previewEnd || 0);
    const end = configuredEnd > start ? configuredEnd : defaultEnd;

    previewAudio = new Audio(release.audioUrl);
    previewAudio.preload = "metadata";

    button.addEventListener("click", async () => {
      if (previewAudio.paused) {
        if (previewAudio.currentTime < start || previewAudio.currentTime >= end) {
          previewAudio.currentTime = start;
        }
        await previewAudio.play();
        button.textContent = "Pause";
      } else {
        previewAudio.pause();
        button.textContent = "Preview";
      }
    });

    previewAudio.addEventListener("timeupdate", () => {
      const progress = Math.max(0, Math.min(100, ((previewAudio.currentTime - start) / (end - start)) * 100));
      fill.style.width = `${progress}%`;
      if (previewAudio.currentTime >= end) {
        previewAudio.pause();
        previewAudio.currentTime = start;
        fill.style.width = "0%";
        button.textContent = "Preview";
      }
    });

    previewAudio.addEventListener("ended", () => {
      previewAudio.currentTime = start;
      fill.style.width = "0%";
      button.textContent = "Preview";
    });
  }

  function setupCheckout(release) {
    const button = document.getElementById("payNowButton");
    const status = document.getElementById("downloadStatus");
    if (!button) return;

    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Opening Checkout...";
      status.textContent = "Connecting to secure checkout.";
      status.className = "download-status";

      try {
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseId: release.id,
            type: "download",
            amount: Number(release.price || 0.99),
            currency: release.currency || "usd",
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.url) {
          throw new Error(data.error || "Unable to start checkout.");
        }
        window.location.href = data.url;
      } catch (error) {
        status.textContent = error.message || "Unable to start checkout.";
        status.className = "download-status is-error";
        button.disabled = false;
        button.textContent = "Pay Now";
      }
    });
  }

  async function init() {
    try {
      const store = await window.MBA.loadStore({ force: true });
      renderPage(store);
    } catch (error) {
      page.innerHTML = `
        <div class="download-empty">
          <p class="download-eyebrow">Download</p>
          <h1>Unable to load this release</h1>
          <p>${escapeHtml(error.message || "Please try again.")}</p>
        </div>
      `;
    }
  }

  init();
})();
