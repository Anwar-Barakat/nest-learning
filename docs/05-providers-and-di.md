# 05 · Providers & Dependency Injection

A **provider** is any class Nest can inject. Same idea as a Laravel service resolved from the container.

```ts
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
}
```

`@Injectable()` marks it as injectable. Listing it in a module's `providers` makes it available.

---

## Constructor injection is identical to Laravel

```php
// Laravel
public function __construct(private UserRepository $users) {}
```

```ts
// NestJS
constructor(private usersService: UsersService) {}
```

`private` in the constructor is TypeScript shorthand — it declares **and** assigns the property in one step. `private prisma: PrismaService` is equivalent to writing `this.prisma = prisma` yourself.

---

## The one place Nest reads types automatically

Constructor parameters **do** get their types preserved, thanks to `emitDecoratorMetadata` in `tsconfig.json`. That's why constructors need no decorators while method parameters do.

```ts
constructor(private prisma: PrismaService) {}   // ✅ no decorator needed
findOne(@Param('id') id: number) {}             // ❌ decorator required
```

Two different mechanisms — worth knowing so the inconsistency stops feeling arbitrary.

---

## No facades, no globals

Laravel lets you reach anything from anywhere:

```php
Auth::user();  DB::table('users')->get();  Cache::get('key');
```

Nest has no equivalent, deliberately. Everything comes through the constructor.

**Why:** a class whose dependencies are all in its constructor can be tested by passing fakes. A class calling globals needs the whole framework booted. The cost is verbosity; the benefit is that dependencies are visible and swappable.

---

## Lifecycle hooks

```ts
// prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  async onModuleInit()    { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

| Hook | Runs |
|------|------|
| `onModuleInit` | Once, after the module is initialised |
| `onModuleDestroy` | Once, on graceful shutdown |

Laravel has no direct equivalent — PHP is request-scoped, so connections open and close per request. **Node is long-lived**, so you open a connection pool once at boot and reuse it for every request. This difference is fundamental and affects how you think about state.

---

## Providers are singletons

By default one instance is shared across the whole app. Safe because they hold no per-request state — anything request-specific arrives as a method argument.

→ Next: [DTOs & validation](./06-dto-and-validation.md)
