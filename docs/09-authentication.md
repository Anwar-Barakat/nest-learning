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

```
ONCE, AT LOGIN — creates the token
  POST /auth/login → bcrypt.compare() → @nestjs/jwt .sign() → token to client

EVERY REQUEST AFTER — checks the token
  GET /users + Bearer → passport-jwt verifies → validate() → request.user
```

| Package | Job | When |
|---------|-----|------|
| `@nestjs/jwt` | **writes** tokens | once, at login |
| `passport-jwt` | **reads** tokens | every protected request |

They never call each other. The only thing connecting them is the shared `JWT_SECRET` — one writes a signature, the other checks it.

**Rotating the secret invalidates every existing token**, logging everyone out.

In Laravel, `tymon/jwt-auth` does both jobs in one package — which is exactly why this split feels strange at first.

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
