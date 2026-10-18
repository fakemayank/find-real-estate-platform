# FIND — Property Listing Platform

A property listing platform for a Gujarat-based real estate company. Property owners submit listings, administrators review them, and customers browse approved properties and contact the company through enquiries.

## Source code map (where to edit what)

| File / folder | Purpose |
| --- | --- |
| `server.js` | Express API routes, authentication, validation, PostgreSQL queries, Zipline uploads, and database initialization. Look for the uppercase section headings. |
| `public/app.js` | Client-side navigation, property cards, owner/admin/customer screens, forms, image preview, and API calls. |
| `public/index.html` | Main HTML entry point and linked styles/scripts. |
| `public/*.css` | Existing styles and feature-specific overrides. Stylesheets load in the order linked in `index.html`; later rules may override earlier ones. |
| `public/dropdowns.js` | Custom dropdown interaction. |
| `public/theme.js` | Legacy theme helper retained for compatibility with existing script references. |
| `public/architecture-building.png` | Building illustration used on the home page. |
| `tests/` | Automated source-level checks. |
| `scripts/live-smoke.mjs` | Live API smoke-test helper. |
| `.env.example` | Template for required environment variables; copy to `.env` locally. |
| `docker-compose.yml` | Docker app/database services and port mapping. |

### Editing safely

1. Make changes in `public/` for UI and in `server.js` for API/database behavior.
2. Do not put credentials into frontend JavaScript, CSS or Git.
3. Run `node --check server.js` and `node --check public/app.js` after editing.
4. Run `node --test tests/*.test.js` to check existing source-level tests.
5. Rebuild Docker with `docker compose up -d --build --force-recreate`.
6. Verify the changed feature in the browser; source checks do not prove the full workflow works.

## 1. Requirements

- Windows 10/11 with Docker Desktop (WSL 2 backend recommended), or Linux/macOS with Docker Engine and Docker Compose v2.
- An internet connection for pulling images and uploading photos.
- A working Zipline server and its API upload token. Default image host: `https://img.itsmayank.in`.
- Free local port 8080, or choose another in `.env`.

No local Node.js or PostgreSQL installation is required when running with Docker.

## 2. Extract the project

Extract the ZIP. Open a terminal inside the `property-platform` directory (the folder containing `docker-compose.yml`). On Windows CMD:

```cmd
cd /d "C:\Users\gmaya\OneDrive\Desktop\property-platform"
```

If the folder is somewhere else, adjust the path.

## 3. Create the environment file

Copy `.env.example` to `.env`:

**Windows CMD**

```cmd
copy .env.example .env
notepad .env
```

**PowerShell**

```powershell
Copy-Item .env.example .env
notepad .env
```

**Linux / macOS**

```bash
cp .env.example .env
nano .env
```

Fill every placeholder before starting. The available variables are:

| Variable | Description |
| --- | --- |
| `APP_PORT` | Host port; default `8080`. |
| `POSTGRES_USER` | PostgreSQL username; default `property`. |
| `POSTGRES_PASSWORD` | Strong password for the PostgreSQL user. |
| `POSTGRES_DB` | Database name; default `properties`. |
| `SESSION_SECRET` | Long random secret for signed sessions; at least 32 characters recommended. |
| `COOKIE_SECURE` | `false` for local HTTP; `true` behind correctly configured HTTPS reverse proxy. |
| `ZIPLINE_URL` | Base URL of your Zipline service, e.g. `https://img.itsmayank.in`. |
| `ZIPLINE_API_KEY` | API token from Zipline; never expose it in frontend code. |
| `ZIPLINE_PUBLIC_URL` | Optional trusted public image base URL if different from the Zipline API origin. |
| `ROOT_EMAIL` | Email for the initial administrator account. |
| `ROOT_PASSWORD` | Strong administrator password, minimum 12 characters. |

**Generate secrets:** In PowerShell, generate a random session secret:

```powershell
-join ((1..64) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

Generate a separate strong database password and root password. Do not copy example placeholders into production. If a password contains URL-special characters, the PostgreSQL connection string in `docker-compose.yml` may require URL encoding; using a long alphanumeric database password avoids that issue.

**Zipline setup:** Log in to your Zipline dashboard, create/copy an API token with upload permission, set `ZIPLINE_URL` and `ZIPLINE_API_KEY` in `.env`. If Zipline returns links on another hostname, configure `ZIPLINE_PUBLIC_URL` to that trusted origin. Test a real photo upload after launch. Do not share API tokens or your `.env` file.

## 4. Start with Docker

From the project folder:

```cmd
docker compose config
docker compose up -d --build
docker compose ps
```

Open **http://localhost:8080** (or the `APP_PORT` you configured). The first launch may take a few minutes while Docker downloads Node and PostgreSQL images and initializes the database.

To inspect application logs:

```cmd
docker compose logs --tail=100 web
```

To inspect database logs:

```cmd
docker compose logs --tail=100 db
```

## 5. Accounts and permissions

- **Administrator:** Sign in with `ROOT_EMAIL` and `ROOT_PASSWORD`. Review/reject/approve listings, manage enquiries, and access user management (root-level controls).
- **Property owner:** Register as a property owner, create/edit draft listings, upload photos, submit for review and see their review status.
- **Customer:** Browse approved properties, filter/search, open details and send enquiries to the company. Customer registration is supported; the application also permits guest enquiries.

Public property responses must not expose the property owner's private phone number. The backend must enforce role permissions; hiding links in the UI is not sufficient.

**Important:** The initial root account is seeded in the database. Changing `ROOT_PASSWORD` in `.env` later does not automatically change an already-created account's password.

## 6. Complete demonstration walkthrough

1. **Owner:** Register/sign in as a property owner. Create a rent or sale listing with title, property type, city, area, address, price and description. Select up to eight JPG/PNG/WebP photos (8 MB per photo), preview them, save the draft and submit for review.
2. **Administrator:** Sign in, open Management / Property Review, find the pending listing and approve it.
3. **Customer:** Open Explore/Search, filter by rent/sale, city, property type and price, open the approved listing and send an enquiry with contact information and a message. Verify a confirmation appears.
4. **Administrator:** Open active enquiries, change the status and save internal notes. Saved Contacted/Closed enquiries appear in Enquiry Logs.
5. **Rejection:** Submit a second owner listing, reject it as administrator and verify the owner sees the rejected status.
6. **Editing:** Edit an owner's own listing and confirm it returns to draft for re-review where applicable. Try photo add/remove.
7. **Validation:** Try missing fields, invalid prices, unsupported image formats, excessive image size and an incorrect password. Verify readable errors.
8. **Authorization:** Verify a customer cannot access admin endpoints, an owner cannot edit another owner's property, and unapproved listings do not appear in public search.
9. **Persistence:** Restart containers and confirm users, listings and enquiries remain in PostgreSQL.

## 7. Everyday commands

```cmd
:: Start existing containers
docker compose up -d

:: Rebuild after source changes
docker compose up -d --build --force-recreate

:: Show status
docker compose ps

:: Stream web logs
docker compose logs -f web

:: Stop containers but keep database
docker compose down

:: Run automated tests (Node is inside the container)
docker compose exec web npm test
```

**Never run `docker compose down -v` during a normal update.** The `-v` option deletes the PostgreSQL volume and its data. Keep your `.env` file when replacing source files.

## 8. Troubleshooting

**`SESSION_SECRET` / `ROOT_PASSWORD` error:** Verify `.env` exists, has no placeholder values and that the root password has at least 12 characters. Recreate the web container.

**Database connection failed:** Check `docker compose ps` and `docker compose logs db`. Confirm `POSTGRES_PASSWORD` is set. If a PostgreSQL volume already exists, changing its password in `.env` does not reset the stored database user password.

**Zipline photo upload fails:** Verify the Zipline API key and URL, check `docker compose logs --tail=100 web`, and confirm the API response contains an image URL on the configured trusted origin. Configure `ZIPLINE_PUBLIC_URL` if your deployment intentionally uses a separate image domain.

**Changes not showing:** Confirm the updated files were extracted into the directory used by Docker, run `docker compose up -d --build --force-recreate`, then hard refresh with Ctrl+Shift+R. Check that `localhost` points to the intended `APP_PORT`.

**Port already in use:** Change `APP_PORT` in `.env` (for example to `8081`), restart Compose and visit the new port.

**Incorrect credentials:** Verify the email/password. For the seeded root account, remember that changing `.env` after first initialization does not reset its stored password.

## 9. Project structure

```text
property-platform/
├── public/                 Frontend HTML, CSS, JS and images
├── scripts/                Optional live smoke-test script
├── tests/                  Automated Node tests
├── server.js               Express API, auth, data access, uploads
├── package.json            Dependencies and npm scripts
├── Dockerfile              Application image
├── docker-compose.yml      Application + PostgreSQL
├── .dockerignore            Docker build exclusions
├── .gitignore              Git exclusions
├── .env.example            Safe environment-variable template
└── README.md               Installation, configuration and usage
```

The app uses Node.js/Express, PostgreSQL with a persistent Docker volume, cookie-based sessions and Zipline-hosted images. The public UI is vanilla HTML/CSS/JavaScript. Data is created in PostgreSQL on application startup.

## 10. Security and deployment notes

The application includes password hashing, sessions, request validation, role checks and upload type/size checks. Before public deployment, independently test these protections, configure HTTPS and secure cookies, restrict access to PostgreSQL, protect `.env`, set up database backups and verify Zipline access. Do not put real credentials in Git or test documentation. Only approved properties should be publicly discoverable.

For external evaluation, provide the private repository link, a reachable test deployment, test credentials for customer/owner/admin **through a private channel**, and a walkthrough of the owner → admin → customer → enquiry flow. Record actual development time and any known limitations honestly.

## 11. Known limitations

- A live browser/Docker/Zipline end-to-end test has not been independently performed as part of this ZIP cleanup.
- External Zipline images may remain after a property/photo is removed; external-file cleanup is not guaranteed.
- Initial administrator credentials are seeded only on first database initialization.
- Schema setup happens on application startup rather than via a dedicated migrations framework.
- Browser/device compatibility and production security require testing in the target environment.
