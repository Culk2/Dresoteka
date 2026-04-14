import React, { useEffect, useState } from 'react';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { sanityClient } from './lib/sanityClient';
import { urlFor } from './lib/sanityImage';

const sidebarLinks = [
  'Match dresi',
  'Retro dresi',
  'Trening majice',
  'Dolg rokav',
  'Brez rokavov',
  'Kompleti',
  'Lifestyle',
];

const filterGroups = ['Spol', 'Cena', 'Akcije', 'Velikost', 'Kolekcije'];

const fallbackProducts = [
  {
    _id: 'fallback-france',
    badge: 'Najbolj prodajano',
    name: 'Francija 2026 Home Jersey',
    description: 'Tekmovalna verzija dresa',
    price: 129.99,
    imageClass: 'shirt-blue',
  },
  {
    _id: 'fallback-england',
    badge: 'Novo',
    name: 'England 2026 Away Jersey',
    description: 'Navijaska verzija dresa',
    price: 99.99,
    imageClass: 'shirt-white',
  },
  {
    _id: 'fallback-brazil',
    badge: 'Reciklirani materiali',
    name: 'Brazil 2026 Match Away',
    description: 'Avtenticen nogometni dres',
    price: 139.99,
    imageClass: 'shirt-navy',
  },
  {
    _id: 'fallback-barcelona',
    badge: 'Omejena serija',
    name: 'Barcelona Heritage Jersey',
    description: 'Retro navijaski kos',
    price: 109.99,
    imageClass: 'shirt-burgundy',
  },
  {
    _id: 'fallback-milan',
    badge: 'Just In',
    name: 'AC Milan Fourth Kit',
    description: 'Streetwear kolekcija',
    price: 119.99,
    imageClass: 'shirt-black',
  },
  {
    _id: 'fallback-slovenija',
    badge: 'Samo online',
    name: 'Slovenija Stadium Jersey',
    description: 'Lahka supporter izdaja',
    price: 89.99,
    imageClass: 'shirt-mint',
  },
];

const productQuery = `*[_type == "product"] | order(_createdAt desc)[0...12]{
  _id,
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
          <span className="auth-status">Prijavljen uporabnik</span>
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

function App() {
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const studioPath = `${baseUrl}/studio`;
  const [products, setProducts] = useState(fallbackProducts);
  const [isSanityLoading, setIsSanityLoading] = useState(true);
  const [sanityError, setSanityError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadProducts() {
      try {
        const sanityProducts = await sanityClient.fetch(productQuery);

        if (!isActive || !Array.isArray(sanityProducts) || sanityProducts.length === 0) {
          return;
        }

        setProducts(sanityProducts);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSanityError('Sanity trenutno ni povezan, zato je prikazan demo katalog.');
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
  }, []);

  return (
    <div className="page-shell">
      <nav className="mainnav">
        <div className="mainnav-inner">
          <div className="logo-lockup">
            <span className="logo-word">Dresoteka</span>
          </div>

          <div className="nav-tools">
            <input className="searchbox" type="text" placeholder="Isci drese" />
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
          Shop All New Arrivals <a href="#shop">Shop</a>
        </p>
        <span>&gt;</span>
      </section>

      <main className="content-shell">
        <section className="heading-row">
          <div>
            <p className="eyebrow">Clothing / Tops &amp; Jerseys</p>
            <h1>T-Shirts &amp; Tops For Men</h1>
          </div>

          <div className="heading-actions">
            <button type="button">Hide Filters</button>
            <button type="button">Sort By</button>
          </div>
        </section>

        <section className="catalog-layout">
          <aside className="sidebar">
            <div className="sidebar-links">
              {sidebarLinks.map((item) => (
                <a key={item} href="#shop">
                  {item}
                </a>
              ))}
            </div>

            <div className="filter-list">
              {filterGroups.map((group) => (
                <button className="filter-item" key={group} type="button">
                  <span>{group}</span>
                  <span>+</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="product-grid" id="shop">
            {products.map((product, index) => (
              <article className="product-card" key={product._id || product.name}>
                <ProductVisual product={product} index={index} />

                <div className="product-copy">
                  <p className="tag">{product.league || 'Liga'}</p>
                  <h2>{product.club}</h2>
                  <p className="description">{product.description || 'Opis dodaj v Sanity Studio.'}</p>
                  <p className="product-meta">
                    {product.club ? <span>{product.club}</span> : null}
                    {product.league ? <span>{product.league}</span> : null}
                    {product.version ? <span>{formatVersion(product.version)}</span> : null}
                    {product.size ? <span>{product.size}</span> : null}
                  </p>
                  <p className="price">{formatPrice(product.price) || 'Cena v pripravi'}</p>
                </div>
              </article>
            ))}
          </section>
        </section>

        <section className="sanity-status">
          <p>
            {isSanityLoading
              ? 'Nalagam izdelke iz Sanity...'
              : 'Sanity Studio je pripravljen na poti /studio.'}
          </p>
          {sanityError ? <p>{sanityError}</p> : null}
        </section>
      </main>
    </div>
  );
}

export default App;
