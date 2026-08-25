# 12 · Exceptions

## Throw, don't return

```php
// Laravel
abort(404, 'Not found');
throw new ModelNotFoundException();
```

```ts
// NestJS
throw new NotFoundException('Not found');
```

Nest catches the exception and turns it into the right HTTP response automatically.

---

## Translation

| Laravel | NestJS | Status |
|---------|--------|--------|
| `abort(400)` | `BadRequestException` | 400 |
| `abort(401)` | `UnauthorizedException` | 401 |
| `abort(403)` | `ForbiddenException` | 403 |
| `abort(404)` | `NotFoundException` | 404 |
| `abort(409)` | `ConflictException` | 409 |
| `ValidationException` | `UnprocessableEntityException` | 422 |
| `abort(500)` | `InternalServerErrorException` | 500 |

All extend `HttpException`. For a custom code:

```ts
throw new HttpException('Teapot', 418);
```

---

## Used in this project

```ts
// auth.service.ts
if (!user) throw new UnauthorizedException('Invalid credentials');
```

```ts
// users.service.ts
async create(dto: CreateUserDto) {
  try {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return await this.prisma.user.create({
      data: { ...dto, password: hashedPassword },
      select: publicUserFields,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
    }
    throw new InternalServerErrorException();
  }
}
```

This replaces Laravel's `unique:users` rule. class-validator never touches the database, so uniqueness is enforced by the **database constraint**, and the resulting error is translated into a `409`.

---

## ⚠️ `await` inside `try` is not optional

```ts
// ❌ the catch block can NEVER run
try {
  return this.prisma.user.create({ ... });
} catch (error) { ... }

// ✅
try {
  return await this.prisma.user.create({ ... });
} catch (error) { ... }
```

`return somePromise` hands the promise to the caller and **exits the try block before it rejects**. The rejection happens somewhere else entirely, so your `catch` is dead code.

This project had exactly this bug: duplicate emails returned `500` instead of `409`. PHP is synchronous, so there is no Laravel equivalent — this is a pure JavaScript trap.

---

## Common Prisma error codes

| Code | Meaning | Map to |
|------|---------|--------|
| `P2002` | Unique constraint failed | `ConflictException` 409 |
| `P2025` | Record not found | `NotFoundException` 404 |
| `P2003` | Foreign key constraint failed | `BadRequestException` 400 |

---

## ⚠️ Open bugs in this project

Prisma has **no `findOrFail`** — it returns `null`.

```ts
// current — returns 200 with an empty body for a missing user
findOne(id: number) {
  return this.prisma.user.findUnique({ where: { id }, select: publicUserFields });
}

// fix
async findOne(id: number) {
  const user = await this.prisma.user.findUnique({
    where: { id }, select: publicUserFields,
  });
  if (!user) throw new NotFoundException(`User ${id} not found`);
  return user;
}
```

`remove()` has the same gap — deleting a missing id throws `P2025` uncaught, giving a `500` where it should be `404`.

---

## Next step: exception filters

Right now every service repeats its own try/catch. An **exception filter** is Nest's `App\Exceptions\Handler` — one class that maps every Prisma error code to the right HTTP status, applied globally. That removes the try/catch from `users.service.ts` entirely.

→ Next: [Glossary](./99-glossary.md)
