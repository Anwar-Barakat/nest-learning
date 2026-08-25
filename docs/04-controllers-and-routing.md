# 04 · Controllers & Routing

## Routing lives on the class, not in a routes file

Laravel declares routes in `routes/api.php`. Nest puts them on the controller itself — closer to Symfony attributes.

```php
// Laravel
Route::prefix('users')->group(function () {
    Route::get('/', [UsersController::class, 'index']);
    Route::get('/{id}', [UsersController::class, 'show']);
});
```

```ts
// NestJS — users.controller.ts
@Controller('users')          // prefix
export class UsersController {
  @Get()      findAll() {}    // GET /users
  @Get(':id') findOne() {}    // GET /users/:id
}
```

There is no route file to keep in sync. The tradeoff: no `php artisan route:list` — but Nest logs every mapped route at startup.

---

## ⚠️ `@Body()` is not optional

```ts
// ❌ dto is undefined → TypeError
login(dto: LoginDto) {}

// ✅
login(@Body() dto: LoginDto) {}
```

**Why Laravel doesn't need this:** PHP keeps type hints at runtime, so the container reads `LoginRequest` and builds it.

**Why Nest does:** TypeScript types are erased at compile time.

```js
// what actually runs — nothing tells Nest where to get this value
login(dto) { return this.authService.login(dto); }
```

No decorator → no instruction → nothing passed → `undefined`.

---

## Declare which part of the request you want

Laravel hands you the whole request and you dig inside. Nest asks you to say up front.

```php
// Laravel
public function update(Request $request, $id) {
    $body  = $request->all();
    $sort  = $request->query('sort');
    $token = $request->header('Authorization');
}
```

```ts
// NestJS
update(
  @Body()                   body: UpdateUserDto,
  @Param('id')              id: number,
  @Query('sort')            sort: string,
  @Headers('authorization') token: string,
) {}
```

The signature becomes documentation — you can read a handler and know what it consumes without reading its body.

| Laravel | NestJS |
|---------|--------|
| `$request->all()` | `@Body()` |
| `$request->input('x')` | `@Body('x')` |
| `{id}` route param | `@Param('id')` |
| `$request->query('x')` | `@Query('x')` |
| `$request->header('x')` | `@Headers('x')` |
| `$request` | `@Req()` — avoid, couples you to Express |

---

## Status codes

Nest returns `200` by default, and **`201` for `@Post`** — matching Laravel's `response()->json($x, 201)` convention. Override with `@HttpCode(204)`.

---

## This project

```ts
// users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()                                  // POST /users — public
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @UseGuards(JwtAuthGuard)                 // 🔒
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }
}
```

> ⚠️ **Open bug:** `@Param('id') id: number` has no pipe. `/users/abc` becomes `NaN`, reaches Prisma, and returns `500`. Fix in [07 · Pipes](./07-pipes.md).

Controllers should stay thin — parse the request, call a service, return. All logic lives in providers, exactly as in Laravel.

→ Next: [Providers & DI](./05-providers-and-di.md)
