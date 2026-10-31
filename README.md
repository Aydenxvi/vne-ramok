# VNE RAMOK — Digital Fashion Studio

**An interactive streetwear storefront built as a full-stack portfolio project.** Editorial motion design, a 3D outfit builder, and a complete fictional checkout experience.

**[Explore the live demo](https://vne-ramok-portfolio.onrender.com/)** · **[View the source](https://github.com/Aydenxvi/vne-ramok)** · **[Read the case study](docs/CASE_STUDY.md)**

> **Portfolio demo — not a real store.** Payments are never charged. In the hosted demo, customer contact details and orders are not persisted, and account/admin features are disabled.

![VNE RAMOK — storefront](docs/screenshots/portfolio/01-home.webp)

## The experience

A streetwear concept built around expressive typography, a restrained lime-and-stone palette, and interactions that make choosing clothes feel like exploring a digital fashion editorial.

| Interactive LOOKBOOK | 3D OUTFIT STUDIO |
| :--- | :--- |
| ![Lookbook with clickable clothing hotspots](docs/screenshots/portfolio/03-lookbook.webp) | ![3D outfit builder](docs/screenshots/portfolio/04-outfit-studio.webp) |
| Explore an editorial shoot and its product hotspots. | Rotate the model and combine tops, bottoms and accessories. |

| DROP PASS | Demo receipt |
| :--- | :--- |
| ![Interactive DROP PASS](docs/screenshots/portfolio/05-drop-pass.webp) | ![Fictional paper receipt after checkout](docs/screenshots/portfolio/09-receipt.webp) |
| A tactile brand badge with motion effects. | A receipt-printer animation completes a fictional order. |

**[See all nine project screenshots](docs/SCREENSHOTS.md)**

## Features

- **Fashion storefront:** responsive navigation, product catalog, product pages, size/color options, and quick cart interactions.
- **New Drop & Lookbook:** an animated stack of arrivals, editorial photos, clickable hotspots, and coordinated product recommendations.
- **3D Outfit Studio:** original coordinated GLB models, 360° view, garment switching, color selections, and outfit pricing. Stylized visualization, not a physics-based virtual try-on.
- **Demo checkout:** delivery options, totals, discount UI and an animated paper receipt. No card processing or actual purchases.
- **Local full-stack mode:** account registration, session login, SQLite order storage, and an administrator interface for products and orders.
- **Public portfolio mode:** catalog, outfit builder and fictional checkout remain usable; registration and admin access are disabled and customer/order details are not stored.
- **Performance and access:** on-demand WebGL rendering, lazy-loaded media where applicable, responsive layouts and reduced-motion support.

## Tech stack

| Layer | Tools and approach |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript; no frontend framework or bundler |
| 3D | WebGL and small original procedural `.glb` assets |
| Backend | Node.js HTTP server and built-in `node:sqlite` |
| Authentication | Scrypt password hashing, session cookies in local mode |
| Testing | JavaScript unit checks and HTTP integration tests |
| Deployment | Docker and Render Blueprint (`render.yaml`) |

## Run locally

Requires **Node.js 22.13+**. On Windows, run `start_windows.bat` in the project folder, or from a terminal:

```bash
node server.js
```

Open **http://localhost:3000**. To create an administrator for the local version, run:

```bash
npm run admin:setup
```

Local data lives in `data/` and is intentionally excluded from Git. Do not upload database files, accounts or secrets to a public repository.

For a privacy-safe public demonstration:

```powershell
# Windows PowerShell
$env:PUBLIC_DEMO="1"
node server.js
```

```bash
# macOS / Linux
PUBLIC_DEMO=1 node server.js
```

## Quality and architecture

```bash
npm test
```

Includes tests for catalog/cart behavior, wardrobe selections, demo receipt, backend logic, and public-demo protections. Browser rendering of 3D may vary by GPU; source tests alone do not guarantee visual fidelity on every device.

- `wardrobe.js` handles outfit selection and price display.
- `outfit-glb.js` renders selected GLB assets.
- `server/routes/` holds catalog, account, order, and admin endpoints.
- `server/public-demo.js` safeguards the hosted presentation mode.
- `assets/studio-23/` contains lightweight custom 3D assets.

## Deployment

The live portfolio is hosted on Render using `Dockerfile` and `render.yaml`. A free instance may need time to wake after inactivity. More deployment detail: [GitHub & Render instructions](docs/GITHUB_RENDER_25_RU.md).

## Scope and acknowledgements

This is a **portfolio demonstration**, not a production-ready commerce platform. It intentionally does not support real payments, carrier integration, verified inventory or transactional email. The visual editorial content is demonstration material. The 3D mannequin and clothing set are stylized original procedural geometry; they do not claim physically accurate fitting.

**[Live demo](https://vne-ramok-portfolio.onrender.com/) · [Case study](docs/CASE_STUDY.md) · [Screenshot gallery](docs/SCREENSHOTS.md)**
