const authForm = document.getElementById("admin-auth-form");
const keyInput = document.getElementById("admin-key");
const exportBtn = document.getElementById("export-btn");
const logoutBtn = document.getElementById("logout-btn");
const message = document.getElementById("admin-message");
const leadsBody = document.getElementById("leads-body");
const year = document.getElementById("year");

const statusOptions = ["new", "contacted", "interviewed", "pilot_candidate"];

if (year) {
  year.textContent = String(new Date().getFullYear());
}

initAdminSession();

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const adminKey = keyInput.value.trim();
  if (!adminKey) {
    renderMessage("Admin key required.", "error");
    return;
  }

  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ adminKey }),
  });

  if (!response.ok) {
    renderMessage("Could not authenticate admin key.", "error");
    return;
  }

  keyInput.value = "";
  await loadLeads();
});

exportBtn?.addEventListener("click", async () => {
  const response = await fetch("/api/admin/export", {
    method: "GET",
  });

  if (!response.ok) {
    renderMessage("CSV export failed. Please login again.", "error");
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "waitlist-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
  renderMessage("CSV exported.", "success");
});

logoutBtn?.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  leadsBody.innerHTML = "";
  renderMessage("Logged out.", "success");
});

async function loadLeads() {
  const response = await fetch("/api/admin/leads", {
    method: "GET",
  });

  if (!response.ok) {
    renderMessage("Could not load leads. Login required.", "error");
    return;
  }

  const data = await response.json();
  leadsBody.innerHTML = "";

  for (const lead of data.leads) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(lead.email)}</td>
      <td>${escapeHtml(lead.role)}</td>
      <td>
        <select data-id="${lead.id}">
          ${statusOptions
            .map(
              (status) =>
                `<option value="${status}" ${lead.status === status ? "selected" : ""}>${status}</option>`,
            )
            .join("")}
        </select>
      </td>
      <td>${escapeHtml(lead.source || "direct")}</td>
      <td>${new Date(lead.created_at).toLocaleString()}</td>
      <td><button class="button ghost" data-save="${lead.id}">Save</button></td>
    `;
    leadsBody.appendChild(row);
  }

  leadsBody.querySelectorAll("button[data-save]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-save");
      const select = leadsBody.querySelector(`select[data-id="${id}"]`);
      const status = select?.value;
      if (!id || !status) {
        return;
      }

      const updateResponse = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      if (!updateResponse.ok) {
        renderMessage("Status update failed.", "error");
        return;
      }

      renderMessage("Lead status updated.", "success");
    });
  });

  renderMessage(`Loaded ${data.leads.length} leads.`, "success");
}

async function initAdminSession() {
  try {
    const response = await fetch("/api/admin/session");
    if (!response.ok) {
      return;
    }

    const body = await response.json();
    if (body.authenticated) {
      await loadLeads();
    }
  } catch (_error) {
    // No-op on bootstrap checks.
  }
}

function renderMessage(text, type) {
  if (!message) {
    return;
  }
  message.textContent = text;
  message.classList.remove("success", "error");
  message.classList.add(type);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
