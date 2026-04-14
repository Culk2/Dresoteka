import React, { useEffect, useState } from 'react';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { sanityClient } from './lib/sanityClient';
import { urlFor } from './lib/sanityImage';

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
  const hasImage = Boolean(product.image?.asset?._ref || product.image?.asset?._id);

  if (hasImage) {
    const imageUrl = urlFor(product.image).width(900).height(1100).fit('crop').url();

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

function getProductSlugFromPath(pathname, baseUrl) {
  const productPrefix = `${baseUrl}/dres/`;

  if (!pathname.startsWith(productPrefix)) {
    return '';
  }

  return decodeURIComponent(pathname.slice(productPrefix.length)).replace(/\/$/, '');
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

function ProductDetailPage({ product, baseUrl, isLoading }) {
  const backHref = `${baseUrl || ''}/#shop`;

  if (isLoading) {
    return (
      <main className="content-shell">
        <section className="detail-shell">
          <a className="back-link" href={backHref}>
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
          <a className="back-link" href={backHref}>
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
        <a className="back-link" href={backHref}>
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
          </div>
        </div>
      </section>
    </main>
  );
}

function App() {
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const studioPath = `${baseUrl}/studio`;
  const selectedProductSlug = getProductSlugFromPath(window.location.pathname, baseUrl);
  const isProductPage = Boolean(selectedProductSlug);
  const [products, setProducts] = useState(fallbackProducts);
  const [isSanityLoading, setIsSanityLoading] = useState(true);
  const [sanityError, setSanityError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    club: '',
    league: '',
    version: '',
    size: '',
    price: '',
  });
  const filterGroups = getFilterGroups(products);
  const filteredProducts = products.filter((product) => {
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
  const selectedProduct = isProductPage
    ? products.find((product) => getProductSlug(product) === selectedProductSlug)
    : null;

  useEffect(() => {
    let isActive = true;

    async function loadProducts() {
      try {
        if (isProductPage) {
          const sanityProduct = await sanityClient.fetch(productDetailQuery, { slug: selectedProductSlug });

          if (!isActive) {
            return;
          }

          if (sanityProduct) {
            setProducts([sanityProduct]);
          } else {
            const fallbackProduct = fallbackProducts.find((product) => getProductSlug(product) === selectedProductSlug);

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
  }, [isProductPage, selectedProductSlug]);

  function handleFilterChange(key, value) {
    setSelectedFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="page-shell">
      <nav className="mainnav">
        <div className="mainnav-inner">
          <div className="logo-lockup">
            <img className="logo-image" src="/logo.png" alt="Dresoteka" />
          </div>

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
            <button className="icon-button" type="button" aria-label="Kosarica">
              Bag
            </button>
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
          Shop All New Arrivals <a href={isProductPage ? `${baseUrl || ''}/#shop` : '#shop'}>Shop</a>
        </p>
        <span>&gt;</span>
      </section>

      {isProductPage ? (
        <ProductDetailPage product={selectedProduct} baseUrl={baseUrl} isLoading={isSanityLoading} />
      ) : (
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
                <article className="product-card" key={product._id || product.name}>
                  <a className="product-link" href={getProductPath(baseUrl, getProductSlug(product))}>
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
                </article>
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
      )}
    </div>
  );
}

export default App;
