# 02 · Request Lifecycle

## The pipeline

```
Request → Middleware → GUARD → Interceptor → PIPE → Controller
                         │                             │
                    returns true ─────────────────────►│
                    throws ──────► 401 / 403           │
                                                       ▼
Response ◄── Interceptor ◄── Exception filter ◄── your method
```

**Order matters and is fixed.** Two consequences worth memorising:

### Guards run *before* pipes

Send a request with **no token and a broken body** → you get `401`, not a validation error. The request was stopped two stages before your DTO was looked at.

This is a security property, not a detail. Validation, transformation, and your controller all sit *behind* the guard, so an unauthenticated caller can never reach them. You never have to remember to check.

### Pipes run *after* guards

By the time `ValidationPipe` runs, the user is already authenticated. Your validation logic can safely assume it.

---

## Laravel comparison

| Nest stage | Laravel |
|------------|---------|
| Middleware | Global middleware (`Kernel.php`) |
| **Guard** | `auth` middleware |
| Interceptor | Terminable middleware (but wraps before *and* after) |
| **Pipe** | Form Request validation |
| Controller | Controller |
| Exception filter | `App\Exceptions\Handler` |

Laravel runs everything through one middleware stack. Nest splits that stack into **named stages with fixed order and distinct jobs**. More concepts, but you always know where a piece of logic belongs.

---

## Seen in this project

From `main.ts`:

```ts
app.useGlobalPipes(new ValidationPipe({ ... }));   // the PIPE stage
```

From `users.controller.ts`:

```ts
@UseGuards(JwtAuthGuard)   // the GUARD stage
@Get()
findAll() { ... }          // the CONTROLLER stage
```

Verify the ordering yourself:

```bash
# no token + invalid body → 401 (guard fired first, pipe never ran)
curl -i -X POST localhost:3000/users/1 -d '{"bad":"data"}'
```

→ Next: [Modules](./03-modules.md)
