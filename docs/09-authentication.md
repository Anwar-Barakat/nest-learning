# 09 · Authentication

## A JWT is a string, not a library

Three base64 chunks joined by dots:

```
eyJhbGciOiJIUzI1NiJ9 . eyJlbWFpbCI6ImFud2FyQHRlc3QuY29tIiwic3ViIjoxfQ . KX7KlB0tuelo…
└──── header ────┘     └──────────── payload ────────────┘              └─ signature ─┘
```

> ⚠️ **The payload is not encrypted.** Anyone can decode it. The signature only proves nobody *altered* it after signing. Never put secrets in a payload.

---

## Two packages, opposite jobs

### Think of a cinema 🎬

**At the entrance — once:** you show your ID, they print you a ticket.

**At each screen door — every time:** someone looks at your ticket and says yes or no.

The **printer** and the **checker** are two different machines. They never talk to each other. But both know the same secret watermark, so the checker can spot a fake.

- `@nestjs/jwt` = the **printer** 🎟️
- `passport-jwt` = the **checker** 👮

### In your code

```ts
// auth.service.ts — you CALL the printer
this.jwtService.sign(payload)      // 🎟️ print a ticket
```

```ts
// users.controller.ts — the checker is AUTOMATIC
@UseGuards(JwtAuthGuard)           // 👮 check the ticket
@Get()
findAll() {}
```

You call the printer yourself. You never call the checker — you put a guard on the route and it happens.

### When each one runs

```
You log in                →  🎟️ printer runs

GET /users                →  👮 checker
GET /users again          →  👮 checker
GET /auth/me              →  👮 checker
...100 more requests      →  👮 checker ×100

                             🎟️ printer never runs again
```

The printer only runs again when you log in again.

### Why both need `JWT_SECRET`

The secret is the **watermark**.

- The printer uses it to **stamp** the ticket
- The checker uses it to see **if the stamp is real**

Without it, anyone could print their own tickets. **Change the secret and every old stamp looks fake** — everybody has to log in again.

### Where each part lives in your code

*(line numbers are a snapshot — the surrounding code identifies the spot)*

#### 🎟️ The printer

`@nestjs/jwt` appears in exactly **two** places:

```
src/auth/auth.module.ts:4     import { JwtModule } from '@nestjs/jwt';
src/auth/auth.service.ts:2    import { JwtService } from '@nestjs/jwt';
```

**Given the stamp** — `auth.module.ts:14-19`

```ts
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('JWT_SECRET'),   // ← 18: the stamp
    signOptions: { expiresIn: '1d' },           // ← 19: valid 1 day
  }),
}),
```

**Picked up** — `auth.service.ts:11`

```ts
constructor(
  private usersService: UsersService,
  private jwtService: JwtService,     // ← the printer machine
) {}
```

**👉 Stamps the ticket** — `auth.service.ts:27`

```ts
access: this.jwtService.sign(payload),   // ← PRINT + STAMP
```

This single line is *"the printer uses the secret to stamp the ticket."*

#### 👮 The checker

`passport-jwt` appears in exactly **one** place:

```
src/auth/strategies/jwt.strategy.ts:4   import { ExtractJwt, Strategy } from 'passport-jwt';
```

**👉 Given the same secret, to verify** — `jwt.strategy.ts:16-18`

```ts
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),  // ← 16: where to find the ticket
  ignoreExpiration: false,                                   // ← 17: expired?
  secretOrKey: configService.get<string>('JWT_SECRET'),      // ← 18: is the stamp real?
});
```

This is *"the checker uses the secret to see if the stamp is real."*

**Hired** — `auth.module.ts:24`

```ts
providers: [AuthService, JwtStrategy],
```

Without `JwtStrategy` here the checker is never hired, and every protected route returns `401`.

**Posted at a door** — `users.controller.ts`

```ts
@UseGuards(JwtAuthGuard)   // "check tickets here"
```

**It runs — and you never call it** — `jwt.strategy.ts:24`

```ts
async validate(payload: JwtPayload) {
  const user = await this.usersService.findOne(payload.sub);
  if (!user) throw new UnauthorizedException('User no longer exists');
  return user;                                  // → becomes request.user
}
```

By the time this runs, the stamp has **already** been verified. A forged ticket never gets here.

→ Full breakdown in [10 · Guards & strategies](./10-guards-and-strategies.md).

#### The whole relationship, in two lines

```
🎟️  auth.module.ts:18       secret:      config.get('JWT_SECRET')
                                                    ↕  same value
👮  jwt.strategy.ts:18      secretOrKey: configService.get('JWT_SECRET')
```

Both on line 18, in different files, reading the same variable. One stamps, one verifies.

#### Map

| Analogy | Location |
|---------|----------|
| `@nestjs/jwt` = printer | `auth.module.ts:4`, `auth.service.ts:2` |
| Printer given the stamp | `auth.module.ts:18` |
| **Printer stamps** | **`auth.service.ts:27`** — `.sign(payload)` |
| `passport-jwt` = checker | `jwt.strategy.ts:4` |
| **Checker verifies** | **`jwt.strategy.ts:18`** — `secretOrKey` |
| Checker hired | `auth.module.ts:24` — `providers: [JwtStrategy]` |
| Checker posted at a door | `users.controller.ts` — `@UseGuards(JwtAuthGuard)` |

The two bold rows are the real work. Everything else is setup.

#### The one difference to remember

```ts
this.jwtService.sign(payload)    // 🎟️ YOU call this
@UseGuards(JwtAuthGuard)         // 👮 you only DECLARE it — Passport calls it
```

> **One asymmetry:** you can point at `auth.service.ts:27` and say *"here the token is created."* There is no equivalent line for verification — you never call the checker. `jwt.strategy.ts:18` only **configures** it; Passport runs it when the guard fires. That is why the checker feels invisible in a way the printer does not.

### The technical version

```
ONCE, AT LOGIN — creates the token
  POST /auth/login → bcrypt.compare() → @nestjs/jwt .sign() → token to client

EVERY REQUEST AFTER — checks the token
  GET /users + Bearer → passport-jwt verifies → validate() → request.user
```

| | 🎟️ Printer | 👮 Checker |
|---|---|---|
| Package | `@nestjs/jwt` | `passport-jwt` |
| When | you log in | every request after |
| File | `auth.service.ts` | `jwt.strategy.ts` |
| Do you call it? | yes — `.sign()` | no — automatic |
| Uses the secret to | create a signature | verify a signature |

**How verification actually works:** `passport-jwt` does not decrypt anything. It **re-signs** the incoming header + payload with `JWT_SECRET` and compares the result to the signature that arrived. Match = genuine.

```
LOGIN    sign(header + payload, SECRET)  →  "KX7KlB0…"   sent to client
REQUEST  sign(header + payload, SECRET)  →  "KX7KlB0…"   computed fresh
                                                ↕
                                       identical? → genuine
```

Edit the payload to `sub: 999` and the signature no longer matches — rejected before `validate()` runs.

In Laravel, `tymon/jwt-auth` does both jobs in one package. Node splits them into two. Same work, two boxes instead of one.

---

## Login, step by step

```ts
// auth.service.ts
async login(dto: LoginDto) {
  const user = await this.usersService.findByEmail(dto.email);

  if (!user) throw new UnauthorizedException('Invalid credentials');

  const isPasswordValid = await bcrypt.compare(dto.password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const payload = { email: user.email, sub: user.id };
  return {
    access: this.jwtService.sign(payload),
    user: { email: user.email, id: user.id, name: user.name },
  };
}
```

### Why the same message twice

"Invalid credentials" is returned for **both** a wrong password and a nonexistent email. Distinguishing them would let an attacker discover which emails have accounts, one guess at a time. **The vagueness is the feature** — Laravel's `auth()->attempt()` behaves the same way.

### `sub`

JWT convention for "subject" — the identifier the token is about. Your strategy reads it back as `payload.sub` to look the user up.

---

## Hashing

```php
// Laravel
Hash::make($password);
Hash::check($plain, $hashed);
```

```ts
// NestJS
await bcrypt.hash(password, 10);
await bcrypt.compare(plain, hashed);
```

`10` is the salt rounds (cost factor) — Laravel's default too. Higher is slower and more resistant to brute force.

From `users.service.ts`:

```ts
const hashedPassword = await bcrypt.hash(dto.password, 10);
return await this.prisma.user.create({
  data: { ...dto, password: hashedPassword },
  select: publicUserFields,
});
```

> ⚠️ Laravel models can hash in a mutator (`casts = ['password' => 'hashed']`). Prisma has no mutators — **hashing is your responsibility, every time**. Miss it once and you store a plaintext password.

---

## Try it

```bash
# signup (public)
curl -X POST localhost:3000/users -H 'Content-Type: application/json' \
  -d '{"name":"Anwar","email":"anwar@test.com","password":"secret123"}'

# login → token
curl -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"anwar@test.com","password":"secret123"}'

# use it
curl localhost:3000/users -H "Authorization: Bearer <token>"
```

→ Next: [Guards & strategies](./10-guards-and-strategies.md)
