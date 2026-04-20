import React from 'react';
import { SignInButton, UserButton, useAuth } from '@clerk/react';

function AdminPage() {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const shopPath = baseUrl || '/';
  const studioPath = `${baseUrl}/studio`;
  const { isLoaded, userId } = useAuth();

  return (
    <div className="admin-page">
      <header className="admin-header">
        <a className="admin-brand" href={shopPath}>
          Dresoteka Admin
        </a>
        <div className="admin-header-actions">
          <a className="admin-link-button admin-link-button-secondary" href={shopPath}>
            Nazaj v shop
          </a>
          {isLoaded && userId ? (
            <UserButton />
          ) : null}
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-hero">
          <p className="admin-kicker">Nadzorna plosca</p>
          <h1>Admin stran za upravljanje trgovine</h1>
          <p className="admin-text">
            Tukaj lahko odpiras Sanity Studio, preveris vsebine in upravljas katalog izdelkov.
          </p>
        </section>

        {isLoaded && !userId ? (
          <section className="admin-card">
            <h2>Prijava potrebna</h2>
            <p className="admin-text">
              Za dostop do administracije se najprej prijavi z Clerk racunom.
            </p>
            <SignInButton mode="modal">
              <button className="admin-link-button" type="button">
                Prijava
              </button>
            </SignInButton>
          </section>
        ) : null}

        {isLoaded && userId ? (
          <section className="admin-grid">
            <article className="admin-card">
              <h2>Sanity Studio</h2>
              <p className="admin-text">
                Urejaj produkte, lige, klube in narocila v CMS vmesniku.
              </p>
              <a className="admin-link-button" href={studioPath}>
                Odpri Studio
              </a>
            </article>

            <article className="admin-card">
              <h2>Trgovina</h2>
              <p className="admin-text">
                Vrni se na glavno stran trgovine in preveri prikaz izdelkov za uporabnike.
              </p>
              <a className="admin-link-button admin-link-button-secondary" href={shopPath}>
                Odpri shop
              </a>
            </article>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default AdminPage;
