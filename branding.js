async function applyBranding() {
  if (!window.MBAStorage) return;

  const store = await window.MBAStorage.loadArtistStore();
  const logo = store.branding?.logo || "Mba Logos/MusicBusiness Logo.png";

  document.querySelectorAll("[data-brand-logo]").forEach((image) => {
    image.src = logo;
  });

  document.querySelectorAll("[data-brand-background]").forEach((element) => {
    element.style.backgroundImage = `url("${logo}")`;
  });
}

applyBranding();
