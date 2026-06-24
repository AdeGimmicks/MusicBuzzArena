const managerAuthForm = document.querySelector("[data-manager-auth-form]");
const managerAuthMessage = document.querySelector("[data-manager-auth-message]");
const managerAuthParams = new URLSearchParams(window.location.search);

function showManagerAuthMessage(text, type = "pending") {
  if (!managerAuthMessage) return;
  managerAuthMessage.textContent = text;
  managerAuthMessage.dataset.type = type;
}

async function managerPostJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function managerFormValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

managerAuthForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const type = managerAuthForm.dataset.managerAuthForm;
    if (type === "forgot") {
      showManagerAuthMessage("Sending reset link...", "pending");
      await managerPostJson("/api/admin/forgot-password", managerFormValues(managerAuthForm));
      showManagerAuthMessage("If that Store Manager email exists, a password reset link has been sent.", "success");
      return;
    }
    if (type === "reset") {
      showManagerAuthMessage("Saving new password...", "pending");
      await managerPostJson("/api/admin/reset-password", {
        ...managerFormValues(managerAuthForm),
        token: managerAuthParams.get("token") || "",
      });
      showManagerAuthMessage("Password updated. You can log in now.", "success");
      setTimeout(() => window.location.assign("/store-manager-login"), 900);
    }
  } catch (error) {
    showManagerAuthMessage(error.message || "Something went wrong.", "error");
  }
});
