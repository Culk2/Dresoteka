import { defineField, defineType } from 'sanity';

export const productType = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'club',
      title: 'Club',
      type: 'reference',
      to: [{ type: 'club' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { maxLength: 96 },
      validation: (rule) => rule.required().error('Slug je obvezen.'),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'version',
      title: 'Version',
      type: 'string',
      options: {
        list: [
          { title: 'Authentic', value: 'authentic' },
          { title: 'Fan', value: 'fan' },
        ],
      },
    }),
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      options: {
        list: [
          { title: 'XS', value: 'XS' },
          { title: 'S', value: 'S' },
          { title: 'M', value: 'M' },
          { title: 'L', value: 'L' },
          { title: 'XL', value: 'XL' },
          { title: 'XXL', value: 'XXL' },
        ],
      },
    }),
    defineField({
      name: 'league',
      title: 'League',
      type: 'reference',
      to: [{ type: 'league' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      validation: (rule) => rule.min(0).precision(2),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: {
      title: 'club.name',
      subtitle: 'league.title',
      media: 'image',
    },
  },
});
