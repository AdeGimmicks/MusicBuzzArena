async function applySiteContent() {
  if (!window.MBAStorage) return;

  const store = await window.MBAStorage.loadArtistStore();
  const siteContent = store.siteContent || {};

  if (siteContent.siteTitle) {
    document.title = siteContent.siteTitle;
  }

  document.querySelectorAll("[data-site-content]").forEach((element) => {
    const key = element.dataset.siteContent;
    if (siteContent[key]) {
      element.textContent = siteContent[key];
    }
  });
}

applySiteContent();
