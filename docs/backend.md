# Local backend and API

The API is an ASP.NET Core Minimal API targeting .NET 10. [`Program.cs`](../backend/Portfolio.Api/Program.cs) configures EF Core, Identity, JWT validation, endpoints, and development Swagger. [`PortfolioDbContext.cs`](../backend/Portfolio.Api/Data/PortfolioDbContext.cs) maps portfolio sections and Identity data to SQL Server.

## Local setup

Use the .NET 10 SDK, Node.js 24.x, and a SQL Server instance that the API process can reach. The established Windows setup uses Windows Authentication. Run the following commands from the repository root. Use the same Windows account that can connect to the development instance.

### 1. Configure development secrets

The [API project](../backend/Portfolio.Api/Portfolio.Api.csproj) already has a User Secrets ID. Set the following values with `dotnet user-secrets set "<key>" "<value>" --project backend/Portfolio.Api`. Keep the development secrets and TLS private key outside the repository. [ASP.NET Core Secret Manager](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0)

| Key | Value |
| --- | --- |
| `ConnectionStrings:Portfolio` | Connection string for the development database, for example a database named `Portfolio` on your local SQL Server. Use integrated security for Windows Authentication. |
| `Auth:Origin` | `https://localhost:5173` for the setup below. Use the exact browser origin, without a trailing slash. |
| `Auth:SigningKey` | Base64 encoding of at least 32 cryptographically random bytes. |
| `Auth:SetupKey` | A separate Base64 value generated from at least 32 cryptographically random bytes. Required for first administrator setup. |

The local API loads User Secrets in the Development environment. For a deployed API, provide these values through the host configuration or its secret store. ASP.NET Core environment variable names use double underscores between configuration levels, for example `ConnectionStrings__Portfolio` and `Auth__Origin`. [ASP.NET Core configuration and secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0)

### 2. Apply migrations

Match `dotnet-ef` to the EF Core version in [`Portfolio.Api.csproj`](../backend/Portfolio.Api/Portfolio.Api.csproj). The current checkout uses EF Core `10.0.15`. A first-time installation can use `dotnet tool install --global dotnet-ef --version 10.0.15`.

```sh
dotnet ef database update --project backend/Portfolio.Api -- --environment Development
```

[`InitialSections`](../backend/Portfolio.Api/Data/Migrations/20261117121745_InitialSections.cs) creates `Sections`. [`InitialAuthentication`](../backend/Portfolio.Api/Data/Migrations/20261117130946_InitialAuthentication.cs) creates the Identity, setup, session, and refresh credential tables. The migrations leave the published section rows empty on a fresh database. A successful `GET /api/sections` can therefore return `[]`.

### 3. Start the API

```sh
dotnet run --project backend/Portfolio.Api --no-launch-profile -- --environment Development --urls http://127.0.0.1:5082
```

Open [Swagger UI](http://127.0.0.1:5082/swagger/index.html) or the [OpenAPI JSON](http://127.0.0.1:5082/swagger/v1/swagger.json). Use [`/health`](http://127.0.0.1:5082/health) to verify the process, then [`/api/sections/order`](http://127.0.0.1:5082/api/sections/order) to verify a SQL-backed read. Swagger is available in Development.

### 4. Start the HTTPS frontend

Install dependencies with `npm ci` if needed. Use a trusted localhost certificate in PFX format with its private key. For a .NET development certificate, `dotnet dev-certs https --check --trust` checks whether a trusted certificate exists. When creating a local certificate, use `dotnet dev-certs https --trust` and export the certificate with `--export-path` and `--password`. Keep the exported file in an existing directory outside the repository. [Microsoft .NET development certificates](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-dev-certs)

In the frontend terminal, set `PORTFOLIO_TLS_PFX` to the full certificate path and `PORTFOLIO_TLS_PASSWORD` to the PFX password when applicable. Stop the HTTP Vite instance first if it is using port 5173.

```sh
npm run dev -- --host localhost --port 5173 --strictPort
```

Open [the HTTPS frontend](https://localhost:5173/). Vite proxies `/api` to the loopback API at `http://127.0.0.1:5082`. The walkthrough player should show **Live request** in English. The Header offers **Sign in** when the HTTPS integration is enabled.

### 5. Set up the administrator

Open **Sign in**. On a fresh database, **Create administrator** asks for an email, a password of 15 to 128 characters, and the configured setup code. The database records completion of the first setup. Later visits offer sign-in for the existing account. Turn on **Editing mode** in the admin toolbar to reorder the public sections.

## Endpoints

| Method and path | Access | Response or effect |
| --- | --- | --- |
| `GET /health` | Public | Returns `{"status":"healthy"}` when the process responds. |
| `GET /api/sections` | Public | Returns enabled rows with `key`, `title`, and `body`, ordered by `SortOrder` and then key. Returns 503 when the sections database is unavailable. |
| `GET /api/sections/order` | Public | Returns `{"keys":[...]}`. Uses the default order if the database has no valid saved order. Returns 503 when the database is unavailable. |
| `PUT /api/sections/order` | Administrator bearer token | Accepts `{"keys":[...],"expectedKeys":[...]}` with each supported key exactly once in each supplied list. If the optional previous order has changed, returns 409 with the current order. On success, returns the saved order. |
| `GET /api/auth/setup-status` | Public in the configured API | Returns `{"setupRequired":true}` only when a setup key is configured and setup has yet to complete. |
| `POST /api/auth/signup` | Configured HTTPS origin and setup code | Creates the first administrator and starts a session. Completed setup returns 409 for an otherwise valid setup request. |
| `POST /api/auth/login` | Configured HTTPS origin and valid credentials | Starts an administrator session. |
| `POST /api/auth/refresh` | Configured HTTPS origin and refresh cookie | Returns a new access token and rotates the refresh cookie. |
| `POST /api/auth/logout` | Configured HTTPS origin | Revokes the session associated with the supplied refresh cookie, clears the cookie, and returns 204 on success. |
| `GET /api/auth/me` | Administrator bearer token | Returns the current administrator account. |

[`SectionOrderEndpoints.cs`](../backend/Portfolio.Api/Sections/SectionOrderEndpoints.cs) accepts `work`, `skills`, `expertise`, `experience`, `education`, and `contact`. An invalid order returns 400. The server updates the sort order of existing rows and inserts enabled rows with empty bodies for missing keys, all within one SQL transaction. The UI renders its public copy from the React features.

## Sessions and Swagger

[`AuthEndpoints.cs`](../backend/Portfolio.Api/Auth/AuthEndpoints.cs) requires the exact configured browser origin and `X-Portfolio-Auth: 1` on session POST requests. Signup also requires `X-Portfolio-Setup`. The frontend keeps access tokens in memory. Access tokens last up to five minutes. The seven-day session uses a rotating refresh cookie with `Secure`, `HttpOnly`, `SameSite=Strict`, and the `/api/auth` path. The server stores hashes of refresh credentials. Reuse of a rotated credential revokes its session.

Setup status, credential attempts, refresh, and logout have separate request limits. For an HTTPS deployment with a reverse proxy, have the same-host proxy connect over loopback and replace incoming `X-Forwarded-For` with the actual client address. ASP.NET Core accepts one forwarded address from its default trusted loopback proxies. Keep the backend listener private. [ASP.NET Core proxy guidance](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0)

Use the HTTPS frontend to verify sign-in, refresh, and sign-out. Swagger over the loopback HTTP address is for browsing the contract and sending public requests or requests with an existing bearer token. The browser cookie flow requires the configured HTTPS origin. Keep tokens, setup codes, and certificate passwords out of logs and shared examples.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `/health` answers while a section endpoint returns 503 | Check the development connection string, database access for the Windows account running the API, and whether the migrations were applied. Check the API log for the SQL error. |
| The browser reports a TLS protocol error | Confirm the process on port 5173 is Vite launched with the PFX variables and open `https://localhost:5173/`. |
| The browser displays a certificate trust warning | Verify that the localhost certificate used by Vite is trusted in the current browser and Windows user session. |
| Auth POST returns 403 | Compare the browser origin with `Auth:Origin`. The browser must use the configured hostname, port, and HTTPS scheme. |
| Auth endpoints report 503 | Check that the API loaded a valid signing key and HTTPS origin in its current environment. |
| Swagger returns 404 | Start the API with the Development environment and confirm that the current API build is listening on port 5082. |

See [Testing and deployment](testing-and-deployment.md) for isolated SQL tests and hosting.
