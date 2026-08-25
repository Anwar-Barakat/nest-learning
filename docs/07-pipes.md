# 07 · Pipes

A pipe sits between the request and your method parameter. It does **two** jobs:

1. **Validate** — reject bad input
2. **Transform** — convert input into what your method wants

Laravel splits these across Form Requests (validate) and route model binding (transform). Nest treats them as one concept.

---

## Job 1 — validate

Covered in [06 · DTOs & validation](./06-dto-and-validation.md). `ValidationPipe` reads the decorators on your DTO and rejects with `400`.

---

## Job 2 — transform

This is the half with no Form Request equivalent.

```php
// Laravel
Route::get('/users/{id}')->whereNumber('id');       // constraint
Route::get('/users/{user}', fn (User $user) => $user); // route model binding
```

```ts
// NestJS
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.usersService.findOne(id);
}
```

`ParseIntPipe` ≈ `whereNumber()`. A custom transforming pipe ≈ route model binding.

---

## ⚠️ Open bug in this project

Route params arrive as **strings**. Always.

```ts
// current — users.controller.ts
findOne(@Param('id') id: number) {}   // ← the type is a lie
```

`transform: true` coerces with `+value`, so:

| Request | Becomes | Result |
|---------|---------|--------|
| `/users/1` | `1` | ✅ works |
| `/users/abc` | `NaN` | ❌ reaches Prisma → **500** |

`NaN` is a valid number, so nothing complains until the query fails.

**The fix:**

```ts
import { ParseIntPipe } from '@nestjs/common';

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) { ... }
```

Now `/users/abc` returns a clean `400` before your code runs:

```json
{ "message": "Validation failed (numeric string is expected)", "statusCode": 400 }
```

Apply it to `findOne` and `remove` in `users.controller.ts`.

---

## Built-in pipes

| Pipe | Use |
|------|-----|
| `ValidationPipe` | DTO validation (global here) |
| `ParseIntPipe` | `"1"` → `1` |
| `ParseBoolPipe` | `"true"` → `true` |
| `ParseUUIDPipe` | validates UUID format |
| `DefaultValuePipe` | fallback for missing query params |

```ts
@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number
```

Pipes compose left to right — default first, then parse.

---

## Three scopes

```ts
@Param('id', ParseIntPipe)                    // one parameter
@UsePipes(new ValidationPipe())               // one route or controller
app.useGlobalPipes(new ValidationPipe())      // whole app  ← this project
```

→ Next: [Database (Prisma)](./08-database-prisma.md)
