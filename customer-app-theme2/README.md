# OneclickPos Customer App - Theme 2 (Premium Dark UI)

A production-ready premium dark-themed ordering interface for OneclickPos POS system.

## Features

- **Premium Dark UI** — Luxury gradient backgrounds, frosted glass panels, gold accents
- **Responsive Mobile-First** — Optimized for all screen sizes
- **Real Backend Integration** — Same API as customer-app (`/public/stores/{id}/menu`, `/public/stores/{id}/orders`)
- **Cloud-First with Local Hub Fallback** — Graceful handling of offline scenarios
- **No Build Step** — Pure HTML + vanilla JavaScript + CDN styles
- **Production Ready** — Deployable to Vercel static hosting

## Deployment

```bash
vercel deploy
```

Set these environment variables in Vercel project:
- `CLOUD_API_BASE` — URL to cloud-api deployment (e.g., https://your-pos-api.vercel.app)

## Usage

Access via QR code:
```
https://order-theme2.yourpos.com/?store=<store_id>&table=<table_number>
```

## Differences from customer-app (Theme 1)

| Aspect | Theme 1 | Theme 2 |
|--------|---------|----------|
| Color Scheme | Light green (#1B7A3D) | Dark purple (#7c3aed) + gold |
| UI Style | Minimalist, clean | Premium, luxury |
| Fonts | Montserrat (modern) | Cinzel + Montserrat (serif elegance) |
| Animations | Smooth transitions | Float-in, glow effects |
| Target Market | Standard restaurant | Fine dining, upscale venues |

## Deployment Order

1. Ensure `cloud-api` is deployed (see `cloud-api/README.md`)
2. Deploy this app: `vercel deploy`
3. Note the deployed URL
4. Add URL to admin-app's **Table QR codes** generator
