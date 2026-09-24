# Database

`schema.sql` is a schema-only MariaDB/MySQL export. It contains tables, indexes,
foreign keys, triggers, routines and events where present, but no live rows.

## Import with XAMPP / MariaDB

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE hospital_management CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
C:\xampp\mysql\bin\mysql.exe -u root hospital_management < schema.sql
```

If the database user has a password, add `-p` and enter it when prompted.

After import, apply any newer migrations and create safe starter records:

```bash
cd ../backend
npm run db:migrate
npm run db:seed
```

All versioned migrations are stored in `backend/src/migrations`. The main seed
script is `backend/src/scripts/seed.js`; larger demo seed scripts are also kept
under `backend/src/scripts`.

Do not commit local full-data backups. They can contain patient information and
authentication data.
