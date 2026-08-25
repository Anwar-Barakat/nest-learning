# 08 · Database (Prisma vs Eloquent)

## ⚠️ Prisma is not Active Record

This is the biggest adjustment coming from Eloquent.

```php
// Laravel — the model IS the query builder AND the record
$user = User::find(1);
$user->name = 'New';
$user->save();
```

```ts
// Prisma — the client runs queries; the result is a plain object
const user = await prisma.user.findUnique({ where: { id: 1 } });
await prisma.user.update({ where: { id: 1 }, data: { name: 'New' } });
```

A Prisma result has **no methods**. No `->save()`, no `->delete()`, no relations loaded on access. It is a plain JavaScript object.

In exchange you get **fully generated types** — `user.nmae` is a compile error, and autocomplete knows every column.

---

## The schema is the source of truth

```prisma
// prisma/schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

One file replaces both the migration **and** the model. You edit the schema, then generate a migration from the diff:

| Laravel | Prisma |
|---------|--------|
| `php artisan make:migration` | edit `schema.prisma` |
| `php artisan migrate` | `npx prisma migrate dev --name x` |
| `php artisan migrate:fresh` | `npx prisma migrate reset` |
| `php artisan tinker` | `npx prisma studio` |
| — | `npx prisma generate` (rebuild the typed client) |

> ⚠️ Editing `schema.prisma` alone changes nothing. You must run `migrate dev`, or the database and your code silently disagree.

---

## Adding a column to an existing table

Three steps. **Never write the SQL by hand.**

### 1 — Edit the schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  role      String   @default("user")   // ← new column
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2 — Generate and apply the migration

```bash
npx prisma migrate dev --name add_user_role
```

That one command does four things:

1. Diffs your schema against the database
2. Writes `prisma/migrations/<timestamp>_add_user_role/migration.sql`
3. Applies it
4. Regenerates the typed client

### 3 — There is no step 3

No model file to update. `user.role` autocompletes immediately.

In Laravel you would write the migration **and** update `$fillable`. Prisma generates both from the schema.

---

## ⚠️ Required columns on a table that already has rows

A new **required** column has no value for existing rows, so the database refuses.

Your own repo has the warning:

```sql
-- prisma/migrations/20260824174904_add_password/migration.sql
/*
  Warnings:
  - Added the required column `password` to the `User` table without a
    default value. This is not possible if the table is not empty.
*/
ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL;
```

It succeeded **only because the table was empty**. With one row of data it would have failed.

Three ways out:

| Option | Schema | When |
|--------|--------|------|
| Make it optional | `bio String?` | The value may genuinely be absent |
| Give it a default | `role String @default("user")` | Every row can share a sensible value |
| Two-step backfill | see below | Every row needs a *different* value |

### The two-step backfill

When there is no sensible default:

```prisma
phone String?          // migration 1 — optional
```
```bash
npx prisma migrate dev --name add_phone_optional
```

Backfill the values, then:

```prisma
phone String           // migration 2 — now required
```
```bash
npx prisma migrate dev --name make_phone_required
```

Same pattern as Laravel: `->nullable()`, backfill, then a second migration to `->nullable(false)`.

---

## ⚠️ Renaming a column destroys data

Prisma diffs **state**, not intent. Rename `name` to `fullName` and it sees *"drop `name`, add `fullName`"* — every value is lost.

Prisma prompts before a destructive change. **Read those prompts.** To rename safely, edit the generated SQL to use `ALTER TABLE "User" RENAME COLUMN "name" TO "fullName";` before applying.

Laravel is explicit here (`$table->renameColumn()`), so this is a genuine difference in mental model.

---

## `migrate dev` vs `db push`

| Command | Migration file | Use for |
|---------|----------------|---------|
| `prisma migrate dev` | ✅ created | Anything you intend to keep |
| `prisma db push` | ❌ none | Throwaway prototyping only |
| `prisma migrate deploy` | applies existing | Production / CI |

`db push` syncs the schema straight to the database with no history. Convenient early on, but you end up with a database that no migration file describes and no way to reproduce it. **Default to `migrate dev`.**

---

## PrismaService

```ts
// prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  async onModuleInit()    { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

Wrapping `PrismaClient` in a provider makes it injectable, and the lifecycle hooks tie the connection pool to the app's lifetime.

PHP opens and closes a connection per request. **Node is long-lived** — one pool, opened at boot, reused for every request.

`PrismaModule` is `@Global()`, so any service can inject `PrismaService` without importing anything.

---

## Query translation

| Eloquent | Prisma |
|----------|--------|
| `User::all()` | `prisma.user.findMany()` |
| `User::find(1)` | `prisma.user.findUnique({ where: { id: 1 } })` |
| `User::where('email', $e)->first()` | `prisma.user.findUnique({ where: { email } })` |
| `User::create([...])` | `prisma.user.create({ data: {...} })` |
| `$user->update([...])` | `prisma.user.update({ where, data })` |
| `$user->delete()` | `prisma.user.delete({ where: { id } })` |
| `User::select('id','name')->get()` | `findMany({ select: { id: true, name: true } })` |
| `with('posts')` | `include: { posts: true }` |
| `User::count()` | `prisma.user.count()` |

Prisma has **no `findOrFail`** — it returns `null`. You throw yourself. See [12 · Exceptions](./12-exceptions.md).

---

## Hiding the password

Eloquent has `$hidden`:

```php
protected $hidden = ['password'];
```

Prisma has no such thing — it returns whatever you select. This project uses an explicit allow-list:

```ts
// users.service.ts
const publicUserFields = {
  id: true, name: true, email: true, createdAt: true, updatedAt: true,
};

findAll() {
  return this.prisma.user.findMany({ select: publicUserFields });
}
```

**`select` is an allow-list, not a deny-list.** Add a column to the schema and it will *not* leak — it simply won't appear until you add it here. Safer default than `$hidden`, which leaks anything you forget to list.

One method deliberately opts out:

```ts
// login needs the hash to compare against
findByEmail(email: string) {
  return this.prisma.user.findUnique({ where: { email } });
}
```

→ Next: [Authentication](./09-authentication.md)
