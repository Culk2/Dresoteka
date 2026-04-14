import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import { schemaTypes } from './schemaTypes';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || 'drw5izd2';
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production';
const token = import.meta.env.VITE_SANITY_TOKEN || undefined;
const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const studioBasePath = `${baseUrl}/studio`;

export const sanityStudioConfig = defineConfig({
  name: 'default',
  title: 'Dresoteka Studio',
  projectId,
  dataset,
  basePath: studioBasePath,
  api: token
    ? {
        token,
      }
    : undefined,
  plugins: [deskTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
