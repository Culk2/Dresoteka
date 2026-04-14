import React from 'react';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';

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

const products = [
  {
    tag: 'Najbolj prodajano',
    name: 'Francija 2026 Home Jersey',
    description: 'Tekmovalna verzija dresa',
    price: '129.99 EUR',
    imageClass: 'shirt-blue',
  },
  {
    tag: 'Novo',
    name: 'England 2026 Away Jersey',
    description: 'Navijaska verzija dresa',
    price: '99.99 EUR',
    imageClass: 'shirt-white',
  },
  {
    tag: 'Reciklirani materiali',
    name: 'Brazil 2026 Match Away',
    description: 'Avtenticen nogometni dres',
    price: '139.99 EUR',
    imageClass: 'shirt-navy',
  },
  {
    tag: 'Omejena serija',
    name: 'Barcelona Heritage Jersey',
    description: 'Retro navijaski kos',
    price: '109.99 EUR',
    imageClass: 'shirt-burgundy',
  },
  {
    tag: 'Just In',
    name: 'AC Milan Fourth Kit',
    description: 'Streetwear kolekcija',
    price: '119.99 EUR',
    imageClass: 'shirt-black',
  },
  {
    tag: 'Samo online',
    name: 'Slovenija Stadium Jersey',
    description: 'Lahka supporter izdaja',
    price: '89.99 EUR',
    imageClass: 'shirt-mint',
  },
];

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

function App() {
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

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
            <h1>T-Shirts &amp; Tops For Men (731)</h1>
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

          <section className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.name}>
                <div className={`product-visual ${product.imageClass}`}>
                  <div className="shirt-shape">
                    <div className="shirt-neck" />
                    <div className="shirt-body">
                      <span>DRES</span>
                      <strong>26</strong>
                    </div>
                  </div>
                </div>

                <div className="product-copy">
                  <p className="tag">{product.tag}</p>
                  <h2>{product.name}</h2>
                  <p className="description">{product.description}</p>
                  <p className="price">{product.price}</p>
                </div>
              </article>
            ))}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
