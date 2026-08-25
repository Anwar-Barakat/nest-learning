# 99 · Glossary

## Full translation table

| Laravel | NestJS | Note |
|---------|--------|------|
| Controller | `@Controller()` | Same idea |
| Service in container | `@Injectable()` provider | Constructor injection in both |
| Service Provider | `@Module()` | Nest must explicitly `exports` |
| Facade (`Auth::`, `DB::`) | ❌ none | Everything via constructor |
| `routes/api.php` | Decorators on the controller | No separate route file |
| `$request->all()` | `@Body()` | Required — TS types are erased |
| `$request->input('x')` | `@Body('x')` | |
| Route param `{id}` | `@Param('id')` | |
| `$request->query('x')` | `@Query('x')` | |
| `$request->header('x')` | `@Headers('x')` | |
| `$request` | `@Req()` | Avoid — couples you to Express |
| Form Request `rules()` | DTO + class-validator | Rules live on the DTO |
| Form Request enforcement | `ValidationPipe` | Must be registered or rules do nothing |
| `$request->validated()` | `whitelist: true` | |
| `$fillable` | `whitelist: true` | Mass-assignment protection |
| `whereNumber('id')` | `ParseIntPipe` | |
| Route model binding | Custom transforming pipe | No built-in equivalent |
| `middleware('auth:api')` | `@UseGuards()` | **Nest calls this a Guard** |
| Guard driver in `config/auth.php` | Strategy class | **Laravel calls this a Guard** |
| `UserProvider::retrieveById()` | `validate()` in the strategy | Identifier → user |
| `auth()->user()` | `@CurrentUser()` | No global — you build it |
| `auth()->id()` | `@CurrentUser('id')` | |
| Global middleware (`Kernel.php`) | Nest middleware / global guards | |
| Terminable middleware | Interceptor | Wraps before **and** after |
| `App\Exceptions\Handler` | Exception filter | |
| `abort(404)` | `throw new NotFoundException()` | |
| `Hash::make()` | `bcrypt.hash(x, 10)` | |
| `Hash::check()` | `bcrypt.compare()` | |
| Eloquent | Prisma | **Not** Active Record |
| `$hidden` | `select: {...}` | Allow-list, not deny-list |
| `php artisan migrate` | `npx prisma migrate dev` | |
| `php artisan tinker` | `npx prisma studio` | |
| `.env` | `.env` + `ConfigService` | Same file, injected access |
| `config()` helper | `configService.get()` | |
| `php artisan serve` | `npm run start:dev` | |

---

## Concepts with no equivalent

| Concept | Why |
|---------|-----|
| **Interceptor** | Wraps a handler before *and* after — response shaping, logging, caching |
| **`ExecutionContext`** | Nest is transport-agnostic (HTTP / WS / gRPC); Laravel is HTTP-first |
| **Lifecycle hooks** | Node is long-lived; PHP is request-scoped |
| **Module `exports`** | Laravel's container is global; Nest's is scoped |

---

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run start:dev` |
| Build | `npm run build` |
| Production | `npm run start:prod` |
| Typecheck | `npx tsc --noEmit -p tsconfig.build.json` |
| New migration | `npx prisma migrate dev --name x` |
| Apply migrations | `npx prisma migrate deploy` |
| Migration status | `npx prisma migrate status` |
| Regenerate client | `npx prisma generate` |
| Database GUI | `npx prisma studio` |
| Start Postgres | `brew services start postgresql@16` |

---

## Error decoder

| Symptom | Cause |
|---------|-------|
| `Nest can't resolve dependencies of X (?, …)` | Missing `exports` in the providing module |
| `Cannot read properties of undefined` in a handler | Missing `@Body()` / `@Param()` |
| Every protected route returns bare `401` | Strategy not in `providers`, or name mismatch |
| Validation silently ignored | `useGlobalPipes` missing from `main.ts` |
| `500` on a duplicate insert | Missing `await` inside `try` |
| `500` on `/users/abc` | Missing `ParseIntPipe` |
| `column does not exist` | Schema edited without `prisma migrate dev` |
| `P1001: can't reach database` | Postgres not running |
| Route returns `404` but the code looks right | Controller missing from the module's `controllers` array |
| `/users/me` hits `findOne()` with `id="me"` | `@Get(':id')` declared above `@Get('me')` |
| `Added the required column … not possible if the table is not empty` | New required column, existing rows — use `?` or `@default` |

---

## Open items in this project

| Item | File | Doc |
|------|------|-----|
| `ParseIntPipe` on `:id` | `users.controller.ts` | [07](./07-pipes.md) |
| `NotFoundException` in `findOne` / `remove` | `users.service.ts` | [12](./12-exceptions.md) |
| `UpdateUserDto` has no validation | `dto/update-user.dto.ts` | [06](./06-dto-and-validation.md) |
| No `@Patch` route | `users.controller.ts` | [04](./04-controllers-and-routing.md) |
| `.env` tracked in git | — | rotate `JWT_SECRET`, `git rm --cached .env` |
| Rename `access` → `access_token` | `auth.service.ts` | convention |
