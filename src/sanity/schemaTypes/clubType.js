import { defineField, defineType } from 'sanity';

export const clubType = defineType({
  name: 'club',
  title: 'Club',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'league',
      title: 'League',
      type: 'reference',
      to: [{ type: 'league' }],
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'league.title',
    },
  },
});
