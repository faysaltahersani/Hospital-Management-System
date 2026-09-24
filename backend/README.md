# Hospital Management System Backend

Express + Sequelize + MySQL backend for the Hospital Management System.

## Stack

- Runtime: Node.js 18+
- Framework: Express 4
- ORM: Sequelize 6 with MySQL
- Auth: JWT access + refresh tokens
- Validation: Joi
- Security: helmet, cors, express-rate-limit, bcryptjs
- Logging: winston + morgan

## Setup

```bash
npm install
cp .env.example .env
# then generate real secrets (startup refuses placeholder values):
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
npm run db:seed
npm run dev
```

Default admin: `admin@hospital.local`. The seed prints a one-time random password to the console on first run; it must be changed at first login. No credential is published in this file.

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Run the API |
| `npm run dev` | Run with nodemon |
| `npm run db:migrate` | Apply pending database migrations |
| `npm run db:migrate:status` | Show applied/pending migrations |
| `npm run db:sync` | (development only) Sync Sequelize models — NOT for production |
| `npm run db:seed` | Sync and seed starter data |
| `npm test` | Run smoke tests |

## Module Pattern

Each business module follows the same layered pattern:

```text
*.routes.js -> *.controller.js -> *.service.js -> *.repository.js
*.validation.js
```

## API Base

Base path: `/api/v1`

## Core Endpoints

| Module | Paths |
| --- | --- |
| Auth | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`, `/auth/me`, `/auth/change-password` |
| Users | `/users` |
| Departments | `/departments` |
| Patients | `/patients` |
| Doctors | `/doctors` |
| Appointments | `/appointments`, `/appointments/:id/status` |
| Beds and wards | `/beds`, `/beds/summary`, `/beds/wards` |
| OPD | `/opd`, `/opd/:id/status`, `/opd/:id/complete`, `/opd/:id/cancel` |
| IPD | `/ipd`, `/ipd/:id/transfer`, `/ipd/:id/discharge`, `/ipd/:id/cancel` |
| Pharmacy | `/pharmacy/medicines`, `/pharmacy/sales`, `/pharmacy/sales/:id/status` |
| Prescriptions | `/prescriptions`, `/prescriptions/:id/status` |
| Laboratory | `/laboratory/tests`, `/laboratory/orders`, `/laboratory/orders/:id/status`, `/laboratory/orders/:id/items/:itemId/result` |
| Radiology | `/radiology/tests`, `/radiology/orders`, `/radiology/orders/:id/status`, `/radiology/orders/:id/result` |
| Billing | `/billing/invoices`, `/billing/payments`, `/billing/expense-categories`, `/billing/expenses` |
| Ambulance | `/ambulance`, `/ambulance/trips/list`, `/ambulance/trips/:id/status`, `/ambulance/trips/:id/complete`, `/ambulance/trips/:id/cancel` |
| Blood bank | `/blood-bank/donors`, `/blood-bank/bags`, `/blood-bank/bags/summary`, `/blood-bank/issues` |
| Referrals | `/referrals`, `/referrals/:id/status` |
| HR | `/hr/employees`, `/hr/attendance`, `/hr/payrolls` |
| Settings | `/settings/public`, `/settings`, `/settings/master-options` |
| Audit logs | `/audit-logs` |
| Reports | `/reports/dashboard`, `/reports/appointments`, `/reports/finance`, `/reports/bed-occupancy`, `/reports/blood-stock`, `/reports/pharmacy-stock` |

Most list endpoints support:

```text
?page=1&limit=20&search=...
```

Date-based lists and reports support:

```text
?from=2026-01-01&to=2026-01-31
```

## Response Shape

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": {}
}
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```
