const authForm = document.querySelector("[data-auth-form]");
const authMessage = document.querySelector("[data-auth-message]");
const selectedUploadCopy = document.querySelector("[data-selected-upload-copy]");
const params = new URLSearchParams(window.location.search);
const RELEASE_TYPES = new Set(["Single", "EP", "Album"]);

function cleanReleaseType(value) {
  return RELEASE_TYPES.has(value) ? value : "";
}

function pendingType() {
  return cleanReleaseType(params.get("start")) || cleanReleaseType(localStorage.getItem("mba-pending-upload-type"));
}

function withStart(path) {
  const type = pendingType();
  return type ? `${path}?start=${encodeURIComponent(type)}` : path;
}

function dashboardUrl() {
  const next = params.get("next");
  if (next && next.startsWith("/artist-dashboard")) return next;
  return withStart("/artist-dashboard");
}

function setMessage(text, type = "pending") {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.className = `form-message ${type}`;
}

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function wireReturnLinks() {
  if (selectedUploadCopy) {
    const type = pendingType();
    selectedUploadCopy.textContent = type ? `Selected upload: ${type === "Single" ? "Single Song" : type}.` : "";
  }
  document.querySelectorAll("[data-login-link]").forEach((link) => link.href = withStart("/artist-login"));
  document.querySelectorAll("[data-register-link]").forEach((link) => link.href = withStart("/artist-register"));
  document.querySelectorAll("[data-forgot-link]").forEach((link) => link.href = withStart("/artist-forgot-password"));
}

async function handleRegister(form) {
  setMessage("Creating your artist account...", "pending");
  const data = await postJson("/api/artist/register", formValues(form));
  const type = pendingType();
  localStorage.setItem("mba-has-artist-account", "true");
  if (type) localStorage.setItem("mba-pending-upload-type", type);
  else localStorage.removeItem("mba-pending-upload-type");
  setMessage("Account created. Check your email to verify before logging in.", "success");
  if (data.verificationUrl) {
    const link = document.createElement("a");
    link.href = data.verificationUrl;
    link.textContent = "Open verification link";
    link.className = "auth-inline-link";
    authMessage.append(" ");
    authMessage.append(link);
  }
}

async function handleLogin(form) {
  setMessage("Logging in...", "pending");
  await postJson("/api/artist/login", formValues(form));
  localStorage.setItem("mba-has-artist-account", "true");
  window.location.assign(dashboardUrl());
}

async function handleForgot(form) {
  setMessage("Sending reset link...", "pending");
  await postJson("/api/artist/forgot-password", formValues(form));
  setMessage("If that email exists, a password reset link has been sent.", "success");
}

async function handleReset(form) {
  setMessage("Saving new password...", "pending");
  await postJson("/api/artist/reset-password", { ...formValues(form), token: params.get("token") || "" });
  setMessage("Password updated. You can log in now.", "success");
  setTimeout(() => window.location.assign(withStart("/artist-login")), 900);
}

async function verifyEmail() {
  if (!window.location.pathname.includes("artist-verify")) return;
  try {
    await postJson("/api/artist/verify", { token: params.get("token") || "" });
    setMessage("Email verified. You can now log in and continue your upload.", "success");
  } catch (error) {
    setMessage(error.message || "Verification failed.", "error");
  }
}

wireReturnLinks();
verifyEmail();

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const type = authForm.dataset.authForm;
    if (type === "register") await handleRegister(authForm);
    if (type === "login") await handleLogin(authForm);
    if (type === "forgot") await handleForgot(authForm);
    if (type === "reset") await handleReset(authForm);
  } catch (error) {
    setMessage(error.message || "Something went wrong.", "error");
  }
});
