# YK Electric & Electronic

Public product storefront plus the private YK business admin for the current sourcing model in Nepal.

## Current workflow
Customer searches products → adds quantity to request cart → YK verifies supplier stock, exact model and final price → customer confirms → YK sources and dispatches.

## Included
- Responsive homepage
- Electrical and electronic categories
- Custom SVG product illustrations made for this site
- Supabase product catalog and product-image storage
- Search by product/model/application
- Category filters
- Request cart with quantities
- LocalStorage cart persistence
- Product request form
- Bulk/business sourcing section
- Secure Supabase administrator sign-in with Row Level Security
- Enquiries, quotations, orders and VAT/non-VAT invoice workflow
- Customers, suppliers, credit control and opening balances
- Inventory, purchase orders, cash/bank and management accounts
- Customer and supplier Party Ledgers with printable statements

## Before going live
Open `app.js` and fill in the `SITE` object:

```js
const SITE={
  phone:"YOUR_DISPLAY_PHONE",
  email:"YOUR_EMAIL",
  whatsapp:"97798XXXXXXXX"
};
```

For WhatsApp use digits only, including country code, with no `+`, spaces or dashes.

## GitHub Pages
This repository is ready to be served as a static GitHub Pages site from the `main` branch root. Enable Pages in repository Settings → Pages and select deployment from a branch, then `main` and `/ (root)`.

## Data model
Supabase is the system of record. The browser uses the publishable key and the signed-in administrator JWT; private business tables remain protected by database policies.
