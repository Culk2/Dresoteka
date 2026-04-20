import React from 'react';
import { SignInButton, UserButton, useAuth } from '@clerk/react';
import { jsPDF } from 'jspdf';

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

  if (value === 'odposlano') {
    return 'Odposlano';
  }

  if (value === 'prevzeto') {
    return 'Prevzeto';
  }

  return status || 'Brez statusa';
}

const STATUS_SECTIONS = [
  { key: 'v-pripravi', title: 'V pripravi' },
  { key: 'odposlano', title: 'Odposlano' },
  { key: 'prevzeto', title: 'Prevzeto' },
];

function AdminBarChart({ title, subtitle, items, formatValue }) {
  const maxValue = Math.max(...items.map((item) => item.value), 0);
  const chartHeight = 220;
  const chartWidth = 420;
  const paddingLeft = 44;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 34;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const safeMax = maxValue > 0 ? maxValue : 1;
  const points = items.map((item, index) => {
    const x = paddingLeft + (items.length <= 1 ? innerWidth / 2 : (innerWidth / (items.length - 1)) * index);
    const y = paddingTop + innerHeight - (item.value / safeMax) * innerHeight;

    return { ...item, x, y };
  });
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const gridValues = Array.from({ length: 5 }, (_, index) => {
    return Math.round((safeMax / 4) * (4 - index));
  });

  return (
    <section className="admin-chart-card">
      <div className="admin-section-head">
        <div>
          <p className="admin-kicker">Analitika</p>
          <h2>{title}</h2>
        </div>
      </div>
      <p className="admin-text">{subtitle}</p>
      <div className="admin-line-chart">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="admin-line-chart-svg" aria-hidden="true">
          {gridValues.map((value, index) => {
            const y = paddingTop + (innerHeight / 4) * index;

            return (
              <g key={`${title}-${value}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  className="admin-grid-line"
                />
                <text x={paddingLeft - 8} y={y + 4} className="admin-axis-label admin-axis-label-left">
                  {formatValue(value)}
                </text>
              </g>
            );
          })}

          {points.map((point) => (
            <line
              key={`${point.key}-grid`}
              x1={point.x}
              y1={paddingTop}
              x2={point.x}
              y2={paddingTop + innerHeight}
              className="admin-grid-line admin-grid-line-vertical"
            />
          ))}

          <line
            x1={paddingLeft}
            y1={paddingTop + innerHeight}
            x2={chartWidth - paddingRight + 10}
            y2={paddingTop + innerHeight}
            className="admin-axis-line"
          />
          <polygon
            points={`${chartWidth - paddingRight + 10},${paddingTop + innerHeight - 4} ${chartWidth - paddingRight + 24},${paddingTop + innerHeight} ${chartWidth - paddingRight + 10},${paddingTop + innerHeight + 4}`}
            className="admin-axis-arrow"
          />
          <line
            x1={paddingLeft}
            y1={paddingTop + innerHeight}
            x2={paddingLeft}
            y2={paddingTop - 8}
            className="admin-axis-line"
          />
          <polygon
            points={`${paddingLeft - 4},${paddingTop - 8} ${paddingLeft},${paddingTop - 22} ${paddingLeft + 4},${paddingTop - 8}`}
            className="admin-axis-arrow"
          />

          <polyline points={polylinePoints} className="admin-line-path" />

          {points.map((point) => (
            <g key={point.key}>
              <circle cx={point.x} cy={point.y} r="7" className="admin-point-outer" />
              <circle cx={point.x} cy={point.y} r="3.2" className="admin-point-inner" />
              <text x={point.x} y={chartHeight - 8} className="admin-axis-label admin-axis-label-bottom">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="admin-chart-legend">
        {items.map((item) => (
          <div className="admin-chart-legend-item" key={`${item.key}-legend`}>
            <span className={`admin-chart-dot admin-chart-dot-${item.key}`} />
            <span>{item.label}</span>
            <strong>{formatValue(item.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function getCustomerName(order) {
  return `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Neznana stranka';
}

function getBestSellingProduct(orders) {
  const quantities = new Map();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const name = String(item.name || 'Neznan dres').trim() || 'Neznan dres';
      quantities.set(name, (quantities.get(name) || 0) + Number(item.quantity || 0));
    });
  });

  let best = null;

  quantities.forEach((quantity, name) => {
    if (!best || quantity > best.quantity) {
      best = { name, quantity };
    }
  });

  return best;
}

function exportOrdersPdf(orders) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - 24;
  let cursorY = 18;

  function ensureSpace(heightNeeded = 8) {
    if (cursorY + heightNeeded <= pageHeight - 16) {
      return;
    }

    doc.addPage();
    cursorY = 18;
  }

  function addText(text, options = {}) {
    const { size = 11, weight = 'normal', gap = 6 } = options;
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text), maxWidth);
    const lineHeight = size * 0.45 * lines.length + gap;
    ensureSpace(lineHeight);
    doc.text(lines, 12, cursorY);
    cursorY += lineHeight;
  }

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const bestSellingProduct = getBestSellingProduct(orders);

  addText('Dresoteka Admin Report', { size: 18, weight: 'bold', gap: 8 });
  addText(`Datum izvoza: ${new Date().toLocaleString('sl-SI')}`, { size: 10, gap: 5 });
  addText(`Skupno narocil: ${orders.length}`, { size: 11, gap: 5 });
  addText(`Skupni dobicek vseh dresov: ${formatPrice(totalRevenue, 'EUR')}`, { size: 11, gap: 5 });
  addText(
    `Najbolj kupljen dres: ${bestSellingProduct ? `${bestSellingProduct.name} (${bestSellingProduct.quantity}x)` : '-'}`,
    { size: 11, gap: 8 },
  );

  STATUS_SECTIONS.forEach((section) => {
    const sectionOrders = orders.filter((order) => (order.status || 'v-pripravi') === section.key);

    addText(`${section.title}: ${sectionOrders.length}`, { size: 13, weight: 'bold', gap: 6 });

    if (sectionOrders.length === 0) {
      addText('Ni narocil v tej skupini.', { size: 10, gap: 5 });
      return;
    }

    sectionOrders.forEach((order, index) => {
      addText(`${index + 1}. ${order.orderNumber || 'Narocilo'}`, { size: 12, weight: 'bold', gap: 5 });
      addText(`Stranka: ${getCustomerName(order)}`, { size: 10, gap: 4 });
      addText(`Email: ${order.customer?.email || '-'}`, { size: 10, gap: 4 });
      addText(
        `Naslov: ${order.customer?.address || '-'}, ${order.customer?.postalCode || '-'} ${order.customer?.city || '-'}`,
        { size: 10, gap: 4 },
      );
      addText(`Status: ${formatOrderStatus(order.status)}`, { size: 10, gap: 4 });
      addText(`Skupaj: ${formatPrice(order.totalAmount, order.currency || 'EUR')}`, { size: 10, gap: 4 });
      addText(`Ustvarjeno: ${order.createdAt ? new Date(order.createdAt).toLocaleString('sl-SI') : '-'}`, {
        size: 10,
        gap: 4,
      });

      (order.items || []).forEach((item) => {
        addText(
          `- ${item.name} x ${item.quantity} = ${formatPrice(
            Number(item.unitPrice || 0) * Number(item.quantity || 0),
            item.currency || 'EUR',
          )}`,
          { size: 10, gap: 4 },
        );
      });

      cursorY += 2;
    });
  });

  doc.save(`dresoteka-narocila-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function OrderCard({ order, updatingOrderId, onStatusChange }) {
  return (
    <article className="admin-order-card">
      <div className="admin-order-top">
        <div>
          <p className="tag">{order.orderNumber || 'Narocilo'}</p>
          <h3>
            {order.customer?.firstName || ''} {order.customer?.lastName || ''}
          </h3>
        </div>
        <label className={`status-pill status-pill-${order.status || 'v-pripravi'}`}>
          <select
            className="status-select"
            value={order.status || 'v-pripravi'}
            onChange={(event) => onStatusChange(order._id, event.target.value)}
            disabled={updatingOrderId === order._id}
          >
            <option value="v-pripravi">V pripravi</option>
            <option value="odposlano">Odposlano</option>
            <option value="prevzeto">Prevzeto</option>
          </select>
        </label>
      </div>

      <div className="admin-order-meta">
        <span>Email: {order.customer?.email || '-'}</span>
        <span>
          Naslov: {order.customer?.address || '-'}, {order.customer?.postalCode || '-'} {order.customer?.city || '-'}
        </span>
        <span>Placilo: {order.paymentStatus || '-'}</span>
        <span>Skupaj: {formatPrice(order.totalAmount, order.currency || 'EUR')}</span>
        <span>Trenutni status: {formatOrderStatus(order.status)}</span>
        <span>Ustvarjeno: {order.createdAt ? new Date(order.createdAt).toLocaleString('sl-SI') : '-'}</span>
        {updatingOrderId === order._id ? <span>Posodabljam status...</span> : null}
      </div>

      <div className="admin-order-items">
        {(order.items || []).map((item) => (
          <div className="admin-order-item" key={item._key || `${item.name}-${item.quantity}`}>
            <span>
              {item.name} x {item.quantity}
            </span>
            <strong>{formatPrice((item.unitPrice || 0) * (item.quantity || 0), item.currency || 'EUR')}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function StatusTable({ title, statusKey, orders, updatingOrderId, onStatusChange }) {
  return (
    <section className="admin-status-table">
      <div className="admin-section-head">
        <div>
          <p className="admin-kicker">Narocila</p>
          <h2>{title}</h2>
        </div>
        <span className={`admin-order-count status-pill status-pill-${statusKey}`}>{orders.length}</span>
      </div>

      {orders.length === 0 ? (
        <p className="admin-text">Ni narocil v tej skupini.</p>
      ) : (
        <div className="admin-orders-list">
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              updatingOrderId={updatingOrderId}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AdminPage() {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const shopPath = baseUrl || '/';
  const studioPath = `${baseUrl}/studio`;
  const { isLoaded, userId } = useAuth();
  const [orders, setOrders] = React.useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);
  const [ordersError, setOrdersError] = React.useState('');
  const [updatingOrderId, setUpdatingOrderId] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

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

  async function handleStatusChange(orderId, nextStatus) {
    const previousOrders = orders;

    setUpdatingOrderId(orderId);
    setOrdersError('');
    setOrders((current) =>
      current.map((order) => (order._id === orderId ? { ...order, status: nextStatus } : order)),
    );

    try {
      const response = await fetch('/api/admin-order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      const responseText = await response.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            responseText.includes('<!DOCTYPE') || responseText.includes('<html')
              ? 'API za posodobitev statusa ni vrnil JSON odgovora.'
              : 'API za posodobitev statusa ni vrnil veljavnega JSON odgovora.',
          );
        }
      }

      if (!response.ok || !data.order?._id) {
        throw new Error(data.error || 'Posodobitev statusa ni uspela.');
      }

      setOrders((current) => current.map((order) => (order._id === data.order._id ? data.order : order)));
    } catch (error) {
      setOrders(previousOrders);
      setOrdersError(error instanceof Error ? error.message : 'Posodobitev statusa ni uspela.');
    } finally {
      setUpdatingOrderId('');
    }
  }

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim();
    const email = order.customer?.email || '';
    const orderNumber = order.orderNumber || '';

    return [customerName, email, orderNumber].some((value) => value.toLowerCase().includes(query));
  });

  const groupedOrders = STATUS_SECTIONS.map((section) => ({
    ...section,
    orders: filteredOrders.filter((order) => (order.status || 'v-pripravi') === section.key),
  }));
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const bestSellingProduct = getBestSellingProduct(orders);
  const revenueChartItems = STATUS_SECTIONS.map((section) => ({
    key: section.key,
    label: section.title,
    value: orders
      .filter((order) => (order.status || 'v-pripravi') === section.key)
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
  }));
  const orderCountChartItems = STATUS_SECTIONS.map((section) => ({
    key: section.key,
    label: section.title,
    value: orders.filter((order) => (order.status || 'v-pripravi') === section.key).length,
  }));

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
          <a className="admin-link-button" href={studioPath}>
            Odpri Studio
          </a>
          {isLoaded && userId ? <UserButton /> : null}
        </div>
      </header>

      <main className="admin-main">
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
            <section className="admin-charts-grid">
              <AdminBarChart
                title="Prihodki"
                subtitle="Pregled prihodkov po statusu narocil."
                items={revenueChartItems}
                formatValue={(value) => formatPrice(value, 'EUR')}
              />
              <AdminBarChart
                title="Narocila"
                subtitle="Stevilo narocil po statusu."
                items={orderCountChartItems}
                formatValue={(value) => `${value}`}
              />
            </section>

            <section className="admin-card">
              <div className="admin-section-head">
                <div>
                  <p className="admin-kicker">Iskanje</p>
                  <h2>Najdi narocilo</h2>
                </div>
                <span className="admin-order-count">{filteredOrders.length}</span>
              </div>
              <input
                className="admin-search-input"
                type="search"
                placeholder="Isci po imenu, emailu ali stevilki narocila"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <div className="admin-summary-grid">
                <div className="admin-summary-item">
                  <span>Skupni dobicek</span>
                  <strong>{formatPrice(totalRevenue, 'EUR')}</strong>
                </div>
                <div className="admin-summary-item">
                  <span>Najbolj kupljen dres</span>
                  <strong>{bestSellingProduct ? `${bestSellingProduct.name} (${bestSellingProduct.quantity}x)` : '-'}</strong>
                </div>
              </div>
              <button
                className="admin-link-button"
                type="button"
                onClick={() => exportOrdersPdf(orders)}
                disabled={orders.length === 0}
              >
                Export PDF
              </button>
            </section>

            {isLoadingOrders ? <section className="admin-card"><p className="admin-text">Nalagam narocila...</p></section> : null}
            {!isLoadingOrders && ordersError ? <section className="admin-card"><p className="admin-error">{ordersError}</p></section> : null}

            {!isLoadingOrders && !ordersError ? (
              <section className="admin-tables-grid">
                {groupedOrders.map((section) => (
                  <StatusTable
                    key={section.key}
                    title={section.title}
                    statusKey={section.key}
                    orders={section.orders}
                    updatingOrderId={updatingOrderId}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}

export default AdminPage;
