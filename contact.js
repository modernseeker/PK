const YK_CONTACT = {
  phone: "9747359443",
  email: "ykelectricnepal@gmail.com",
  whatsapp: "9779747359443"
};

const phoneEl = document.getElementById("phoneText");
const emailEl = document.getElementById("emailText");
if (phoneEl) phoneEl.innerHTML = `<a href="tel:+977${YK_CONTACT.phone}">${YK_CONTACT.phone}</a>`;
if (emailEl) emailEl.innerHTML = `<a href="mailto:${YK_CONTACT.email}">${YK_CONTACT.email}</a>`;

const orderButton = document.getElementById("copyOrder");
if (orderButton) {
  orderButton.textContent = "Send order on WhatsApp";
  orderButton.onclick = () => {
    const items = JSON.parse(localStorage.getItem("yk_request_cart") || "[]");
    if (!items.length) {
      const status = document.getElementById("copyStatus");
      if (status) status.textContent = "Add at least one product first.";
      return;
    }
    const catalog = typeof products !== "undefined" ? products : [];
    const lines = items.map((item, i) => {
      const p = catalog.find(v => v.id === item.id);
      return p ? `${i + 1}. ${p.name} (${p.code}) — Qty ${item.qty}` : `${i + 1}. Product ${item.id} — Qty ${item.qty}`;
    });
    const text = [
      "Hello YK Electric & Electronic,",
      "",
      "Please confirm availability and final price for:",
      ...lines,
      "",
      "Please confirm exact model, stock, price and delivery."
    ].join("\n");
    const popup = window.open(`https://wa.me/${YK_CONTACT.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    if (popup) popup.opener = null;
  };
}

const requestForm = document.getElementById("requestForm");
if (requestForm) {
  requestForm.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(requestForm);
    const text = [
      "Hello YK Electric & Electronic,",
      "",
      `Name: ${f.get("name")}`,
      `Phone: ${f.get("phone")}`,
      `Product: ${f.get("product")}`,
      `Details: ${f.get("details") || "-"}`,
      "",
      "Please confirm availability and final price."
    ].join("\n");
    const popup = window.open(`https://wa.me/${YK_CONTACT.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    if (popup) popup.opener = null;
    const status = document.getElementById("formStatus");
    if (status) status.textContent = "Opening WhatsApp with your prepared request…";
  };
}
