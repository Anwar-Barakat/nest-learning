# 01 · Mental Model

## The one-line summary

**Laravel is implicit. Nest is explicit.**

Laravel gives you globals (`auth()`, `request()`), facades, self-validating Form Requests, and a container that resolves anything from a type hint. Nest has none of that. Everything arrives through a constructor or a decorator, and every module must declare what it shares.

When Nest surprises you, the question is almost always: **"what did I forget to declare?"**

---

## ⚠️ False friend #1: "Guard"

This is the single biggest source of confusion. **The word means different things in the two frameworks.**

In Laravel, a *guard* is the config bundle in `config/auth.php`:

```php
'guards' => [
    'api' => [
        'driver'   => 'jwt',    // HOW to verify
        'provider' => 'users',  // WHO to look up
    ],
],
```

Nest uses "Guard" for the **other half** — the thing you attach to a route.

| Layer | Laravel | NestJS |
|-------|---------|--------|
| **WHERE** it applies | `middleware('auth:api')` | **`@UseGuards(JwtAuthGuard)`** ← Nest's "Guard" |
| The name | `'api'` | `'jwt'` |
| **HOW** it verifies | `'driver' => 'jwt'` ← Laravel's "Guard" | **`class JwtStrategy`** |
| **WHO** they are | `'provider' => 'users'` | `validate()` |
| Reading it back | `auth()->user()` | `@CurrentUser()` |

Read the table **row by row** — the frameworks are nearly identical. Chase the word "guard" and you stay lost.

**What Laravel calls a Guard, Nest calls a Strategy.**

Laravel hides the "how" in a config array. Nest makes you write it as a class. That's the only real difference.

---

## ⚠️ False friend #2: "Passport"

**Laravel Passport and npm `passport` are unrelated projects that share a name.**

- **Laravel Passport** — a full OAuth2 *server*. Clients, scopes, authorization codes.
- **npm `passport`** — a small, generic auth *framework*. Knows nothing about OAuth. Its whole job: *"run a named check on this request; if it passes, attach a user."*

The honest comparison: **npm `passport` ≈ Laravel's built-in `Illuminate\Auth`** — the guard/driver machinery itself. Laravel ships it inside the framework so you never install it. Express ships nothing, so Node needed a library.

---

## What transfers directly

| Laravel | NestJS |
|---------|--------|
| Controller | `@Controller()` |
| Service in the container | `@Injectable()` provider |
| Service Provider | `@Module()` |
| Form Request | DTO + `ValidationPipe` |
| `middleware('auth')` | `@UseGuards()` |
| `abort(404)` | `throw new NotFoundException()` |
| Eloquent | Prisma (**not** Active Record) |

---

## The habit to unlearn

Laravel resolves a lot from **type hints at runtime**. PHP keeps type information; TypeScript throws it away at compile time.

```ts
// what you write
login(dto: LoginDto) {}

// what actually runs — the type is gone
login(dto) {}
```

This single fact explains most Nest boilerplate: `@Body()`, `@Param()`, and explicit module `exports` all exist because Nest cannot see what PHP can.

→ Next: [Request lifecycle](./02-request-lifecycle.md)
