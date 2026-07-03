# Auth & user accounts — server setup (Oracle box)

The login/signup/logout + kundali-profile feature adds a few API routes to the
existing FastAPI app and stores data in **PostgreSQL running on this same Oracle
server**. No external/cloud database is used.

```
Vercel (React)  ──HTTPS──►  nginx → uvicorn (FastAPI)  ──localhost──►  PostgreSQL
   bearer JWT                  (existing service)                      (new, local)
```

If `DATABASE_URL` is **not** set, the auth routes are silently disabled and the
panchanga API runs exactly as before — so you can deploy the code first and turn
auth on later.

---

## 1. Install PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

## 2. Create the database and user

```bash
sudo -u postgres psql <<'SQL'
CREATE USER patro WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE patro OWNER patro;
GRANT ALL PRIVILEGES ON DATABASE patro TO patro;
SQL
```

PostgreSQL listens only on `127.0.0.1` by default — keep it that way. The API
talks to it over localhost, so the DB never needs to be exposed to the internet.

## 3. Install the new Python dependencies

```bash
cd /home/ubuntu/patro
.venv/bin/pip install -r requirements.txt
```

(adds `SQLAlchemy`, `psycopg[binary]`, `PyJWT`, `bcrypt`, `email-validator`)

## 4. Configure environment

Edit `/home/ubuntu/patro/.env` (see `.env.example` for the full list):

```ini
DATABASE_URL=postgresql+psycopg://patro:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/patro
JWT_SECRET=<output of: openssl rand -hex 32>
FRONTEND_URL=https://dpatro.vercel.app

# Email for verification + password reset (Gmail app-password example).
# Omit SMTP_HOST to disable real sending (links are logged instead).
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=you@gmail.com
SMTP_FROM_NAME=Dhakal Patro
```

> **Email note:** sending mail *directly* from a cloud VM is unreliable (port 25
> is usually blocked and IP reputation is poor). Use an SMTP relay — a Gmail
> account with an [app password](https://myaccount.google.com/apppasswords), or a
> free transactional tier (Brevo, Mailgun, Resend-via-SMTP, etc.). All are
> drop-in via the `SMTP_*` vars above.

### Google Sign-In

Add the **Web client ID** from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
to the same `.env` file:

```ini
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

This must match `VITE_GOOGLE_CLIENT_ID` in the dhakal-patro frontend build. In Google
Cloud, add these **Authorized JavaScript origins**:

- `https://vedicpatro.com`
- `https://www.vedicpatro.com`

If `GOOGLE_CLIENT_ID` is missing, `POST /auth/google` returns **503** with
`"Google sign-in is not configured"`. After setting it, restart the API and look for
**`Google sign-in enabled`** in the journal.

### Facebook Sign-In

Add to the same `.env` file:

```ini
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
```

`FACEBOOK_APP_ID` must match `VITE_FACEBOOK_APP_ID` in the dhakal-patro frontend build.
**Never** put `FACEBOOK_APP_SECRET` in the frontend — only on this server.

#### Meta Developer Console (required)

If login shows **"Invalid Scopes: email"**, the app has not enabled the `email`
permission in the dashboard. This is not a code bug.

1. Open [Meta for Developers](https://developers.facebook.com/apps) → your app.
2. **Use cases** → **Authentication and account creation** → **Customize** (or Edit).
3. Under **Permissions**, click **Add** next to **`email`** so it shows **Ready for testing**
   alongside **`public_profile`**.  
   See [Facebook Login permissions](https://developers.facebook.com/docs/facebook-login/permissions).
4. If the app was created with **Facebook Login for Business**, switch to standard
   **Facebook Login** (Business login uses different use-case permissions).
5. **Facebook Login → Settings**:
   - **Login with the JavaScript SDK**: set to **Yes** (required — without this you get
     *"JSSDK Option is Not Toggled"*)
   - **Valid OAuth Redirect URIs**: `http://localhost:5173/`, `https://vedicpatro.com/`, `https://dpatro.vercel.app/`
   - **Allowed domains** (or **App domains**): `localhost`, `vedicpatro.com`, `dpatro.vercel.app`
6. While the app is in **Development** mode, only **Roles** users (admins/developers/testers)
   can log in. Add your Facebook account under **App roles → Test users** or as a Developer.

After setting env vars, restart the API and look for **`Facebook sign-in enabled`** in the journal.

## 5. Restart the API

```bash
sudo systemctl restart nepali-holiday-api
sudo journalctl -u nepali-holiday-api -n 30 --no-pager
```

On startup with `DATABASE_URL` set you should see **`Auth database ready`** — the
tables (`users`, `refresh_tokens`, `email_tokens`, `profiles`) are created
automatically on first boot. No manual migration step is required.

## 6. Smoke-test

```bash
# Should now exist (404 before auth was enabled):
curl -s -X POST https://193-123-67-133.sslip.io/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"supersecret"}' | head

# Interactive API docs list the new /auth and /profiles routes:
#   https://193-123-67-133.sslip.io/docs
```

---

## Backups

A single nightly dump is enough at this scale:

```bash
# Add to crontab (crontab -e):
0 3 * * *  pg_dump -U patro patro | gzip > /home/ubuntu/backups/patro-$(date +\%F).sql.gz
```

## Endpoints added

| Method | Path                       | Auth | Purpose                         |
|--------|----------------------------|------|---------------------------------|
| POST   | `/auth/signup`             | —    | Create account → token pair     |
| POST   | `/auth/login`              | —    | Email + password → token pair   |
| POST   | `/auth/google`             | —    | Google ID token → token pair    |
| POST   | `/auth/facebook`           | —    | Facebook access token → pair    |
| POST   | `/auth/refresh`            | —    | Rotate refresh → new token pair |
| POST   | `/auth/logout`             | —    | Revoke a refresh token          |
| GET    | `/auth/me`                 | ✓    | Current user                    |
| POST   | `/auth/verify-email`       | —    | Confirm email via token         |
| POST   | `/auth/resend-verification`| ✓    | Re-send verification email      |
| POST   | `/auth/forgot-password`    | —    | Email a reset link              |
| POST   | `/auth/reset-password`     | —    | Set new password via token      |
| GET    | `/profiles`                | ✓    | List the user's kundali profiles|
| POST   | `/profiles`                | ✓    | Create a profile                |
| GET    | `/profiles/{id}`           | ✓    | Read one                        |
| PATCH  | `/profiles/{id}`           | ✓    | Update                          |
| DELETE | `/profiles/{id}`           | ✓    | Delete                          |

`✓` routes expect `Authorization: Bearer <access_token>`.

## Migrating to a stricter schema later

Tables are created with `Base.metadata.create_all()` (create-if-missing). That's
ideal for getting started but does **not** alter existing columns. When the
schema needs to evolve, introduce Alembic:

```bash
.venv/bin/pip install alembic
alembic init alembic
# set sqlalchemy.url from DATABASE_URL, then:
alembic revision --autogenerate -m "baseline"
alembic upgrade head
```
