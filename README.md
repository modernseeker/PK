# YK Electric & Electronic Website MVP

Static storefront for the current YK Electric sourcing model in Nepal.

## Current workflow
Customer searches products → adds quantity to request cart → YK verifies supplier stock, exact model and final price → customer confirms → YK sources and dispatches.

## Included
- Responsive homepage
- Electrical and electronic categories
- Custom SVG product illustrations made for this site
- Search by product/model/application
- Category filters
- Request cart with quantities
- LocalStorage cart persistence
- Product request form
- Bulk/business sourcing section

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

## Next build stage
Add a real product/admin database, supplier-price table, product photos, customer checkout, Nepal payment integration, delivery status and order management.
