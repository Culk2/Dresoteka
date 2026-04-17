import React, { useEffect, useMemo, useState } from 'react';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { sanityClient } from './lib/sanityClient';
import { urlFor } from './lib/sanityImage';

const CART_STORAGE_KEY = 'dresoteka-cart';

const fallbackProducts = [
  {
    _id: 'fallback-france',
    slug: 'francija-2026-home-jersey',
    club: 'Francija',
    league: 'International',
    size: 'M',
    version: 'authentic',
    name: 'Francija 2026 Home Jersey',
    description: 'Tekmovalna verzija dresa',
    price: 129.99,
    imageClass: 'shirt-blue',
  },
  {
    _id: 'fallback-england',
    slug: 'england-2026-away-jersey',
    club: 'England',
    league: 'International',
    size: 'L',
    version: 'fan',
    name: 'England 2026 Away Jersey',
    description: 'Navijaska verzija dresa',
    price: 99.99,
    imageClass: 'shirt-white',
  },
  {
    _id: 'fallback-brazil',
    slug: 'brazil-2026-match-away',
    club: 'Brazil',
    league: 'International',
    size: 'S',
    version: 'authentic',
    name: 'Brazil 2026 Match Away',
    description: 'Avtenticen nogometni dres',
    price: 139.99,
    imageClass: 'shirt-navy',
  },
  {
    _id: 'fallback-barcelona',
    slug: 'barcelona-heritage-jersey',
    club: 'Barcelona',
    league: 'La Liga',
    size: 'XL',
    version: 'fan',
    name: 'Barcelona Heritage Jersey',
    description: 'Retro navijaski kos',
    price: 109.99,
    imageClass: 'shirt-burgundy',
  },
  {
    _id: 'fallback-milan',
    slug: 'ac-milan-fourth-kit',
    club: 'AC Milan',
    league: 'Serie A',
    size: 'L',
    version: 'authentic',
    name: 'AC Milan Fourth Kit',
    description: 'Streetwear kolekcija',
    price: 119.99,
    imageClass: 'shirt-black',
  },
  {
    _id: 'fallback-slovenija',
    slug: 'slovenija-stadium-jersey',
    club: 'Slovenija',
    league: 'International',
    size: 'M',
    version: 'fan',
    name: 'Slovenija Stadium Jersey',
    description: 'Lahka supporter izdaja',
    price: 89.99,
    imageClass: 'shirt-mint',
  },
];

const productQuery = `*[_type == "product"] | order(_createdAt desc)[0...12]{
  _id,
  "slug": slug.current,
  "name": coalesce(title, club->name),
  "club": club->name,
  size,
  version,
  "league": league->title,
  description,
  price,
  image
}`;

const productDetailQuery = `*[_type == "product" && slug.current == $slug][0]{
  _id,
  "slug": slug.current,
  "name": coalesce(title, club->name),
  "club": club->name,
  size,
  version,
  "league": league->title,
  description,
  price,
  image
}`;

function formatPrice(value) {
  if (typeof value !== 'number') {
    return null;
  }

  return new Intl.NumberFormat('sl-SI', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatVersion(value) {
  if (!value) {
    return null;
  }

  const labelMap = {
    authentic: 'Authentic',
    fan: 'Fan',
  };

  return labelMap[value] || value;
}

function slugifyProduct(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getProductSlug(product) {
  return product.slug || slugifyProduct(product.name || product.club || product._id);
}

function getProductPath(baseUrl, slug) {
  return `${baseUrl}/dres/${slug}`;
}

function getCartPath(baseUrl) {
  return `${baseUrl}/kosarica`;
}

function getCheckoutPath(baseUrl) {
  return `${baseUrl}/checkout`;
}

function getCheckoutStatus(search) {
  const params = new URLSearchParams(search);

  if (params.get('checkout') === 'success') {
    return 'success';
  }

  if (params.get('checkout') === 'cancel') {
    return 'cancel';
  }

  return '';
}

function getImageUrl(product) {
  const hasImage = Boolean(product.image?.asset?._ref || product.image?.asset?._id);

  if (!hasImage) {
    return '';
  }

  return urlFor(product.image).width(900).height(1100).fit('crop').url();
}

function normalizeCartItem(product) {
  return {
    _id: product._id || getProductSlug(product),
    slug: getProductSlug(product),
    name: product.name || product.club || 'Izdelek',
    club: product.club || '',
    league: product.league || '',
    size: product.size || '',
    version: product.version || '',
    description: product.description || '',
    price: typeof product.price === 'number' ? product.price : 0,
    image: product.image || null,
    imageClass: product.imageClass || '',
    quantity: 1,
  };
}

function readCart() {
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && item.quantity > 0)
      .map((item) => ({
        ...item,
        slug: slugifyProduct(item.slug || item.name || item.club || ''),
      }))
      .filter((item) => typeof item.slug === 'string' && item.slug);
  } catch {
    return [];
  }
}

function writeCart(items) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function parseRoute(pathname, baseUrl) {
  const normalizedBase = baseUrl || '';
  const cartPath = getCartPath(normalizedBase);
  const checkoutPath = getCheckoutPath(normalizedBase);
  const productPrefix = `${normalizedBase}/dres/`;

  if (pathname === cartPath) {
    return { kind: 'cart' };
  }

  if (pathname === checkoutPath) {
    return { kind: 'checkout' };
  }

  if (pathname.startsWith(productPrefix)) {
    return {
      kind: 'product',
      slug: decodeURIComponent(pathname.slice(productPrefix.length)).replace(/\/$/, ''),
    };
  }

  return { kind: 'catalog' };
}

function formatSanityError(error) {
  const message = typeof error?.message === 'string' ? error.message : '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('cors')) {
    return 'Sanity ni povezan. Dodaj svoj Vercel URL v Sanity CORS Origins.';
  }

  if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
    return 'Sanity ni povezan. Dataset je verjetno privaten in frontend nima dovoljenja za branje.';
  }

  if (lowerMessage.includes('project') || lowerMessage.includes('dataset')) {
    return 'Sanity ni povezan. Preveri `VITE_SANITY_PROJECT_ID` in `VITE_SANITY_DATASET` na Vercelu.';
  }

  if (message) {
    return `Sanity ni povezan: ${message}`;
  }

  return 'Sanity trenutno ni povezan, zato je prikazan demo katalog.';
}

function getPriceOptions(prices) {
  if (prices.length === 0) {
    return [];
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (minPrice === maxPrice) {
    const label = formatPrice(minPrice);

    return [{ label, value: `${minPrice}-${maxPrice}` }];
  }

  const step = Math.ceil((maxPrice - minPrice) / 3);
  const ranges = [
    { min: minPrice, max: minPrice + step, label: `Do ${formatPrice(minPrice + step)}` },
    { min: minPrice + step, max: minPrice + step * 2, label: `${formatPrice(minPrice + step)} - ${formatPrice(minPrice + step * 2)}` },
    { min: minPrice + step * 2, max: maxPrice, label: `Nad ${formatPrice(minPrice + step * 2)}` },
  ];

  return ranges
    .filter((range, index) => index === ranges.length - 1 || range.min < range.max)
    .map((range) => ({
      label: range.label,
      value: `${range.min}-${range.max}`,
    }));
}

function getFilterGroups(products) {
  const clubs = [...new Set(products.map((product) => product.club).filter(Boolean))];
  const leagues = [...new Set(products.map((product) => product.league).filter(Boolean))];
  const versions = [...new Set(products.map((product) => formatVersion(product.version)).filter(Boolean))];
  const sizes = [...new Set(products.map((product) => product.size).filter(Boolean))];
  const prices = products
    .map((product) => product.price)
    .filter((price) => typeof price === 'number');

  const groups = [
    { key: 'club', label: 'Klub', options: clubs },
    { key: 'league', label: 'Liga', options: leagues },
    { key: 'version', label: 'Verzija', options: versions },
    { key: 'size', label: 'Velikost', options: sizes },
  ];

  if (prices.length > 0) {
    groups.push({
      key: 'price',
      label: 'Cena',
      options: getPriceOptions(prices),
    });
  }

  return groups.filter((group) => group.options.length > 0);
}

function matchesPriceFilter(product, value) {
  if (!value || typeof product.price !== 'number') {
    return true;
  }

  const [min, max] = value.split('-').map(Number);

  if (Number.isNaN(min) || Number.isNaN(max)) {
    return true;
  }

  return product.price >= min && product.price <= max;
}

function getCartTotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

function reconcileCartItems(cartItems, products) {
  if (!Array.isArray(products) || products.length === 0) {
    return cartItems;
  }

  const productsBySlug = new Map(
    products.map((product) => [slugifyProduct(getProductSlug(product)), product]),
  );

  return cartItems.reduce((nextItems, item) => {
    const itemSlug = slugifyProduct(item.slug || item.name || item.club || '');
    const matchedProduct =
      productsBySlug.get(itemSlug) ||
      products.find((product) => {
        const productName = slugifyProduct(product.name || '');
        const productClub = slugifyProduct(product.club || '');

        return itemSlug === productName || itemSlug === productClub;
      });

    if (!matchedProduct) {
      return nextItems;
    }

    const normalizedItem = {
      ...normalizeCartItem(matchedProduct),
      quantity: item.quantity,
    };

    nextItems.push(normalizedItem);
    return nextItems;
  }, []);
}

function AuthControls() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <Show when="signed-out">
        <div className="auth-actions">
          <SignInButton mode="modal">
            <button className="auth-button auth-button-secondary" type="button">
              Prijava
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="auth-button" type="button">
              Registracija
            </button>
          </SignUpButton>
        </div>
      </Show>
      <Show when="signed-in">
        <div className="user-actions">
          <UserButton />
        </div>
      </Show>
    </>
  );
}

function ProductVisual({ product, index }) {
  const imageUrl = getImageUrl(product);

  if (imageUrl) {
    return (
      <div className="product-visual product-visual-image">
        <img src={imageUrl} alt={product.name} />
      </div>
    );
  }

  const fallbackClass = fallbackProducts[index % fallbackProducts.length].imageClass;

  return (
    <div className={`product-visual ${product.imageClass || fallbackClass}`}>
      <div className="shirt-shape">
        <div className="shirt-neck" />
        <div className="shirt-body">
          <span>DRES</span>
          <strong>26</strong>
        </div>
      </div>
    </div>
  );
}

function CartButton({ count, href, onClick }) {
  return (
    <a className="icon-button cart-button" href={href} onClick={onClick} aria-label={`Kosarica, ${count} izdelkov`}>
      <span>Bag</span>
      {count > 0 ? <strong>{count}</strong> : null}
    </a>
  );
}

function ProductCard({ product, index, baseUrl, onAddToCart, onNavigate }) {
  const productPath = getProductPath(baseUrl, getProductSlug(product));

  return (
    <article className="product-card">
      <a
        className="product-link"
        href={productPath}
        onClick={(event) => {
          event.preventDefault();
          onNavigate(productPath);
        }}
      >
        <ProductVisual product={product} index={index} />

        <div className="product-copy">
          <p className="tag">{product.league || 'Liga'}</p>
          <h2>{product.name || product.club}</h2>
          <p className="description">{product.description || 'Opis dodaj v Sanity Studio.'}</p>
          <p className="product-meta">
            {product.club ? <span>{product.club}</span> : null}
            {product.league ? <span>{product.league}</span> : null}
            {product.version ? <span>{formatVersion(product.version)}</span> : null}
            {product.size ? <span>{product.size}</span> : null}
          </p>
          <p className="price">{formatPrice(product.price) || 'Cena v pripravi'}</p>
        </div>
      </a>

      <button className="primary-button product-action" type="button" onClick={() => onAddToCart(product)}>
        Dodaj v kosarico
      </button>
    </article>
  );
}

function ProductDetailPage({ product, baseUrl, isLoading, onAddToCart, onNavigate }) {
  const backHref = `${baseUrl || ''}/#shop`;

  if (isLoading) {
    return (
      <main className="content-shell">
        <section className="detail-shell">
          <a
            className="back-link"
            href={backHref}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(baseUrl || '/');
            }}
          >
            Nazaj na katalog
          </a>
          <div className="empty-state">Nalagam izbrani dres...</div>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="content-shell">
        <section className="detail-shell">
          <a
            className="back-link"
            href={backHref}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(baseUrl || '/');
            }}
          >
            Nazaj na katalog
          </a>
          <div className="empty-state">Tega dresa nismo nasli.</div>
        </section>
      </main>
    );
  }

  return (
    <main className="content-shell">
      <section className="detail-shell">
        <a
          className="back-link"
          href={backHref}
          onClick={(event) => {
            event.preventDefault();
            onNavigate(baseUrl || '/');
          }}
        >
          Nazaj na katalog
        </a>

        <div className="detail-layout">
          <div className="detail-media">
            <ProductVisual product={product} index={0} />
          </div>

          <div className="detail-copy">
            <p className="tag">{product.league || 'Liga'}</p>
            <h1 className="detail-title">{product.name || product.club}</h1>
            <p className="detail-subtitle">{product.club}</p>
            <p className="detail-price">{formatPrice(product.price) || 'Cena v pripravi'}</p>
            <p className="detail-description">{product.description || 'Opis dodaj v Sanity Studio.'}</p>

            <div className="detail-meta">
              {product.club ? <span>Klub: {product.club}</span> : null}
              {product.league ? <span>Liga: {product.league}</span> : null}
              {product.version ? <span>Verzija: {formatVersion(product.version)}</span> : null}
              {product.size ? <span>Velikost: {product.size}</span> : null}
            </div>

            <button className="primary-button detail-cta" type="button" onClick={() => onAddToCart(product)}>
              Dodaj v kosarico
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function CartPage({ cartItems, baseUrl, onNavigate, onUpdateQuantity, onRemoveItem }) {
  const total = getCartTotal(cartItems);
  const checkoutPath = getCheckoutPath(baseUrl);

  return (
    <main className="content-shell">
      <section className="page-intro">
        <p className="tag">Kosarica</p>
        <h1>Tvoja kosarica</h1>
        <p className="section-copy">Preglej izdelke, spremeni kolicino in nadaljuj na checkout.</p>
      </section>

      {cartItems.length === 0 ? (
        <section className="empty-panel">
          <p>Kosarica je prazna.</p>
          <button className="primary-button" type="button" onClick={() => onNavigate(baseUrl || '/')}>
            Nazaj v trgovino
          </button>
        </section>
      ) : (
        <section className="cart-layout">
          <div className="cart-items">
            {cartItems.map((item, index) => (
              <article className="cart-item" key={item.slug}>
                <div className="cart-item-visual">
                  <ProductVisual product={item} index={index} />
                </div>

                <div className="cart-item-copy">
                  <div>
                    <p className="tag">{item.league || 'Dres'}</p>
                    <h2>{item.name}</h2>
                    <p className="description">{item.club || item.description || 'Izbran izdelek.'}</p>
                    <p className="product-meta">
                      {item.size ? <span>Velikost {item.size}</span> : null}
                      {item.version ? <span>{formatVersion(item.version)}</span> : null}
                    </p>
                  </div>

                  <div className="cart-item-actions">
                    <div className="quantity-control">
                      <button type="button" onClick={() => onUpdateQuantity(item.slug, item.quantity - 1)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => onUpdateQuantity(item.slug, item.quantity + 1)}>
                        +
                      </button>
                    </div>

                    <strong className="cart-item-price">{formatPrice(item.price * item.quantity)}</strong>

                    <button className="text-button" type="button" onClick={() => onRemoveItem(item.slug)}>
                      Odstrani
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="summary-card">
            <h2>Povzetek</h2>
            <div className="summary-row">
              <span>Izdelki</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <div className="summary-row">
              <span>Dostava</span>
              <strong>Gratis</strong>
            </div>
            <div className="summary-row summary-row-total">
              <span>Skupaj</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <button className="primary-button" type="button" onClick={() => onNavigate(checkoutPath)}>
              Nadaljuj na checkout
            </button>
          </aside>
        </section>
      )}
    </main>
  );
}

function CheckoutPage({ cartItems, baseUrl, onNavigate, checkoutStatus }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    postalCode: '',
    city: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = getCartTotal(cartItems);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!formData.firstName.trim()) {
      nextErrors.firstName = 'Vpisi ime.';
    }

    if (!formData.lastName.trim()) {
      nextErrors.lastName = 'Vpisi priimek.';
    }

    if (!formData.address.trim()) {
      nextErrors.address = 'Vpisi naslov.';
    }

    if (!/^\d{4,6}$/.test(formData.postalCode.trim())) {
      nextErrors.postalCode = 'Vpisi veljavno posto.';
    }

    if (!formData.city.trim()) {
      nextErrors.city = 'Vpisi mesto.';
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: cartItems.map((item) => ({
            slug: slugifyProduct(item.slug || item.name || item.club || ''),
            quantity: item.quantity,
            name: item.name,
            club: item.club,
            description: item.description,
            price: item.price,
          })),
          customer: formData,
        }),
      });

      const responseText = await response.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            `API ni vrnil veljavnega JSON odgovora (status ${response.status}). ${responseText.slice(0, 180)}`,
          );
        }
      }

      if (!response.ok || !data.url) {
        const fallbackMessage = responseText
          ? `Stripe checkout ni bil ustvarjen (status ${response.status}). ${responseText.slice(0, 180)}`
          : `Stripe checkout ni bil ustvarjen (status ${response.status}).`;

        throw new Error(data.error || fallbackMessage);
      }

      window.location.assign(data.url);
    } catch (error) {
      setSubmitError(error.message || 'Prislo je do napake pri preusmeritvi na Stripe.');
      setIsSubmitting(false);
    }
  }

  if (checkoutStatus === 'success') {
    return (
      <main className="content-shell">
        <section className="success-panel">
          <p className="tag">Placilo uspelo</p>
          <h1>Hvala za nakup.</h1>
          <p>Narocilo je bilo uspesno oddano in kosarica je izpraznjena.</p>
          <button className="primary-button" type="button" onClick={() => onNavigate(baseUrl || '/')}>
            Nazaj na zacetek
          </button>
        </section>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="content-shell">
        <section className="empty-panel">
          <p>Checkout ni na voljo, ker je kosarica prazna.</p>
          <button className="primary-button" type="button" onClick={() => onNavigate(baseUrl || '/')}>
            Nazaj v trgovino
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="content-shell">
      <section className="page-intro">
        <p className="tag">Checkout</p>
        <h1>Zakljucek nakupa</h1>
        <p className="section-copy">Kupec vnese dostavne podatke, nato pa aplikacijo povezemo na varen karticni checkout.</p>
      </section>

      <section className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="checkout-card">
            <h2>Dostavni podatki</h2>
            <div className="form-grid">
              <label className="field">
                <span>Ime</span>
                <input name="firstName" value={formData.firstName} onChange={handleChange} />
                {errors.firstName ? <small>{errors.firstName}</small> : null}
              </label>

              <label className="field">
                <span>Priimek</span>
                <input name="lastName" value={formData.lastName} onChange={handleChange} />
                {errors.lastName ? <small>{errors.lastName}</small> : null}
              </label>

              <label className="field field-wide">
                <span>Naslov</span>
                <input name="address" value={formData.address} onChange={handleChange} />
                {errors.address ? <small>{errors.address}</small> : null}
              </label>

              <label className="field">
                <span>Posta</span>
                <input name="postalCode" value={formData.postalCode} onChange={handleChange} />
                {errors.postalCode ? <small>{errors.postalCode}</small> : null}
              </label>

              <label className="field">
                <span>Mesto</span>
                <input name="city" value={formData.city} onChange={handleChange} />
                {errors.city ? <small>{errors.city}</small> : null}
              </label>
            </div>
          </div>

          <div className="checkout-card">
            <h2>Placilo</h2>
            <p className="checkout-note">
              Ko kliknes oddaj narocilo, te aplikacija preusmeri na varen Stripe Checkout, kjer kupec vnese podatke
              kartice in zakljuci placilo.
            </p>
          </div>

          {checkoutStatus === 'cancel' ? <p className="form-status">Placilo je bilo preklicano. Poskusi znova.</p> : null}
          {submitError ? <p className="form-status form-status-error">{submitError}</p> : null}

          <button className="primary-button checkout-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Preusmerjam na Stripe...' : 'Oddaj narocilo'}
          </button>
        </form>

        <aside className="summary-card">
          <h2>Tvoje narocilo</h2>
          <div className="checkout-items">
            {cartItems.map((item) => (
              <div className="summary-row" key={item.slug}>
                <span>
                  {item.name} x {item.quantity}
                </span>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-row summary-row-total">
            <span>Skupaj</span>
            <strong>{formatPrice(total)}</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}

function App() {
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const studioPath = `${baseUrl}/studio`;
  const [pathname, setPathname] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
  const route = parseRoute(pathname, baseUrl);
  const checkoutStatus = getCheckoutStatus(search);
  const [products, setProducts] = useState(fallbackProducts);
  const [isSanityLoading, setIsSanityLoading] = useState(true);
  const [sanityError, setSanityError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState(() => readCart());
  const [selectedFilters, setSelectedFilters] = useState({
    club: '',
    league: '',
    version: '',
    size: '',
    price: '',
  });

  useEffect(() => {
    function handlePopstate() {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    }

    window.addEventListener('popstate', handlePopstate);

    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, []);

  useEffect(() => {
    writeCart(cartItems);
  }, [cartItems]);

  useEffect(() => {
    if (route.kind === 'product' || products.length === 0) {
      return;
    }

    setCartItems((current) => {
      const reconciled = reconcileCartItems(current, products);

      if (JSON.stringify(reconciled) === JSON.stringify(current)) {
        return current;
      }

      return reconciled;
    });
  }, [products, route.kind]);

  useEffect(() => {
    if (checkoutStatus === 'success') {
      setCartItems([]);
      onCheckoutComplete();
    }
  }, [checkoutStatus]);

  useEffect(() => {
    let isActive = true;
    setIsSanityLoading(true);

    async function loadProducts() {
      try {
        if (route.kind === 'product') {
          const sanityProduct = await sanityClient.fetch(productDetailQuery, { slug: route.slug });

          if (!isActive) {
            return;
          }

          if (sanityProduct) {
            setProducts([sanityProduct]);
          } else {
            const fallbackProduct = fallbackProducts.find((product) => getProductSlug(product) === route.slug);

            setProducts(fallbackProduct ? [fallbackProduct] : []);
          }

          return;
        }

        const sanityProducts = await sanityClient.fetch(productQuery);

        if (!isActive || !Array.isArray(sanityProducts) || sanityProducts.length === 0) {
          return;
        }

        setProducts(sanityProducts);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSanityError(formatSanityError(error));
      } finally {
        if (isActive) {
          setIsSanityLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isActive = false;
    };
  }, [route.kind, route.slug]);

  const filterGroups = useMemo(() => getFilterGroups(products), [products]);
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const formattedVersion = formatVersion(product.version);
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalizedQuery ||
        [product.name, product.club, product.league, product.description, formattedVersion, product.size]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return (
        matchesSearch &&
        (!selectedFilters.club || product.club === selectedFilters.club) &&
        (!selectedFilters.league || product.league === selectedFilters.league) &&
        (!selectedFilters.version || formattedVersion === selectedFilters.version) &&
        (!selectedFilters.size || product.size === selectedFilters.size) &&
        matchesPriceFilter(product, selectedFilters.price)
      );
    });
  }, [products, searchQuery, selectedFilters]);

  const selectedProduct =
    route.kind === 'product' ? products.find((product) => getProductSlug(product) === route.slug) : null;
  const cartCount = getCartCount(cartItems);

  function onCheckoutComplete() {
    const params = new URLSearchParams(window.location.search);

    if (!params.has('checkout')) {
      return;
    }

    params.delete('checkout');
    params.delete('session_id');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
    setSearch(nextSearch ? `?${nextSearch}` : '');
  }

  function navigate(path) {
    if (path === pathname && !window.location.search) {
      return;
    }

    window.history.pushState({}, '', path);
    setPathname(path);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFilterChange(key, value) {
    setSelectedFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleAddToCart(product) {
    const nextItem = normalizeCartItem(product);

    setCartItems((current) => {
      const existingItem = current.find((item) => item.slug === nextItem.slug);

      if (existingItem) {
        return current.map((item) =>
          item.slug === nextItem.slug ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, nextItem];
    });
  }

  function handleUpdateQuantity(slug, quantity) {
    if (quantity <= 0) {
      setCartItems((current) => current.filter((item) => item.slug !== slug));
      return;
    }

    setCartItems((current) =>
      current.map((item) => (item.slug === slug ? { ...item, quantity } : item)),
    );
  }

  function handleRemoveItem(slug) {
    setCartItems((current) => current.filter((item) => item.slug !== slug));
  }

  return (
    <div className="page-shell">
      <nav className="mainnav">
        <div className="mainnav-inner">
          <a
            className="logo-lockup"
            href={baseUrl || '/'}
            onClick={(event) => {
              event.preventDefault();
              navigate(baseUrl || '/');
            }}
          >
            <img className="logo-image" src="/logo.png" alt="Dresoteka" />
          </a>

          <div className="nav-tools">
            <input
              className="searchbox"
              type="search"
              placeholder="Isci drese"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button className="icon-button" type="button" aria-label="Priljubljeno">
              Fav
            </button>
            <CartButton count={cartCount} href={getCartPath(baseUrl)} onClick={(event) => {
              event.preventDefault();
              navigate(getCartPath(baseUrl));
            }} />
            <a className="studio-link" href={studioPath}>
              Studio
            </a>
            {hasClerk ? (
              <AuthControls />
            ) : (
              <div className="auth-hint">Dodaj Clerk key za prijavo in registracijo</div>
            )}
          </div>
        </div>
      </nav>

      <section className="announcement">
        <span>&lt;</span>
        <p>
          Shop All New Arrivals{' '}
          <a
            href={baseUrl || '/'}
            onClick={(event) => {
              event.preventDefault();
              navigate(baseUrl || '/');
            }}
          >
            Shop
          </a>
        </p>
        <span>&gt;</span>
      </section>

      {route.kind === 'product' ? (
        <ProductDetailPage
          product={selectedProduct}
          baseUrl={baseUrl}
          isLoading={isSanityLoading}
          onAddToCart={handleAddToCart}
          onNavigate={navigate}
        />
      ) : null}

      {route.kind === 'cart' ? (
        <CartPage
          cartItems={cartItems}
          baseUrl={baseUrl}
          onNavigate={navigate}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
        />
      ) : null}

      {route.kind === 'checkout' ? (
        <CheckoutPage
          cartItems={cartItems}
          baseUrl={baseUrl}
          onNavigate={navigate}
          checkoutStatus={checkoutStatus}
        />
      ) : null}

      {route.kind === 'catalog' ? (
        <main className="content-shell">
          <section className="catalog-layout">
            <aside className="sidebar">
              <div className="filter-list">
                {filterGroups.map((group) => (
                  <section className="filter-group" key={group.label}>
                    <label className="filter-label" htmlFor={`filter-${group.key}`}>
                      {group.label}
                    </label>
                    <div className="filter-select-wrap">
                      <select
                        className="filter-select"
                        id={`filter-${group.key}`}
                        value={selectedFilters[group.key]}
                        onChange={(event) => handleFilterChange(group.key, event.target.value)}
                      >
                        <option value="">Vse</option>
                        {group.options.map((option) => {
                          const optionValue = typeof option === 'string' ? option : option.value;
                          const optionLabel = typeof option === 'string' ? option : option.label;

                          return (
                            <option key={optionValue} value={optionValue}>
                              {optionLabel}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </section>
                ))}
              </div>
            </aside>

            <section className="product-grid" id="shop">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product._id || product.name}
                  product={product}
                  index={index}
                  baseUrl={baseUrl}
                  onAddToCart={handleAddToCart}
                  onNavigate={navigate}
                />
              ))}
              {filteredProducts.length === 0 ? (
                <p className="empty-state">Za izbrane filtre ni najdenih izdelkov.</p>
              ) : null}
            </section>
          </section>

          {isSanityLoading || sanityError ? (
            <section className="sanity-status">
              {isSanityLoading ? <p>Nalagam izdelke iz Sanity...</p> : null}
              {sanityError ? <p>{sanityError}</p> : null}
            </section>
          ) : null}
        </main>
      ) : null}
    </div>
  );
}

export default App;
