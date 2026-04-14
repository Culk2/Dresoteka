import React from 'react';
import { Studio } from 'sanity';
import { sanityStudioConfig } from './sanity/config';

class StudioErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    // Surface details in the console for quicker debugging.
    // eslint-disable-next-line no-console
    console.error('Sanity Studio error:', error);
  }

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (!hasError) {
      return children;
    }

    return (
      <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h2>Sanity Studio se ni nalozil</h2>
        <p>Preveri, da so pravilni `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET` in CORS.</p>
        <p>Podrobnosti napake so v konzoli brskalnika.</p>
        {error ? <pre style={{ whiteSpace: 'pre-wrap' }}>{String(error)}</pre> : null}
      </div>
    );
  }
}

function StudioPage() {
  return (
    <StudioErrorBoundary>
      <Studio config={sanityStudioConfig} />
    </StudioErrorBoundary>
  );
}

export default StudioPage;
