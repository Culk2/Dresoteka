import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import './styles.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const adminPath = `${baseUrl}/admin`;
const adminPrefix = adminPath.endsWith('/') ? adminPath : `${adminPath}/`;
const studioPath = `${baseUrl}/studio`;
const studioPrefix = studioPath.endsWith('/') ? studioPath : `${studioPath}/`;
const isAdminRoute =
  window.location.pathname === adminPath ||
  window.location.pathname.startsWith(adminPrefix);
const isStudioRoute =
  window.location.pathname === studioPath ||
  window.location.pathname.startsWith(studioPrefix);

async function bootstrap() {
  const root = ReactDOM.createRoot(document.getElementById('root'));

  if (isAdminRoute) {
    const { default: AdminPage } = await import('./AdminPage');

    root.render(
      <React.StrictMode>
        {publishableKey ? (
          <ClerkProvider publishableKey={publishableKey}>
            <AdminPage />
          </ClerkProvider>
        ) : (
          <AdminPage />
        )}
      </React.StrictMode>,
    );

    return;
  }

  if (isStudioRoute) {
    const { default: StudioPage } = await import('./StudioPage');

    root.render(
      <React.StrictMode>
        <StudioPage />
      </React.StrictMode>,
    );

    return;
  }

  const { default: App } = await import('./App');

  root.render(
    <React.StrictMode>
      {publishableKey ? (
        <ClerkProvider publishableKey={publishableKey}>
          <App />
        </ClerkProvider>
      ) : (
        <App />
      )}
    </React.StrictMode>,
  );
}

bootstrap();
