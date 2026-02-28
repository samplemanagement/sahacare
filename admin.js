const authForm = document.getElementById("admin-auth-form");
const keyInput = document.getElementById("admin-key");
const exportBtn = document.getElementById("export-btn");
const message = document.getElementById("admin-message");
const leadsBody = document.getElementById("leads-body");

let adminKey = "";

const statusOptions = ["new", "contacted", "interviewed", "pilot_candidate"];

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminKey = keyInput.value.trim();
  if (!adminKey) {
    renderMessage("Admin key required.", "error");
    return;
  }
  await loadLeads();
});

exportBtn?.addEventListener("click", async () => {
  if (!adminKey) {
    renderMessage("Load leads first by entering admin key.", "error");
    return;
  }

  const response = await fetch("/api/admin/export", {
    method: "GET",
    headers: {
      "x-admin-key": adminKey,
    },
  });

  if (!response.ok) {
    renderMessage("CSV export failed.", "error");
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

async function loadLeads() {
  const response = await fetch("/api/admin/leads", {
    method: "GET",
    headers: {
      "x-admin-key": adminKey,
    },
  });

  if (!response.ok) {
    renderMessage("Could not load leads. Check API key.", "error");
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
          "x-admin-key": adminKey,
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
