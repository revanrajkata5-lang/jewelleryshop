// ============================================================
// CART + CHECKOUT LOGIC — jewelleryshop
// ============================================================
(function () {
  // ---------------- CONFIG ----------------
  const WHATSAPP_NUMBER = "YOUR_WHATSAPP_NUMBER"; // e.g. "919876543210" — leave as-is to skip WhatsApp
  const CURRENCY = "₹";

  // ---------------- STATE ----------------
  let cart = JSON.parse(localStorage.getItem("jewelleryCart") || "[]");
  let checkoutStep = "summary"; // "summary" | "form" | "success"
  let lastOrder = null;

  function saveCart() {
    localStorage.setItem("jewelleryCart", JSON.stringify(cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById("cart-count-badge");
    if (totalQty > 0) {
      badge.style.display = "flex";
      badge.textContent = totalQty;
    } else {
      badge.style.display = "none";
    }
  }

  function addToCart(name, price, image) {
    const existing = cart.find((i) => i.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name, price: Number(price), image, qty: 1 });
    }
    saveCart();
    openCartModal();
  }

  function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
    renderModal();
  }

  function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    renderModal();
  }

  function cartTotal() {
    return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function generateOrderId() {
    const now = new Date();
    const datePart =
      now.getFullYear().toString().slice(2) +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    const randPart = Math.floor(1000 + Math.random() * 9000);
    return "JS" + datePart + "-" + randPart;
  }

  // ---------------- MODAL CONTROL ----------------
  window.openCartModal = function () {
    checkoutStep = "summary";
    document.getElementById("cart-overlay").classList.add("open");
    renderModal();
  };

  window.closeCartModal = function () {
    document.getElementById("cart-overlay").classList.remove("open");
  };

  function renderModal() {
    const el = document.getElementById("cart-modal-content");
    if (checkoutStep === "summary") el.innerHTML = renderSummary();
    else if (checkoutStep === "form") el.innerHTML = renderForm();
    else if (checkoutStep === "success") el.innerHTML = renderSuccess();
  }

  // ---------------- STEP 1: SUMMARY ----------------
  function renderSummary() {
    if (cart.length === 0) {
      return `
        <h2>Your Cart</h2>
        <div class="cart-empty-msg">Your cart is empty.</div>
      `;
    }

    const rows = cart
      .map(
        (item, i) => `
        <div class="cart-item-row">
          <img src="${item.image}" alt="${item.name}">
          <div class="cart-item-info">
            <div class="name">${item.name}</div>
            <div class="price">${CURRENCY}${item.price} x ${item.qty} = ${CURRENCY}${item.price * item.qty}</div>
          </div>
          <div class="qty-controls">
            <button onclick="cartActions.changeQty(${i}, -1)">−</button>
            <span>${item.qty}</span>
            <button onclick="cartActions.changeQty(${i}, 1)">+</button>
          </div>
          <button class="remove-item-btn" onclick="cartActions.removeItem(${i})" title="Remove">🗑</button>
        </div>`
      )
      .join("");

    return `
      <h2>Order Summary</h2>
      ${rows}
      <div class="cart-total-row">
        <span>Total</span>
        <span>${CURRENCY}${cartTotal()}</span>
      </div>
      <button class="cart-primary-btn" onclick="cartActions.goToForm()">Proceed to Checkout</button>
    `;
  }

  // ---------------- STEP 2: DETAILS FORM ----------------
  function renderForm() {
    return `
      <h2>Delivery Details</h2>
      <div class="checkout-form" id="checkout-form">
        <label>Full Name *</label>
        <input type="text" id="f-name" placeholder="Enter your full name">
        <div class="field-error" id="err-name">Please enter your name</div>

        <label>Mobile Number *</label>
        <input type="tel" id="f-mobile" placeholder="10-digit mobile number" maxlength="10">
        <div class="field-error" id="err-mobile">Please enter a valid 10-digit mobile number</div>

        <label>Alternative Mobile Number</label>
        <input type="tel" id="f-altmobile" placeholder="Optional" maxlength="10">

        <label>Address *</label>
        <textarea id="f-address" placeholder="House no, street, landmark"></textarea>
        <div class="field-error" id="err-address">Please enter your address</div>

        <div class="field-row-2">
          <div>
            <label>Mandal *</label>
            <input type="text" id="f-mandal" placeholder="Mandal">
            <div class="field-error" id="err-mandal">Required</div>
          </div>
          <div>
            <label>District *</label>
            <input type="text" id="f-district" placeholder="District">
            <div class="field-error" id="err-district">Required</div>
          </div>
        </div>

        <button class="cart-primary-btn" onclick="cartActions.submitOrder()">Place Order</button>
        <button class="cart-secondary-btn" onclick="cartActions.backToSummary()">Back to Cart</button>
      </div>
    `;
  }

  function validateForm() {
    const fields = {
      name: document.getElementById("f-name").value.trim(),
      mobile: document.getElementById("f-mobile").value.trim(),
      altmobile: document.getElementById("f-altmobile").value.trim(),
      address: document.getElementById("f-address").value.trim(),
      mandal: document.getElementById("f-mandal").value.trim(),
      district: document.getElementById("f-district").value.trim(),
    };

    let valid = true;
    const showErr = (id, condition) => {
      document.getElementById(id).style.display = condition ? "block" : "none";
      if (condition) valid = false;
    };

    showErr("err-name", fields.name.length === 0);
    showErr("err-mobile", !/^[0-9]{10}$/.test(fields.mobile));
    showErr("err-address", fields.address.length === 0);
    showErr("err-mandal", fields.mandal.length === 0);
    showErr("err-district", fields.district.length === 0);

    return valid ? fields : null;
  }

  // ---------------- STEP 3: SUBMIT + SUCCESS ----------------
  function submitOrder() {
    const fields = validateForm();
    if (!fields) return;

    const orderId = generateOrderId();
    lastOrder = {
      orderId,
      items: [...cart],
      total: cartTotal(),
      ...fields,
      date: new Date().toLocaleString(),
    };

    // Optional: send to WhatsApp if a number is configured
    if (WHATSAPP_NUMBER && WHATSAPP_NUMBER !== "YOUR_WHATSAPP_NUMBER") {
      const itemLines = lastOrder.items
        .map((i) => `- ${i.name} x${i.qty} = ${CURRENCY}${i.price * i.qty}`)
        .join("%0A");
      const msg =
        `*New Order* (${orderId})%0A%0A` +
        `${itemLines}%0A` +
        `*Total: ${CURRENCY}${lastOrder.total}*%0A%0A` +
        `Name: ${fields.name}%0A` +
        `Mobile: ${fields.mobile}%0A` +
        `Alt. Mobile: ${fields.altmobile || "-"}%0A` +
        `Address: ${fields.address}%0A` +
        `Mandal: ${fields.mandal}%0A` +
        `District: ${fields.district}`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
    }

    cart = [];
    saveCart();
    checkoutStep = "success";
    renderModal();
  }

  function renderSuccess() {
    return `
      <div class="order-success">
        <div class="check-circle">✓</div>
        <h2>Order Successful!</h2>
        <p>Thank you, ${lastOrder.name}. We've received your order.</p>
        <div class="order-id-box">
          Order ID: <b>${lastOrder.orderId}</b><br>
          Total: <b>${CURRENCY}${lastOrder.total}</b>
        </div>
        <button class="cart-primary-btn" onclick="cartActions.closeAndReset()">Done</button>
      </div>
    `;
  }

  // ---------------- PUBLIC ACTIONS ----------------
  window.cartActions = {
    changeQty,
    removeItem,
    goToForm: function () {
      checkoutStep = "form";
      renderModal();
    },
    backToSummary: function () {
      checkoutStep = "summary";
      renderModal();
    },
    submitOrder,
    closeAndReset: function () {
      checkoutStep = "summary";
      closeCartModal();
    },
  };

  // Hook up "Add to Cart" buttons
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".add-to-cart-btn");
    if (btn) {
      addToCart(btn.dataset.name, btn.dataset.price, btn.dataset.image);
    }
  });

  document.addEventListener("DOMContentLoaded", updateCartBadge);
  updateCartBadge();
})();
