import { createClient } from '@sanity/client';

export const sanityConfig = {
  projectId:
    import.meta.env.VITE_SANITY_PROJECT_ID || import.meta.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'drw5izd2',
  dataset: import.meta.env.VITE_SANITY_DATASET || import.meta.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: import.meta.env.VITE_SANITY_API_VERSION || '2026-04-14',
  token: import.meta.env.VITE_SANITY_TOKEN || import.meta.env.SANITY_WRITE_TOKEN || undefined,
  useCdn: !(import.meta.env.VITE_SANITY_TOKEN || import.meta.env.SANITY_WRITE_TOKEN),
};

export const sanityClient = createClient(sanityConfig);
