import React from 'react';
import { SignInButton, UserButton, useAuth } from '@clerk/react';

function formatPrice(value, currency = 'EUR') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }

  return new Intl.NumberFormat('sl-SI', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatOrderStatus(status) {
  const value = String(status || '').toLowerCase();

  if (value === 'v-pripravi') {
    return 'V pripravi';
  }

  if (value === 'paid') {
    return 'Placano';
  }

  if (value === 'shipped') {
    return 'Poslano';
  }

  if (value === 'delivered') {
    return 'Dostavljeno';
  }

  return status || 'Brez statusa';
}

function AdminPage() {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const shopPath = baseUrl || '/';
  const studioPath = `${baseUrl}/studio`;
  const { isLoaded, userId } = useAuth();
  const [orders, setOrders] = React.useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);
  const [ordersError, setOrdersError] = React.useState('');

  React.useEffect(() => {
    let active = true;

    async function loadOrders() {
      if (!isLoaded || !userId) {
        return;
      }

      setIsLoadingOrders(true);
      setOrdersError('');

      try {
        const response = await fetch('/api/admin/orders');
        const contentType = response.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
          const responseText = await response.text();
          throw new Error(
            responseText.includes('<!DOCTYPE') || responseText.includes('<html')
              ? 'API za admin narocila ni vrnil JSON odgovora. Ponovno zazeni dev server.'
              : 'API za admin narocila ni vrnil veljavnega JSON odgovora.',
          );
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Nalaganje narocil ni uspelo.');
        }

        if (active) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch (error) {
        if (active) {
          setOrdersError(error instanceof Error ? error.message : 'Nalaganje narocil ni uspelo.');
        }
      } finally {
        if (active) {
          setIsLoadingOrders(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [isLoaded, userId]);

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
          {isLoaded && userId ? <UserButton /> : null}
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
          <>
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

            <section className="admin-card">
              <div className="admin-section-head">
                <div>
                  <p className="admin-kicker">Narocila</p>
                  <h2>Vsa narocila</h2>
                </div>
                <span className="admin-order-count">{orders.length}</span>
              </div>

              {isLoadingOrders ? <p className="admin-text">Nalagam narocila...</p> : null}
              {!isLoadingOrders && ordersError ? <p className="admin-error">{ordersError}</p> : null}
              {!isLoadingOrders && !ordersError && orders.length === 0 ? (
                <p className="admin-text">Trenutno ni shranjenih narocil.</p>
              ) : null}

              {!isLoadingOrders && !ordersError && orders.length > 0 ? (
                <div className="admin-orders-list">
                  {orders.map((order) => (
                    <article className="admin-order-card" key={order._id}>
                      <div className="admin-order-top">
                        <div>
                          <p className="tag">{order.orderNumber || 'Narocilo'}</p>
                          <h3>
                            {order.customer?.firstName || ''} {order.customer?.lastName || ''}
                          </h3>
                        </div>
                        <span className={`status-pill status-pill-${order.status || 'v-pripravi'}`}>
                          {formatOrderStatus(order.status)}
                        </span>
                      </div>

                      <div className="admin-order-meta">
                        <span>Email: {order.customer?.email || '-'}</span>
                        <span>
                          Naslov: {order.customer?.address || '-'}, {order.customer?.postalCode || '-'}{' '}
                          {order.customer?.city || '-'}
                        </span>
                        <span>Placilo: {order.paymentStatus || '-'}</span>
                        <span>Skupaj: {formatPrice(order.totalAmount, order.currency || 'EUR')}</span>
                        <span>
                          Ustvarjeno:{' '}
                          {order.createdAt ? new Date(order.createdAt).toLocaleString('sl-SI') : '-'}
                        </span>
                      </div>

                      <div className="admin-order-items">
                        {(order.items || []).map((item) => (
                          <div className="admin-order-item" key={item._key || `${item.name}-${item.quantity}`}>
                            <span>
                              {item.name} x {item.quantity}
                            </span>
                            <strong>
                              {formatPrice((item.unitPrice || 0) * (item.quantity || 0), item.currency || 'EUR')}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default AdminPage;
