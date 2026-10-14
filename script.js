/* WINGS8 Behaviour: Nav, Cart, 3D Switcher, Razorpay Payment Gateway, Order Tracking, Contact Form */

/** Pure enquiry validation, kept DOM-free so it can be unit tested. Returns {field: message}. */
function validateEnquiry(values) {
  const errors = {};
  const clean = (v) => (typeof v === 'string' ? v.trim() : '');

  if (!clean(values.name)) errors.name = 'Enter your name.';
  if (!clean(values.organisation)) errors.organisation = 'Enter your organisation.';

  const email = clean(values.email);
  if (!email) errors.email = 'Enter your work email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter an email like name@company.com.';

  if (!clean(values.region)) errors.region = 'Choose a region.';
  return errors;
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

const INDIAN_UNION_TERRITORIES = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

const ALL_INDIAN_REGIONS = new Set([...INDIAN_STATES, ...INDIAN_UNION_TERRITORIES]);

/** Pure checkout validation, kept DOM-free so it can be unit tested. Returns {field: message}. */
function validateCheckout(values) {
  const errors = {};
  const clean = (v) => (typeof v === 'string' ? v.trim() : '');

  if (!clean(values.name)) errors.name = 'Enter your name.';
  const email = clean(values.email);
  if (!email) errors.email = 'Enter your email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter a valid email.';

  if (!clean(values.phone)) errors.phone = 'Enter your phone number.';
  if (!clean(values.address)) errors.address = 'Enter your delivery address.';

  const city = clean(values.city);
  if (!city) {
    errors.city = 'Enter your city.';
  } else if (city.length < 2) {
    errors.city = 'Enter a valid city name.';
  }

  if (!clean(values.postal)) errors.postal = 'Enter your postal or PIN code.';

  const region = clean(values.region);
  if (!region) {
    errors.region = 'Choose a State / UT.';
  } else if (!ALL_INDIAN_REGIONS.has(region) && region !== 'India') {
    errors.region = 'Select a valid Indian State or Union Territory.';
  }

  return errors;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateEnquiry,
    validateCheckout,
    INDIAN_STATES,
    INDIAN_UNION_TERRITORIES,
    ALL_INDIAN_REGIONS
  };
}

if (typeof document !== 'undefined') {
  document.documentElement.classList.add('js');

  // Friendly banner if opened locally without server
  if (window.location.protocol === 'file:') {
    const banner = document.createElement('div');
    banner.className = 'env-banner';
    banner.innerHTML = '<strong>Developer Notice:</strong> You are viewing via <code>file://</code> protocol. For 3D WebGL models and live Razorpay checkout, run <code>node server.js</code> or <code>npm start</code> and visit <a href="http://localhost:3000" style="text-decoration:underline;color:inherit;font-weight:bold;">http://localhost:3000</a>.';
    document.body.prepend(banner);
  }

  // ---------- Navigation & Mobile Menu ----------
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    if (!menu || !toggle) return;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
  };
  if (toggle && menu) {
    toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  }

  // Highlight active nav link on scroll
  const links = new Map([...document.querySelectorAll('#menu a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]));
  const targets = { apps: 'architecture', launch: 'wares', shop: 'shop', clients: 'clients' };
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = targets[entry.target.id] || entry.target.id;
      links.forEach((a, key) => a.classList.toggle('is-active', key === id && key !== 'contact'));
    });
  }, { rootMargin: '-40% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));

  // Reveals: headings fade up; cards stagger
  const STAGGER = '.sec .grid, .sec .devices, .sec .impact, .sec .timeline, .sec .paradigm, .sec .cards, .sec .specs, .sec .steps, .sec .chips, .shop-grid';
  const WIPED = '.sec .h2, .sec .diagram, .sec .duo, .sec .estate-visual';
  document.querySelectorAll(STAGGER).forEach((el) => {
    el.classList.add('stagger');
    [...el.children].forEach((child, i) => child.style.setProperty('--i', i));
  });

  const probes = new Map();
  document.querySelectorAll(WIPED).forEach((el) => {
    el.classList.add('reveal');
    const probe = document.createElement('span');
    probe.className = 'probe';
    probe.setAttribute('aria-hidden', 'true');
    el.before(probe);
    probes.set(probe, el);
  });
  const reveal = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      (probes.get(entry.target) || entry.target).classList.add('is-in');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll(`${STAGGER}, .sec__head`).forEach((el) => reveal.observe(el));
  probes.forEach((_, probe) => reveal.observe(probe));

  // Scroll progress bar
  const nav = document.querySelector('.nav');
  const bar = document.getElementById('progress');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- 3D Product Stage (W8 USB & W8 TV) ----------
  const stage = document.getElementById('stickStage');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active3DView = null;

  if (stage && 'WebGLRenderingContext' in window) {
    stage.addEventListener('pointerdown', () => stage.classList.add('touched'), { once: true });
    const CAPTIONS = {
      usb: 'W8 USB: One-time installation of W8 OS on any PC.',
      tv: 'W8 TV: HDMI stick that turns any smart TV into a computer.'
    };
    const switcher = document.querySelector('.stage-switch');
    const caption = document.getElementById('stageCaption');

    const boot = () => import('./stick3d.js?v=2.3.0')
      .then((m) => m.mountStick(stage, { logoUrl: stage.dataset.logo, reduceMotion, model: stage.dataset.model || 'usb' }))
      .then((view) => {
        active3DView = view;
        const buttons = switcher ? [...switcher.querySelectorAll('button')] : [];
        const show = (name) => {
          buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.model === name)));
          if (caption) caption.textContent = CAPTIONS[name] || '';
        };
        show(view.model);
        if (switcher) switcher.hidden = false;
        buttons.forEach((b) => b.addEventListener('click', () => {
          if (view.setModel(b.dataset.model)) show(b.dataset.model);
        }));
      })
      .catch(() => stage.classList.add('no-3d'));

    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot, { once: true });
  }

  // ---------- W8 TV Shop Card 3D Product Stage ----------
  const shopTvStage = document.getElementById('shopCardTvStage');
  if (shopTvStage && 'WebGLRenderingContext' in window) {
    const bootShopTv = () => import('./stick3d.js?v=2.3.0')
      .then((m) => m.mountStick(shopTvStage, {
        logoUrl: shopTvStage.dataset.logo || 'assets/slide_1_p1_i3.png',
        reduceMotion,
        model: 'tv',
        scrollTurn: false,
        isCard: true
      }))
      .catch((err) => {
        console.warn('Failed to load shop card 3D TV:', err);
        shopTvStage.classList.add('no-3d');
      });

    if (document.readyState === 'complete') bootShopTv();
    else window.addEventListener('load', bootShopTv, { once: true });
  }

  // ---------- W8 USB Shop Card 3D Product Stage ----------
  const shopUsbStage = document.getElementById('shopCardUsbStage');
  if (shopUsbStage && 'WebGLRenderingContext' in window) {
    const bootShopUsb = () => import('./stick3d.js?v=2.3.0')
      .then((m) => m.mountStick(shopUsbStage, {
        logoUrl: shopUsbStage.dataset.logo || 'assets/slide_2_p2_i21.png',
        reduceMotion,
        model: 'usb',
        scrollTurn: false,
        isCard: true
      }))
      .catch((err) => {
        console.warn('Failed to load shop card 3D USB:', err);
        shopUsbStage.classList.add('no-3d');
      });

    if (document.readyState === 'complete') bootShopUsb();
    else window.addEventListener('load', bootShopUsb, { once: true });
  }

  // ---------- Product Catalogue Pricing & Deposits ----------
  const CATALOG_DEPOSITS = {
    'w8-tv': 999,
    'w8-usb': 499
  };

  // ---------- Shopping Cart & Persistence ----------
  const CART_KEY = 'wings8_cart';
  const getCart = () => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };
  const saveCart = (cart) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
    updateCartUI();
  };

  const cartToggle = document.getElementById('cartToggle');
  const cartBadge = document.getElementById('cartBadge');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartBackdrop = document.getElementById('cartBackdrop');
  const cartClose = document.getElementById('cartClose');
  const cartDrawerCount = document.getElementById('cartDrawerCount');
  const cartDrawerBody = document.getElementById('cartDrawerBody');
  const cartSubtotalVal = document.getElementById('cartSubtotalVal');
  const proceedToCheckoutBtn = document.getElementById('proceedToCheckoutBtn');

  const setCartOpen = (open) => {
    if (!cartDrawer) return;
    if (open) {
      updateCartUI();
    }
    cartDrawer.classList.toggle('is-open', open);
    cartDrawer.setAttribute('aria-hidden', String(!open));
    if (cartBackdrop) cartBackdrop.hidden = !open;
    if (cartToggle) cartToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      cartClose?.focus();
    }
  };

  const updateCartUI = () => {
    const cart = getCart();
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalINR = cart.reduce((sum, item) => {
      const deposit = CATALOG_DEPOSITS[item.id] || 0;
      return sum + deposit * item.qty;
    }, 0);

    if (cartBadge) cartBadge.textContent = String(totalCount);
    if (cartToggle) cartToggle.setAttribute('aria-label', `Open shopping cart (${totalCount} item${totalCount === 1 ? '' : 's'})`);
    if (cartDrawerCount) cartDrawerCount.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;
    if (cartSubtotalVal) cartSubtotalVal.textContent = `₹${subtotalINR.toLocaleString('en-IN')}`;

    // Synchronize product card buttons with cart state
    const addToCartBtns = document.querySelectorAll('[data-action="add-to-cart"]');
    addToCartBtns.forEach((btn) => {
      const id = btn.dataset.id;
      const inCart = cart.some((i) => i.id === id && i.qty > 0);
      const span = btn.querySelector('span');
      if (inCart) {
        btn.classList.add('is-added');
        if (span) span.textContent = 'Added to Cart \u2713';
        btn.setAttribute('aria-label', `${btn.dataset.name || 'Product'} added to cart`);
      } else {
        btn.classList.remove('is-added');
        if (span) span.textContent = 'Add to Cart';
        btn.setAttribute('aria-label', `Add ${btn.dataset.name || 'Product'} to Cart`);
      }
    });

    if (!cartDrawerBody) return;
    if (cart.length === 0) {
      cartDrawerBody.innerHTML = '<p class="cart-empty-msg">Your cart is currently empty.<br><br>Explore the launch catalogue to reserve hardware allocations.</p>';
      if (proceedToCheckoutBtn) proceedToCheckoutBtn.disabled = true;
    } else {
      if (proceedToCheckoutBtn) proceedToCheckoutBtn.disabled = false;
      cartDrawerBody.innerHTML = cart.map((item) => {
        const unitDeposit = CATALOG_DEPOSITS[item.id] || 0;
        const itemTotal = unitDeposit * item.qty;
        return `
          <div class="cart-item" data-id="${item.id}">
            <div class="cart-item__thumb">
              ${item.id === 'w8-tv'
                ? '<img src="assets/w8-tv-upright.png" alt="W8 TV">'
                : '<img src="assets/w8-usb-upright.png" alt="W8 USB">'
              }
            </div>
            <div class="cart-item__info">
              <h4 class="cart-item__title">${item.name}</h4>
              <p class="cart-item__desc">${item.desc || ''}</p>
              <p class="cart-item__price">Price: ₹${itemTotal.toLocaleString('en-IN')} (₹${unitDeposit} each)</p>
              <div class="cart-item__ctrls">
                <button class="cart-qty-btn" type="button" data-action="dec" data-id="${item.id}" aria-label="Decrease quantity">&minus;</button>
                <span class="cart-qty-val" aria-label="Quantity ${item.qty}">${item.qty}</span>
                <button class="cart-qty-btn" type="button" data-action="inc" data-id="${item.id}" aria-label="Increase quantity">&plus;</button>
              </div>
            </div>
            <button class="cart-item__remove" type="button" data-action="remove" data-id="${item.id}">Remove</button>
          </div>
        `;
      }).join('');
    }
  };

  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      updateCartUI();
    }
  });

  const cartToast = document.getElementById('cartToast');
  const cartToastMsg = document.getElementById('cartToastMsg');
  const cartToastViewBtn = document.getElementById('cartToastViewBtn');
  let toastTimer = null;

  const showCartToast = (message) => {
    if (!cartToast) return;
    if (cartToastMsg) cartToastMsg.textContent = message;
    cartToast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      cartToast.classList.remove('is-visible');
    }, 3200);
  };

  cartToastViewBtn?.addEventListener('click', () => {
    cartToast?.classList.remove('is-visible');
    setCartOpen(true);
  });

  // Add to cart & View in 3D delegation
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-action="add-to-cart"]');
    if (addBtn) {
      const id = addBtn.dataset.id;
      const name = addBtn.dataset.name;
      const desc = addBtn.dataset.desc;
      const cart = getCart();
      const existing = cart.find((i) => i.id === id);
      if (existing) {
        existing.qty = Math.min(existing.qty + 1, 99);
      } else {
        cart.push({ id, name, desc, qty: 1 });
      }
      saveCart(cart);

      // Tactile visual feedback on the button without reverting state
      addBtn.classList.remove('is-pulse');
      void addBtn.offsetWidth;
      addBtn.classList.add('is-pulse');
      setTimeout(() => addBtn.classList.remove('is-pulse'), 250);

      // Bump animation on header cart icon
      if (cartToggle) {
        cartToggle.classList.add('is-bumped');
        setTimeout(() => cartToggle.classList.remove('is-bumped'), 400);
      }

      // Display subtle success notification
      showCartToast(`${name} added to cart`);
      return;
    }

    const view3dBtn = e.target.closest('[data-action="view-3d"]');
    if (view3dBtn) {
      const targetModel = view3dBtn.dataset.model;
      if (active3DView && active3DView.setModel(targetModel)) {
        const switcher = document.querySelector('.stage-switch');
        const caption = document.getElementById('stageCaption');
        if (switcher) {
          const buttons = switcher.querySelectorAll('button');
          buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.model === targetModel)));
        }
        if (caption) {
          caption.textContent = targetModel === 'tv'
            ? 'W8 TV: HDMI stick that turns any smart TV into a computer.'
            : 'W8 USB: One-time installation of W8 OS on any PC.';
        }
      }
      const hero = document.getElementById('hero');
      hero?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Cart item increment, decrement, and removal
  if (cartDrawerBody) {
    cartDrawerBody.addEventListener('click', (e) => {
      const act = e.target.closest('[data-action]');
      if (!act) return;
      const id = act.dataset.id;
      const action = act.dataset.action;
      const cart = getCart();
      const item = cart.find((i) => i.id === id);
      if (!item) return;

      if (action === 'inc') {
        item.qty = Math.min(item.qty + 1, 99);
        saveCart(cart);
      } else if (action === 'dec') {
        if (item.qty > 1) {
          item.qty -= 1;
          saveCart(cart);
        } else {
          saveCart(cart.filter((i) => i.id !== id));
        }
      } else if (action === 'remove') {
        saveCart(cart.filter((i) => i.id !== id));
      }
    });
  }

  cartToggle?.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = cartDrawer?.classList.contains('is-open');
    setCartOpen(!isOpen);
  });
  cartClose?.addEventListener('click', (e) => {
    e.preventDefault();
    setCartOpen(false);
  });
  cartBackdrop?.addEventListener('click', (e) => {
    e.preventDefault();
    setCartOpen(false);
  });

  // ---------- Checkout & Razorpay Payment Gateway ----------
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutBackdrop = document.getElementById('checkoutBackdrop');
  const checkoutClose = document.getElementById('checkoutClose');
  const cancelOrderBtn = document.getElementById('cancelOrderBtn');
  const checkoutSummaryList = document.getElementById('checkoutSummaryList');
  const checkoutForm = document.getElementById('checkoutForm');
  const checkoutConfirmedBox = document.getElementById('checkoutConfirmedBox');
  const orderReceiptDetails = document.getElementById('orderReceiptDetails');
  const submitOrderBtn = document.getElementById('submitOrderBtn');
  const trackConfirmedOrderBtn = document.getElementById('trackConfirmedOrderBtn');
  const closeConfirmedModalBtn = document.getElementById('closeConfirmedModalBtn');

  let lastVerifiedOrder = null;

  const setCheckoutOpen = (open) => {
    if (!checkoutModal) return;
    checkoutModal.hidden = !open;
    if (checkoutBackdrop) checkoutBackdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      if (checkoutConfirmedBox) checkoutConfirmedBox.hidden = true;
      if (checkoutForm) {
        checkoutForm.hidden = false;
        if (submitOrderBtn) {
          submitOrderBtn.disabled = false;
          submitOrderBtn.textContent = 'Proceed to Razorpay Payment';
        }
      }
      renderCheckoutSummary();
      const firstInput = checkoutModal.querySelector('input');
      firstInput?.focus();
    }
  };

  const renderCheckoutSummary = () => {
    if (!checkoutSummaryList) return;
    const cart = getCart();
    if (cart.length === 0) {
      checkoutSummaryList.innerHTML = '<p class="muted">No items in cart.</p>';
      return;
    }
    const subtotal = cart.reduce((sum, item) => sum + (CATALOG_DEPOSITS[item.id] || 0) * item.qty, 0);
    checkoutSummaryList.innerHTML = `
      <h3 class="h3" style="font-size: 1.15rem; margin-bottom: 8px;">Hardware Allocation Summary</h3>
      <ul style="display: grid; gap: 8px;">
        ${cart.map((item) => {
          const deposit = CATALOG_DEPOSITS[item.id] || 0;
          return `
            <li style="display: flex; justify-content: space-between; font-size: 0.98rem;">
              <span><strong>${item.name}</strong> &times; ${item.qty}</span>
              <span style="font-weight: 700; color: var(--ink);">&#8377;${(deposit * item.qty).toLocaleString('en-IN')}</span>
            </li>
          `;
        }).join('')}
      </ul>
      <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line-light); display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 700;">
        <span>Total Reservation Deposit:</span>
        <span style="color: var(--red-text);">&#8377;${subtotal.toLocaleString('en-IN')}</span>
      </div>
      <p style="margin-top: 6px; font-size: 0.85rem; color: var(--mute-light);">Fully deductible upon commercial launch in India. Balance payable upon delivery.</p>
    `;
  };

  proceedToCheckoutBtn?.addEventListener('click', () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  });

  checkoutClose?.addEventListener('click', () => setCheckoutOpen(false));
  cancelOrderBtn?.addEventListener('click', () => {
    setCheckoutOpen(false);
    setCartOpen(true);
  });
  checkoutBackdrop?.addEventListener('click', () => setCheckoutOpen(false));

  function showConfirmedOrder(order) {
    lastVerifiedOrder = order;
    if (checkoutForm) checkoutForm.hidden = true;
    if (checkoutConfirmedBox) checkoutConfirmedBox.hidden = false;
    if (orderReceiptDetails) {
      orderReceiptDetails.innerHTML = `
        <dl>
          <dt>Order Ref:</dt>
          <dd><strong style="font-family: monospace; font-size: 1.05rem;">${order.orderRef}</strong></dd>
          <dt>Status:</dt>
          <dd><span class="tag tag--red">${order.status.toUpperCase()}</span></dd>
          <dt>Razorpay ID:</dt>
          <dd>${order.payment?.razorpayPaymentId || 'N/A'}</dd>
          <dt>Customer:</dt>
          <dd>${order.customer.name} (${order.customer.email})</dd>
          <dt>Destination:</dt>
          <dd>${order.customer.city}, ${order.customer.region}</dd>
          <dt>Amount Paid:</dt>
          <dd>&#8377;${order.pricing.totalInINR.toLocaleString('en-IN')}</dd>
          <dt>Dispatch Note:</dt>
          <dd>${order.tracking?.estimatedDispatch || 'Q4 2026 Batch'}</dd>
        </dl>
      `;
    }
  }

  // Handle Checkout Form submission and trigger Razorpay Checkout
  if (checkoutForm) {
    const coFields = ['name', 'email', 'phone', 'address', 'city', 'postal', 'region'];
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cart = getCart();
      if (cart.length === 0) {
        alert('Your cart is empty. Please add items before checkout.');
        return;
      }

      const data = Object.fromEntries(new FormData(checkoutForm));
      const errors = validateCheckout(data);
      let firstBad = null;

      coFields.forEach((field) => {
        const input = document.getElementById(`co-${field}`);
        const slot = document.getElementById(`err-co-${field}`);
        if (!input || !slot) return;
        slot.textContent = errors[field] || '';
        if (errors[field]) {
          input.setAttribute('aria-invalid', 'true');
          firstBad = firstBad || input;
        } else {
          input.removeAttribute('aria-invalid');
        }
      });

      if (firstBad) {
        firstBad.focus();
        return;
      }

      if (submitOrderBtn) {
        submitOrderBtn.disabled = true;
        submitOrderBtn.textContent = 'Initiating Secure Razorpay Order...';
      }

      try {
        // Step 1: Create verified Razorpay order on our server
        const createOrderRes = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: data,
            items: cart.map((i) => ({ id: i.id, qty: i.qty }))
          })
        });

        if (!createOrderRes.ok) {
          const errData = await createOrderRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to create order on server.');
        }

        const serverOrder = await createOrderRes.json();

        // Step 2: Open Razorpay Checkout modal
        if (typeof window.Razorpay === 'function') {
          const rzpOptions = {
            key: serverOrder.keyId || 'rzp_test_placeholder',
            amount: serverOrder.amountInPaise,
            currency: serverOrder.currency || 'INR',
            name: 'WINGS8',
            description: 'Launch Reservation Allocation',
            image: 'assets/slide_1_p1_i3.png',
            order_id: serverOrder.razorpayOrderId,
            prefill: {
              name: serverOrder.customer.name,
              email: serverOrder.customer.email,
              contact: serverOrder.customer.phone
            },
            notes: {
              orderRef: serverOrder.orderRef
            },
            theme: {
              color: '#e0161c'
            },
            handler: async function (response) {
              // Payment completed via Razorpay widget. Step 3: Verify HMAC signature server-side!
              if (submitOrderBtn) submitOrderBtn.textContent = 'Verifying Payment Cryptography...';
              try {
                const verifyRes = await fetch('/api/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderRef: serverOrder.orderRef,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                    paymentDetails: {
                      method: 'razorpay_checkout'
                    }
                  })
                });

                const verifyData = await verifyRes.json();
                if (!verifyRes.ok || !verifyData.ok) {
                  throw new Error(verifyData.error || 'Cryptographic payment verification failed.');
                }

                // Clear cart on genuine verified success
                saveCart([]);
                checkoutForm.reset();
                showConfirmedOrder(verifyData.order);
              } catch (verifyErr) {
                alert(`Payment verification error: ${verifyErr.message}`);
                if (submitOrderBtn) {
                  submitOrderBtn.disabled = false;
                  submitOrderBtn.textContent = 'Retry Payment Verification';
                }
              }
            },
            modal: {
              ondismiss: function () {
                if (submitOrderBtn) {
                  submitOrderBtn.disabled = false;
                  submitOrderBtn.textContent = 'Proceed to Razorpay Payment';
                }
              }
            }
          };

          const rzp = new window.Razorpay(rzpOptions);
          rzp.on('payment.failed', function (resp) {
            alert(`Payment failed: ${resp.error.description || 'Transaction cancelled by user or bank'}`);
            if (submitOrderBtn) {
              submitOrderBtn.disabled = false;
              submitOrderBtn.textContent = 'Proceed to Razorpay Payment';
            }
          });
          rzp.open();
        } else {
          // Fallback simulation when offline or script not loaded
          const simulateSignature = 'sim_sig_' + Array.from({ length: 56 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
          const simPayId = 'pay_sim_' + Date.now();
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderRef: serverOrder.orderRef,
              razorpayOrderId: serverOrder.razorpayOrderId,
              razorpayPaymentId: simPayId,
              razorpaySignature: simulateSignature
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.ok) {
            saveCart([]);
            checkoutForm.reset();
            showConfirmedOrder(verifyData.order);
          }
        }
      } catch (err) {
        alert(`Checkout Error: ${err.message}`);
        if (submitOrderBtn) {
          submitOrderBtn.disabled = false;
          submitOrderBtn.textContent = 'Proceed to Razorpay Payment';
        }
      }
    });
  }

  // Confirmed Modal Action handlers
  trackConfirmedOrderBtn?.addEventListener('click', () => {
    setCheckoutOpen(false);
    if (lastVerifiedOrder) {
      openOrderTrackerWithRef(lastVerifiedOrder.orderRef, lastVerifiedOrder.customer.email);
    }
  });
  closeConfirmedModalBtn?.addEventListener('click', () => setCheckoutOpen(false));

  // ---------- Order Tracking Feature ----------
  const trackModal = document.getElementById('trackModal');
  const trackBackdrop = document.getElementById('trackBackdrop');
  const trackCloseBtn = document.getElementById('trackCloseBtn');
  const openTrackOrderBtn = document.getElementById('openTrackOrderBtn');
  const footTrackOrderLink = document.getElementById('footTrackOrderLink');
  const trackForm = document.getElementById('trackForm');
  const trackOrderRefInput = document.getElementById('trackOrderRef');
  const trackEmailInput = document.getElementById('trackEmail');
  const trackErrorMsg = document.getElementById('trackErrorMsg');
  const trackResultContainer = document.getElementById('trackResultContainer');
  const trackLookupBtn = document.getElementById('trackLookupBtn');

  const setTrackOpen = (open) => {
    if (!trackModal) return;
    trackModal.hidden = !open;
    if (trackBackdrop) trackBackdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      if (trackErrorMsg) trackErrorMsg.textContent = '';
      trackOrderRefInput?.focus();
    }
  };

  openTrackOrderBtn?.addEventListener('click', () => setTrackOpen(true));
  footTrackOrderLink?.addEventListener('click', (e) => {
    e.preventDefault();
    setTrackOpen(true);
  });
  trackCloseBtn?.addEventListener('click', () => setTrackOpen(false));
  trackBackdrop?.addEventListener('click', () => setTrackOpen(false));

  async function openOrderTrackerWithRef(orderRef, email) {
    setTrackOpen(true);
    if (trackOrderRefInput) trackOrderRefInput.value = orderRef;
    if (trackEmailInput) trackEmailInput.value = email || '';
    if (trackForm) {
      await performOrderLookup(orderRef, email);
    }
  }

  async function performOrderLookup(orderRef, email) {
    if (!orderRef) return;
    if (trackErrorMsg) trackErrorMsg.textContent = '';
    if (trackLookupBtn) {
      trackLookupBtn.disabled = true;
      trackLookupBtn.textContent = 'Searching...';
    }

    try {
      const url = `/api/order-status?orderRef=${encodeURIComponent(orderRef.trim())}` + (email ? `&email=${encodeURIComponent(email.trim())}` : '');
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Order not found with provided reference.');
      }

      renderTrackingResult(data.order);
    } catch (err) {
      if (trackErrorMsg) trackErrorMsg.textContent = err.message;
      if (trackResultContainer) trackResultContainer.hidden = true;
    } finally {
      if (trackLookupBtn) {
        trackLookupBtn.disabled = false;
        trackLookupBtn.textContent = 'Lookup';
      }
    }
  }

  function renderTrackingResult(order) {
    if (!trackResultContainer) return;
    trackResultContainer.hidden = false;

    const stages = [
      { key: 'placed', label: 'Order Placed' },
      { key: 'paid', label: 'Payment Verified' },
      { key: 'processing', label: 'Allocation & Build' },
      { key: 'shipped', label: 'Dispatched' },
      { key: 'delivered', label: 'Delivered' }
    ];

    let currentStageIdx = 0;
    if (order.status === 'paid') currentStageIdx = 1;
    else if (order.status === 'processing') currentStageIdx = 2;
    else if (order.status === 'shipped') currentStageIdx = 3;
    else if (order.status === 'delivered') currentStageIdx = 4;

    trackResultContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px;">
        <h4 style="font-size: 1.25rem;">Order <code>${order.orderRef}</code></h4>
        <span class="tag tag--red">${order.status.toUpperCase()}</span>
      </div>

      <div class="track-timeline">
        ${stages.map((st, i) => `
          <div class="track-step ${i <= currentStageIdx ? 'is-done' : ''} ${i === currentStageIdx ? 'is-current' : ''}">
            <div class="track-step__dot"></div>
            <span>${st.label}</span>
          </div>
        `).join('')}
      </div>

      <div style="background: var(--paper); border: 1px solid var(--line-light); border-radius: var(--radius); padding: 16px; margin-top: 16px;">
        <h5 style="font-size: 1rem; margin-bottom: 6px;">Status Details</h5>
        <p style="font-size: 0.95rem; color: #3a3a40;">${order.tracking?.notes || 'Hardware allocation locked for Q4 2026 rollout in India.'}</p>
        <p style="font-size: 0.85rem; color: var(--mute-light); margin-top: 6px;">Estimated Dispatch: <strong>${order.tracking?.estimatedDispatch || 'Q4 2026 Batch'}</strong></p>
      </div>

      <div style="margin-top: 14px; font-size: 0.9rem;">
        <strong>Items Reserved:</strong>
        <ul style="margin-top: 4px; padding-left: 18px; list-style: disc;">
          ${order.items.map((it) => `<li>${it.name} &times; ${it.qty} (Deposit Paid: &#8377;${it.itemTotalInINR.toLocaleString('en-IN')})</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (trackForm) {
    trackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const orderRef = trackOrderRefInput?.value;
      const email = trackEmailInput?.value;
      await performOrderLookup(orderRef, email);
    });
  }

  // ---------- Become a Distributor Modal ----------
  const distributorModal = document.getElementById('distributorModal');
  const distributorBackdrop = document.getElementById('distributorBackdrop');
  const distributorCloseBtn = document.getElementById('distributorCloseBtn');
  const distributorLink = document.getElementById('distributorLink');

  const setDistributorOpen = (open) => {
    if (!distributorModal) return;
    distributorModal.hidden = !open;
    if (distributorBackdrop) distributorBackdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      distributorCloseBtn?.focus();
    } else {
      distributorLink?.focus();
    }
  };

  distributorLink?.addEventListener('click', (e) => {
    e.preventDefault();
    setDistributorOpen(true);
  });
  distributorCloseBtn?.addEventListener('click', () => setDistributorOpen(false));
  distributorBackdrop?.addEventListener('click', () => setDistributorOpen(false));
  distributorModal?.addEventListener('click', (e) => {
    if (e.target === distributorModal) setDistributorOpen(false);
  });

  // Global Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (distributorModal && !distributorModal.hidden) setDistributorOpen(false);
      else if (trackModal && !trackModal.hidden) setTrackOpen(false);
      else if (checkoutModal && !checkoutModal.hidden) setCheckoutOpen(false);
      else if (cartDrawer && cartDrawer.classList.contains('is-open')) setCartOpen(false);
    }
  });

  // Initial UI sync
  updateCartUI();
}
