# 03 · Modules

A `@Module` is roughly a **Laravel Service Provider** — it declares what exists and what is shared.

## The four keys

```ts
@Module({
  imports:     [],   // other modules whose exports I need
  controllers: [],   // routes this module owns
  providers:   [],   // services this module can inject
  exports:     [],   // what OTHER modules may inject from me
})
```

## ⚠️ Providers are private by default

**This is the #1 beginner error, and you already hit it.**

Laravel's container is global — bind something once and anyone can resolve it. Nest is scoped: importing a module only gives you what that module explicitly `exports`.

```ts
// users.module.ts
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],   // ← without this, AuthService cannot inject it
})
export class UsersModule {}
```

Miss it and you get:

```
Nest can't resolve dependencies of the AuthService (?, JwtService)
```

**Read that error like this:** the `?` marks the position of the argument it couldn't resolve. Count the constructor parameters — position 1 is `UsersService`. Almost always the fix is a missing `exports`.

## `@Global()` — skip the ceremony

```ts
// prisma/prisma.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Now any module can inject `PrismaService` without importing `PrismaModule`. Closest Laravel analogy: a singleton bound in `AppServiceProvider`.

Use sparingly — one or two per app (database, config). Global providers hide their own dependency graph.

## Async configuration

When a module needs values from config, use the `registerAsync` form:

```ts
// auth.module.ts
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('JWT_SECRET'),
    signOptions: { expiresIn: '1d' },
  }),
}),
```

`imports` + `inject` + `useFactory` is worth learning as **one unit** — it is how every configurable Nest module accepts settings (TypeORM, Mongoose, Bull, cache, mailer). Learn the shape once, configure anything.

Why not `process.env.JWT_SECRET`? That reads the variable when the *file is imported*. This reads it through DI when the *module is instantiated* — later, controllable, and mockable in tests.

## This project

```
AppModule
├── ConfigModule   (isGlobal: true)
├── PrismaModule   (@Global)
├── UsersModule    → exports UsersService
└── AuthModule     → imports UsersModule
```

→ Next: [Controllers & routing](./04-controllers-and-routing.md)
