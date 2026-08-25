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
