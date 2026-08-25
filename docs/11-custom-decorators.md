# 11 · Custom Decorators

## The problem

Laravel gives you the authenticated user from anywhere:

```php
auth()->user();   Auth::user();   $request->user();
```

**Nest has no such global, on purpose.** A global reaching into request state makes classes impossible to test in isolation and hides a dependency that should be visible.

So the user rides on the request object, and you pull it off explicitly.

---

## Building it up

Your strategy already put the user on the request, so the crude version works today:

```ts
@Get('me')
me(@Req() req) {
  return req.user;     // works, but…
}
```

Two problems:

1. Your controller now depends on **Express's** request object — breaks if you switch to Fastify.
2. `req.user` is repeated in every handler. If the shape changes, you edit all of them.

So wrap it once:

```ts
// auth/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);
```

---

## Reading it piece by piece

| Piece | Meaning |
|-------|---------|
| `createParamDecorator` | Nest's factory for your own parameter decorator — same family as `@Body()` |
| `data` | Whatever you pass at the call site. `@CurrentUser()` → `undefined`; `@CurrentUser('id')` → `'id'` |
| `ctx` | The execution context — a *handle* to the context, not the request itself |
| `ctx.switchToHttp()` | States which transport you mean |
| return value | Becomes your parameter |

### Why `switchToHttp()` exists

The same decorator can serve HTTP, WebSockets, or gRPC — and "the request" means something different in each. You must say which world you're in.

Laravel has no equivalent because Laravel is HTTP-first. **Nest is transport-agnostic** and makes you state the assumption. That single method call is Nest revealing it isn't an HTTP framework; it's a framework that happens to speak HTTP.

---

## Using it

```ts
// auth.controller.ts
@UseGuards(JwtAuthGuard)
@Get('me')
me(@CurrentUser() user: unknown) {
  return user;
}
```

Both forms work:

```ts
me(@CurrentUser() user)      // the whole user object   ≈ auth()->user()
me(@CurrentUser('id') id)    // just the id             ≈ auth()->id()
```

> ⚠️ `@CurrentUser()` is only populated if a guard ran. On an unguarded route it is `undefined` — the decorator reads `request.user`, it doesn't authenticate.

---

## The full chain

```
Authorization: Bearer eyJ…      client sends a token
  → passport-jwt verifies it     signature + expiry
  → validate(payload) runs       your DB lookup
  → whatever it returns          ← YOU decide the shape here
  → assigned to request.user     Passport does this
  → @CurrentUser() reads it      your decorator
  → arrives as your parameter    the controller finally runs
```

Laravel runs the same chain — it just hides every step behind `auth()->user()`.

→ Next: [Exceptions](./12-exceptions.md)
