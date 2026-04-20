import { defineArrayMember, defineField, defineType } from 'sanity';

export const orderType = defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  fields: [
    defineField({
      name: 'orderNumber',
      title: 'Order Number',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'stripeSessionId',
      title: 'Stripe Session ID',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'clerkUserId',
      title: 'Clerk User ID',
      type: 'string',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'V pripravi', value: 'v-pripravi' },
          { title: 'Odposlano', value: 'odposlano' },
          { title: 'Prevzeto', value: 'prevzeto' },
          { title: 'Dostavljeno', value: 'dostavljeno' },
          { title: 'Preklicano', value: 'preklicano' },
        ],
      },
      initialValue: 'v-pripravi',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'paymentStatus',
      title: 'Payment Status',
      type: 'string',
    }),
    defineField({
      name: 'customer',
      title: 'Customer',
      type: 'object',
      fields: [
        defineField({ name: 'firstName', title: 'First Name', type: 'string' }),
        defineField({ name: 'lastName', title: 'Last Name', type: 'string' }),
        defineField({ name: 'email', title: 'Email', type: 'string' }),
        defineField({ name: 'address', title: 'Address', type: 'string' }),
        defineField({ name: 'postalCode', title: 'Postal Code', type: 'string' }),
        defineField({ name: 'city', title: 'City', type: 'string' }),
      ],
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string' }),
            defineField({ name: 'quantity', title: 'Quantity', type: 'number' }),
            defineField({ name: 'unitPrice', title: 'Unit Price', type: 'number' }),
            defineField({ name: 'currency', title: 'Currency', type: 'string' }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'totalAmount',
      title: 'Total Amount',
      type: 'number',
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {
      title: 'orderNumber',
      subtitle: 'status',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Order',
        subtitle: subtitle || 'v-pripravi',
      };
    },
  },
});
