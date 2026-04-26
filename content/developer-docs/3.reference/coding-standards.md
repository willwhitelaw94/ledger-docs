---
title: Coding Standards
description: Development conventions, Laravel patterns, and coding guidelines for TC Portal
---

Development conventions and coding standards for TC Portal. These guidelines ensure consistency across the codebase and follow Laravel best practices.

---

## Tech Stack & Versions

| Package | Version | Purpose |
|---------|---------|---------|
| PHP | 8.3 | Runtime |
| Laravel | v12 | Framework |
| Inertia.js | v2 | SPA bridge |
| Vue | v3 | Frontend framework |
| Tailwind CSS | v3 | Styling |
| Pest | v3 | Testing |
| Laravel Pint | v1 | Code formatting |
| Laravel Pennant | v1 | Feature flags |
| Laravel Horizon | v5 | Queue monitoring |
| Laravel Nova | v5 | Admin panel |
| Laravel Sanctum | v4 | API authentication |
| Laravel Scout | v10 | Search |

---

## PHP Conventions

### Curly Braces

Always use curly braces for control structures, even for single-line bodies:

```php
// Good
if ($condition) {
    return true;
}

// Bad
if ($condition) return true;
```

### Constructor Property Promotion

Use PHP 8 constructor property promotion:

```php
// Good
public function __construct(
    public GitHub $github,
    public string $apiKey,
) {}

// Bad
public function __construct(GitHub $github)
{
    $this->github = $github;
}
```

Do not allow empty `__construct()` methods with zero parameters unless the constructor is private.

### Type Declarations

Always use explicit return types and parameter type hints:

```php
protected function isAccessible(User $user, ?string $path = null): bool
{
    // ...
}
```

### Enums

Enum keys should be TitleCase:

```php
enum PaymentFrequency: string
{
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case Annually = 'annually';
}
```

### Comments & PHPDoc

- Prefer PHPDoc blocks over inline comments
- Never use comments within code unless logic is exceptionally complex
- Add array shape type definitions when appropriate:

```php
/**
 * @param array{name: string, email: string, role?: string} $data
 * @return array{id: int, created: bool}
 */
public function createUser(array $data): array
```

---

## Laravel Conventions

### Artisan Commands

- Use `php artisan make:` commands to create files (migrations, controllers, models, etc.)
- Use `php artisan make:class` for generic PHP classes
- Always pass `--no-interaction` to ensure commands work without user input

### Database & Eloquent

**Prefer Eloquent over raw queries:**

```php
// Good
User::query()
    ->where('status', 'active')
    ->with('packages')
    ->get();

// Bad
DB::table('users')
    ->where('status', 'active')
    ->get();
```

**Always use proper relationship methods with return type hints:**

```php
public function packages(): HasMany
{
    return $this->hasMany(Package::class);
}
```

**Prevent N+1 queries with eager loading:**

```php
// Good
$users = User::with('packages', 'contacts')->get();

// Bad
$users = User::all();
foreach ($users as $user) {
    $user->packages; // N+1 query
}
```

**Model casts should use the `casts()` method:**

```php
protected function casts(): array
{
    return [
        'email_verified_at' => 'datetime',
        'settings' => 'array',
    ];
}
```

### Model Creation

When creating new models, also create:
- Factory with useful states
- Seeder for development data

### Controllers & Validation

Always create Form Request classes for validation:

```php
// Good
public function store(StorePackageRequest $request): RedirectResponse
{
    // ...
}

// Bad
public function store(Request $request): RedirectResponse
{
    $request->validate([...]); // Inline validation
}
```

Check sibling Form Requests to see if the application uses array or string-based validation rules.

### Configuration

Never use `env()` outside of config files:

```php
// Good
config('app.name')

// Bad
env('APP_NAME')
```

### URL Generation

Prefer named routes:

```php
// Good
route('packages.show', $package)

// Bad
url('/packages/' . $package->id)
```

### Queues

Use `ShouldQueue` interface for time-consuming operations:

```php
class ProcessPackageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
}
```

---

## Laravel 12 Specifics

### Project Structure

This project upgraded from Laravel 10 without migrating to the new streamlined structure. **This is recommended by Laravel.**

| Component | Location |
|-----------|----------|
| Middleware | `app/Http/Middleware/` |
| Service Providers | `app/Providers/` |
| Middleware Registration | `app/Http/Kernel.php` |
| Exception Handling | `app/Exceptions/Handler.php` |
| Console Commands | `app/Console/Kernel.php` |
| Rate Limits | `RouteServiceProvider` or `Kernel.php` |

### Migration Column Changes

When modifying a column, include ALL previously defined attributes or they will be dropped:

```php
// If original column was:
$table->string('name')->nullable()->default('');

// When modifying, include all attributes:
$table->string('name', 100)->nullable()->default('')->change();
```

### Eager Loading Limits

Laravel 12 supports limiting eagerly loaded records natively:

```php
User::with(['packages' => fn($query) => $query->latest()->limit(10)])->get();
```

---

## Inertia.js Conventions

### Page Components

Components live in `resources/js/Pages/`. Use `Inertia::render()` for server-side routing:

```php
return Inertia::render('Packages/Show', [
    'package' => $package,
]);
```

### Vue Components

Vue components must have a single root element.

### Deferred Props

When using deferred props, add empty states with pulsing/animated skeletons.

### Inertia v2 Features

- Deferred props
- Infinite scrolling (merging props + `WhenVisible`)
- Lazy loading on scroll
- Polling
- Prefetching

---

## Testing with Pest

### Creating Tests

```bash
# Feature test (most common)
php artisan make:test PackageTest --pest

# Unit test
php artisan make:test PackageTest --pest --unit
```

### Running Tests

```bash
# Run all tests
php artisan test --compact

# Run specific test
php artisan test --compact --filter=testName

# Run specific file
php artisan test --compact tests/Feature/PackageTest.php
```

### Test Factories

Always use factories. Check for existing states before manually setting up models:

```php
// Good
$package = Package::factory()->active()->create();

// Bad
$package = Package::factory()->create(['status' => 'active']);
```

### Faker

Follow existing conventions for `$this->faker` vs `fake()`:

```php
$this->faker->word()
// or
fake()->randomDigit()
```

---

## Code Formatting

### Laravel Pint

Run before finalizing changes:

```bash
vendor/bin/pint --dirty
```

Do not run `--test`, just run Pint to fix issues directly.

---

## Feature Flags (Pennant)

Use Laravel Pennant for feature flag management. Feature availability can vary by organization or user type.

```php
use Laravel\Pennant\Feature;

if (Feature::active('new-dashboard')) {
    // Show new dashboard
}
```

Sync roles and permissions:

```bash
php artisan sync:roles-permissions
```

---

## Development Environment

### Laravel Herd

The application is served by Laravel Herd at `https://tc-portal.test`.

- Do not run commands to make the site available
- Site is always available through Herd

### Frontend Development

If changes aren't reflected in the UI:

```bash
npm run build
# or for development
npm run dev
# or
composer run dev
```

### Vite Errors

If you see `Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest`:

```bash
npm run build
```

---

## General Principles

### Naming

Use descriptive names:

```php
// Good
$isRegisteredForDiscounts
$hasActivePackage()

// Bad
$discount
$check()
```

### Code Reuse

Check for existing components before creating new ones.

### Directory Structure

Stick to existing directory structure. Don't create new base folders without approval.

### Dependencies

Do not change application dependencies without approval.

### Documentation

Only create documentation files if explicitly requested.

---

## Related

- [AWS Infrastructure](/developer-docs/explanation/aws-infrastructure) - System design
- [Testing](/developer-docs/how-to/testing) - Test strategy
- [Feature Flags](/developer-docs/how-to/feature-flags) - Pennant documentation
