# NestJS for Laravel Developers

Learning notes built from **this project**. Every code sample is real code from `src/`.

## Reading order

| # | File | Covers |
|---|------|--------|
| 01 | [Mental model](./01-mental-model.md) | The big picture + two words that mean the wrong thing |
| 02 | [Request lifecycle](./02-request-lifecycle.md) | What happens between HTTP and your method |
| 03 | [Modules](./03-modules.md) | `@Module`, `exports`, `@Global` |
| 04 | [Controllers & routing](./04-controllers-and-routing.md) | `@Controller`, `@Body`, `@Param` |
| 05 | [Providers & DI](./05-providers-and-di.md) | `@Injectable`, constructor injection |
| 06 | [DTOs & validation](./06-dto-and-validation.md) | Form Requests, split in two |
| 07 | [Pipes](./07-pipes.md) | Validate **and** transform |
| 08 | [Database (Prisma)](./08-database-prisma.md) | Prisma vs Eloquent |
| 09 | [Authentication](./09-authentication.md) | JWT, bcrypt, login |
| 10 | [Guards & strategies](./10-guards-and-strategies.md) | Protecting routes |
| 11 | [Custom decorators](./11-custom-decorators.md) | Building `@CurrentUser()` |
| 12 | [Exceptions](./12-exceptions.md) | `abort()` equivalents |
| 99 | [Glossary](./99-glossary.md) | Full translation table |

## This project

```
src/
├── main.ts                  bootstrap + global ValidationPipe
├── app.module.ts            root module
├── prisma/
│   ├── prisma.module.ts     @Global — PrismaService available everywhere
│   └── prisma.service.ts    extends PrismaClient, opens/closes connection
├── users/
│   ├── users.module.ts      exports UsersService so auth can use it
│   ├── users.controller.ts  /users routes
│   ├── users.service.ts     database logic
│   └── dto/                 validation rules
└── auth/
    ├── auth.module.ts       wires JWT + Passport
    ├── auth.controller.ts   /auth/login, /auth/me
    ├── auth.service.ts      password check + token signing
    ├── strategies/          HOW a token is verified
    ├── guards/              WHERE that verification applies
    └── decorators/          @CurrentUser()
```

## Routes

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| `POST` | `/users` | public | `UsersController.create` |
| `GET` | `/users` | 🔒 | `UsersController.findAll` |
| `GET` | `/users/:id` | 🔒 | `UsersController.findOne` |
| `DELETE` | `/users/:id` | 🔒 | `UsersController.remove` |
| `POST` | `/auth/login` | public | `AuthController.login` |
| `GET` | `/auth/me` | 🔒 | `AuthController.me` |

## Not yet in this project

Added as we build them:

- Exception filters — one place to map Prisma errors to HTTP codes
- Interceptors — response shaping, logging
- `@Public()` + `Reflector` — custom metadata
- Testing — `Test.createTestingModule`
- Swagger
