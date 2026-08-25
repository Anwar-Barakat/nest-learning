# 06 · DTOs & Validation

## A Form Request, split in two

A Laravel Form Request does two jobs: **holds** the rules and **enforces** them. Nest separates these.

```php
// Laravel — rules AND enforcement in one class
class CreateUserRequest extends FormRequest {
    public function rules(): array {
        return [
            'name'     => 'required|string|min:2',
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ];
    }
}
// Type-hinting it in the controller validates automatically → 422
```

```ts
// NestJS — the DTO holds the rules
export class CreateUserDto {
  @IsString() @IsNotEmpty() @MinLength(2)
  name: string;

  @IsEmail() @IsNotEmpty()
  email: string;

  @IsString() @IsNotEmpty() @MinLength(6)
  password: string;
}
```

```ts
// ...and a Pipe enforces them — main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

## ⚠️ The consequence of splitting

Because the DTO only **declares** rules, forgetting `useGlobalPipes` means **every validator silently does nothing**. No error, no warning — invalid data sails straight through.

In Laravel this cannot happen: the Form Request validates itself.

If validation ever seems ignored, check `main.ts` first.

---

## What the options do

| Option | Laravel equivalent | Effect |
|--------|--------------------|--------|
| `whitelist: true` | `$request->validated()` | Strips any property with no decorator |
| `forbidNonWhitelisted: true` | `prohibited` rule | Rejects instead of silently stripping |
| `transform: true` | casts / mutators | Turns plain JSON into a real DTO instance |

`whitelist` matters for security. Without it, `{ "name": "x", "isAdmin": true }` would pass the extra field through to `prisma.user.create()`. It is Nest's answer to mass assignment — the job Eloquent's `$fillable` does.

---

## Rule translation

| Laravel | class-validator |
|---------|-----------------|
| `required` | `@IsNotEmpty()` |
| `string` | `@IsString()` |
| `email` | `@IsEmail()` |
| `min:6` (string) | `@MinLength(6)` |
| `min:6` (number) | `@Min(6)` |
| `nullable` | `@IsOptional()` |
| `confirmed` | `@Match('password')` (custom) |
| `unique:users` | ❌ none — DB constraint + catch `P2002` |

**`unique` has no equivalent** because class-validator never touches the database. This project handles it in the service instead — see [12 · Exceptions](./12-exceptions.md).

---

## Error shape

```jsonc
// 400 Bad Request
{
  "message": [
    "name must be longer than or equal to 2 characters",
    "email must be an email"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

Note: Nest returns **400**, Laravel returns **422**. Same meaning, different convention.

---

## Update DTOs

```ts
// ❌ current — src/users/dto/update-user.dto.ts, no validation at all
export class UpdateUserDto {
  email?: string;
  name?: string;
}

// ✅ inherits every rule from CreateUserDto, makes each optional
import { PartialType } from '@nestjs/mapped-types';
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

`PartialType` is Nest's `sometimes` — one line instead of a duplicated rule set.

→ Next: [Pipes](./07-pipes.md)
