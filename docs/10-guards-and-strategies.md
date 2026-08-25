# 10 · Guards & Strategies

> Read [01 · Mental model](./01-mental-model.md) first if the word "Guard" is still confusing. **What Laravel calls a Guard, Nest calls a Strategy.**

Nest splits authentication into two pieces:

- **Strategy** — *how* to verify a credential
- **Guard** — *where* that verification applies

You write the strategy once and apply it anywhere, with no repeated logic.

---

## The Strategy — how

```ts
// auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) throw new UnauthorizedException('User no longer exists');
    return user;
  }
}
```

### `PassportStrategy(Strategy, 'jwt')`

A **function that returns a class**, which you then extend. PHP uses traits for this kind of composition; JS uses this "mixin" pattern. It exists so Nest can wrap a plain Passport strategy in something the DI container can construct.

`'jwt'` is the name you register under — the equivalent of the key `'api'` in Laravel's `guards` array.

### `super({ ... })` — the rules

Everything here is applied by Passport **before any of your code runs**. It is the equivalent of Laravel's driver config.

| Option | Meaning |
|--------|---------|
| `jwtFromRequest` | Where to look — here the `Authorization: Bearer` header |
| `ignoreExpiration: false` | Honour the `exp` claim. `true` = tokens never expire |
| `secretOrKey` | Key the signature is checked against |

### `validate()` — the only part that's yours

Runs **only after** signature and expiry already passed. A forged token never reaches it.

Its Laravel counterpart is the **user provider's `retrieveById()`** — turning an identifier into a user record.

> **The contract:** whatever `validate()` returns becomes `request.user`. That one return statement defines what "the logged-in user" means in every route — exactly what `auth()->user()` gives you in Laravel.

**Design note:** this hits the database on every request. That's a deliberate trade — deleting a user revokes access *immediately*. Skipping the lookup is faster but leaves a deleted user logged in until their token expires.

---

## The Guard — where

```ts
// auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

An empty class body — all behaviour is inherited. Writing your own named subclass is the same instinct as registering a middleware alias in Laravel's Kernel instead of repeating `auth:api` everywhere. When you later add refresh tokens or a `@Public()` escape hatch, you change one file.

---

## ⚠️ The `'jwt'` string is the only link

```ts
PassportStrategy(Strategy, 'jwt')   // jwt.strategy.ts
AuthGuard('jwt')                    // jwt-auth.guard.ts
```

These two files never import each other. No DI connects them. **The only thing joining them is that string.**

```
JwtStrategy ──registers as 'jwt'──► Passport registry ◄──looks up 'jwt'── JwtAuthGuard
                    ▲
        providers: [JwtStrategy]  ← this line is what registers it
```

**Failure mode:** forget `JwtStrategy` in `providers`, or typo the name in either place, and **every protected route returns a bare `401` with no explanation.** No startup warning, no error. If you ever hit unexplainable 401s, check these two strings match before anything else.

---

## Applying it

```php
// Laravel
Route::get('/users', ...)->middleware('auth:api');  // per route
$this->middleware('auth:api');                       // whole controller
// Kernel.php                                        // globally
```

```ts
// NestJS
@UseGuards(JwtAuthGuard) @Get() findAll() {}         // per route  ← this project
@UseGuards(JwtAuthGuard) @Controller('users')        // whole controller
app.useGlobalGuards(new JwtAuthGuard());             // globally
```

**Without it, the route is public.** Before `@UseGuards` was added here, `DELETE /users/:id` would delete any user for anyone on the internet.

### Why signup stays public

```ts
// users.controller.ts
@Post()                          // no guard — you cannot have a token
create(@Body() dto: CreateUserDto) {   // before you have an account
  return this.usersService.create(dto);
}
```

Most production apps go **global guard + a `@Public()` escape hatch**. Reasoning: with per-route guards, forgetting one silently exposes an endpoint. With a global guard, forgetting to mark a route public locks it — loudly and safely. Default to closed.

---

## Two places a 401 can come from

| Where | Owner | Cause |
|-------|-------|-------|
| Signature / expiry check | Passport | Forged or expired token — `validate()` never runs |
| Inside `validate()` | **You** | Your `UnauthorizedException` — e.g. user deleted |

Knowing which fired tells you where to look.

---

## Verify

```bash
curl -i localhost:3000/users                              # 401
curl -i localhost:3000/users -H "Authorization: Bearer x" # 401
curl -i localhost:3000/users -H "Authorization: Bearer $TOKEN"  # 200
```

→ Next: [Custom decorators](./11-custom-decorators.md)
