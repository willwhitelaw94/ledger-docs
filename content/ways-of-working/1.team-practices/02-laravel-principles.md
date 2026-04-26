---
title: "Laravel Principles"
description: "DHH and Taylor Otwell philosophies for building exceptional monolithic applications"
---

Core principles that guide all feature development in the TC Portal, based on DHH (David Heinemeier Hansson) and Taylor Otwell's philosophies for building exceptional monolithic applications.

---

## DHH Principles

### 1. The Majestic Monolith
**Philosophy:** Build integrated, cohesive applications. No microservices unless absolutely necessary.

**In Practice:**
- All features live within the main Laravel application
- Use domain-driven design folders, not separate services
- Share database, leverage transactions
- Use jobs for async work, not separate services

**Example:**
```
✅ GOOD: /domain/Funding/Actions/ProcessRolloverAction.php
❌ BAD:  /microservices/rollover-service/
```

---

### 2. Convention Over Configuration
**Philosophy:** Follow established patterns. Reduce decision fatigue.

**In Practice:**
- Use Laravel conventions (migrations, models, controllers)
- Follow existing domain patterns in the codebase
- Use standard naming (FundingRollover, not FundingCarryover)
- Leverage Laravel's magic (relationships, scopes, accessors)

**Example:**
```php
// ✅ GOOD: Follows Laravel conventions
class FundingRollover extends Model
{
    public function sourceFunding(): BelongsTo
    {
        return $this->belongsTo(Funding::class, 'source_funding_id');
    }
}

// ❌ BAD: Custom relationship handling
class FundingRollover extends Model
{
    public function getSourceFunding()
    {
        return DB::table('fundings')->find($this->source_funding_id);
    }
}
```

---

### 3. Progress Over Perfection
**Philosophy:** Ship MVP, iterate based on feedback. Avoid analysis paralysis.

**In Practice:**
- Build V1 with core functionality
- Add manual overrides as escape hatches
- Use feature flags for gradual rollout
- Gather feedback, then enhance

**Example:**
```
V1: Automatic rollover calculation
V2: Add manual override form
V3: Add rollover forecasting
V4: Add AI-powered recommendations
```

---

### 4. Optimize for Happiness
**Philosophy:** Developer experience and user experience matter equally.

**In Practice:**
- Write readable, self-documenting code
- Use meaningful variable names
- Add helpful error messages
- Build intuitive UIs
- Minimize cognitive load

**Example:**
```php
// ✅ GOOD: Clear, readable
$rolloverAmount = max(
    $minimumRolloverAmount,
    $unusedAmount * $rolloverPercentage
);

// ❌ BAD: Cryptic
$ra = max($min, $ua * $rp);
```

---

### 5. Code is Read More Than Written
**Philosophy:** Optimize for readability and maintainability.

**In Practice:**
- Use descriptive names (methods, classes, variables)
- Extract complex logic into well-named methods
- Add comments for "why," not "what"
- Keep methods short (< 20 lines ideal)
- Single responsibility principle

**Example:**
```php
// ✅ GOOD: Clear, self-documenting
public function calculateRolloverAmount(float $unusedAmount): float
{
    $tenPercentOfUnused = $unusedAmount * 0.10;
    $minimumRollover = 1000;

    return max($minimumRollover, $tenPercentOfUnused);
}

// ❌ BAD: Requires mental parsing
public function calc($amt): float
{
    return max(1000, $amt * 0.1);
}
```

---

### 6. Boring Technology
**Philosophy:** Use proven, stable tools. Avoid shiny object syndrome.

**In Practice:**
- Laravel core features (jobs, queues, events, cache)
- PostgreSQL (not experimental databases)
- Vue 3 (not bleeding-edge framework)
- Tailwind CSS (not custom CSS framework)

**Example:**
```
✅ GOOD: Laravel Jobs + Horizon
❌ BAD:  Custom queue system with Node.js worker
```

---

### 7. Integrated Systems
**Philosophy:** Favor integration over isolation. Share state, leverage the framework.

**In Practice:**
- Use Laravel's event system for decoupling
- Share models and relationships across domains
- Use database transactions for consistency
- Leverage Inertia for seamless frontend/backend integration

**Example:**
```php
// ✅ GOOD: Integrated, leverages Laravel
DB::transaction(function () use ($rollover) {
    $rollover->update(['status' => 'applied']);
    $funding->increment('rollover_added_amount', $rollover->amount);
    event(new RolloverApplied($rollover));
});

// ❌ BAD: Isolated, custom logic
$this->updateRolloverStatus($rollover->id, 'applied');
$this->incrementFunding($funding->id, $rollover->amount);
$this->sendRolloverEvent($rollover->id);
```

---

## Taylor Otwell Principles (Laravel Philosophy)

### 1. Elegant Syntax
**Philosophy:** Code should be beautiful and expressive.

**In Practice:**
- Use fluent interfaces
- Chain methods naturally
- Leverage Laravel's helpers
- Use collections over raw arrays

**Example:**
```php
// ✅ GOOD: Elegant, expressive
$eligibleRollovers = Funding::query()
    ->where('funding_stream_id', $onFundingStream->id)
    ->whereHas('fundingQuarters', fn($q) => $q->where('quarter_id', $quarter->id))
    ->with('fundingQuarters')
    ->get()
    ->filter(fn($funding) => $funding->unusedAmount() > 0)
    ->map(fn($funding) => [
        'funding' => $funding,
        'unused_amount' => $funding->unusedAmount(),
    ]);

// ❌ BAD: Verbose, imperative
$fundings = DB::select("SELECT * FROM fundings WHERE funding_stream_id = ?", [$id]);
$result = [];
foreach ($fundings as $funding) {
    $quarters = DB::select("SELECT * FROM funding_quarters WHERE funding_id = ?", [$funding->id]);
    $unused = $funding->total - $funding->used;
    if ($unused > 0) {
        $result[] = ['funding' => $funding, 'unused_amount' => $unused];
    }
}
```

---

### 2. Developer Joy
**Philosophy:** Make developers' lives easier and more enjoyable.

**In Practice:**
- Use Artisan commands for common tasks
- Leverage factories for testing
- Use migrations for schema changes
- Clear error messages with helpful hints

**Example:**
```php
// ✅ GOOD: Helpful error message
throw new RolloverException(
    "Cannot apply rollover: target funding not found for quarter {$targetQuarter->name}. " .
    "Please ensure funding has been synced from Services Australia."
);

// ❌ BAD: Cryptic error
throw new Exception("Rollover failed");
```

---

### 3. Sensible Defaults
**Philosophy:** Provide smart defaults, allow customization.

**In Practice:**
- Default configuration in config files
- Override via environment variables
- Reasonable defaults that work for 80% of cases

**Example:**
```php
// config/funding-rollover.php
return [
    'enabled' => env('FUNDING_ROLLOVER_ENABLED', true),
    'minimum_amount' => env('FUNDING_ROLLOVER_MINIMUM', 1000),
    'rollover_percentage' => env('FUNDING_ROLLOVER_PERCENTAGE', 0.10),
    'days_after_quarter_end' => env('FUNDING_ROLLOVER_DAYS_AFTER', 1),
];
```

---

### 4. Expressive ORMs
**Philosophy:** Eloquent should feel natural, like talking to the database.

**In Practice:**
- Use Eloquent relationships
- Define scopes for common queries
- Use accessors/mutators for computed properties
- Eager load to avoid N+1

**Example:**
```php
// ✅ GOOD: Expressive, uses Eloquent
class FundingRollover extends Model
{
    public function scopePending(Builder $query): void
    {
        $query->where('status', 'pending');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}

$pendingRollovers = FundingRollover::pending()
    ->with(['sourceFunding', 'targetQuarter'])
    ->get();

// ❌ BAD: Raw SQL, loses Eloquent benefits
$rollovers = DB::select("
    SELECT * FROM funding_rollovers
    WHERE status = 'pending'
");
```

---

### 5. Testing is First-Class
**Philosophy:** Testing should be easy and encouraged.

**In Practice:**
- Use factories for test data
- Parallel testing with Pest or PHPUnit
- Clear test names that describe behavior
- Test-driven development when appropriate

**Example:**
```php
// ✅ GOOD: Clear, descriptive test
/** @test */
public function rollover_applies_minimum_of_1000_when_10_percent_is_less()
{
    $funding = Funding::factory()->create([
        'services_australia_total_amount' => 10000,
    ]);
    $funding->fundingQuarters()->create([
        'quarter_id' => 1,
        'total_amount' => 10000,
        'used_services_amount' => 8000,
        'used_fees_amount' => 0,
    ]);

    $action = new CalculateFundingRolloverAction();
    $result = $action->execute($funding, Quarter::find(1), 2000);

    $this->assertEquals(1000, $result['rollover_amount']);
    $this->assertTrue($result['is_minimum_applied']);
}

// ❌ BAD: Unclear test
public function test_rollover()
{
    $r = $this->calc(2000);
    $this->assertEquals(1000, $r);
}
```

---

### 6. Purposeful Abstractions
**Philosophy:** Abstract when it adds clarity, not for its own sake.

**In Practice:**
- Action classes for complex business logic
- DTOs (Laravel Data) for structured data
- Services for cross-domain logic
- Avoid over-abstraction

**Example:**
```php
// ✅ GOOD: Purposeful abstraction
class CreateFundingRolloverAction
{
    public function execute(CreateFundingRolloverData $data): FundingRollover
    {
        return FundingRollover::create([
            'uuid' => Str::uuid(),
            'package_id' => $data->packageId,
            'source_funding_id' => $data->sourceFundingId,
            'target_quarter_id' => $data->targetQuarterId,
            'unused_amount' => $data->unusedAmount,
            'rollover_amount' => $data->rolloverAmount,
            'status' => 'pending',
        ]);
    }
}

// ❌ BAD: Over-abstraction
interface RolloverCreatorInterface { ... }
class RolloverCreatorFactory { ... }
class AbstractRolloverCreator implements RolloverCreatorInterface { ... }
class ConcreteRolloverCreator extends AbstractRolloverCreator { ... }
```

---

## Laravel Data Patterns

### Use Laravel Data for:
1. **Request validation and transformation**
2. **Structured DTOs passed to actions**
3. **API responses**
4. **Type-safe data transfer**

### Pattern
```php
use Spatie\LaravelData\Data;

class CreateRolloverData extends Data
{
    public function __construct(
        public int $packageId,
        public int $sourceFundingId,
        public int $sourceQuarterId,
        public int $targetQuarterId,
        public float $unusedAmount,
        public float $rolloverAmount,
        public string $triggerType,
        public ?int $triggeredBy,
        public ?string $notes,
    ) {}

    public static function rules(): array
    {
        return [
            'packageId' => ['required', 'exists:packages,id'],
            'sourceFundingId' => ['required', 'exists:fundings,id'],
            'sourceQuarterId' => ['required', 'exists:quarters,id'],
            'targetQuarterId' => ['required', 'exists:quarters,id'],
            'unusedAmount' => ['required', 'numeric', 'min:0'],
            'rolloverAmount' => ['required', 'numeric', 'min:0'],
            'triggerType' => ['required', 'in:automatic,manual,sync'],
            'triggeredBy' => ['nullable', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

// Usage in controller
public function store(CreateRolloverRequest $request, CreateRolloverAction $action)
{
    $rollover = $action->execute(
        CreateRolloverData::from($request)
    );

    return response()->json($rollover, 201);
}
```

---

## Event Sourcing Patterns

### When to Use Event Sourcing
- Financial transactions (audit trail required)
- State changes that need to be replayed
- Compliance and regulatory requirements
- Complex business logic with multiple states

### Pattern
```php
// Aggregate Root
class FundingAggregateRoot extends AggregateRoot
{
    public function addRollover(float $amount, int $sourceQuarterId): self
    {
        $this->recordThat(new FundingRolloverAdded(
            amount: $amount,
            sourceQuarterId: $sourceQuarterId,
            timestamp: now()
        ));

        return $this;
    }

    protected function applyFundingRolloverAdded(FundingRolloverAdded $event): void
    {
        $this->rolloverAddedAmount += $event->amount;
    }
}

// Usage
$aggregate = FundingAggregateRoot::retrieve($funding->external_id);
$aggregate->addRollover(1000, $quarter->id)->persist();
```

---

## UI/UX Patterns

### Inertia.js + Vue 3
- Server-side data passing (no API calls from frontend)
- Form handling with Inertia form helpers
- Shared layouts
- TypeScript for type safety

### Pattern
```typescript
// Page component
<script setup lang="ts">

interface Props {
  rollover: Rollover
  funding: Funding
}

const props = defineProps<Props>()

const form = useForm({
  rollover_amount: props.rollover.suggested_amount,
  notes: '',
})

const submit = () => {
  form.post(route('rollovers.store'), {
    onSuccess: () => {
      // Handle success
    },
  })
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="form.rollover_amount" type="number" />
    <textarea v-model="form.notes"></textarea>
    <button :disabled="form.processing">Create Rollover</button>
  </form>
</template>
```

---

## Accessibility First

### MUST Follow
- Full keyboard navigation (per WAI-ARIA APG)
- Visible focus indicators
- Semantic HTML (`<button>`, `<a>`, `<label>`)
- ARIA labels for icon-only buttons
- Color + icon/text (not color alone)
- Meet WCAG 2.1 Level AA contrast

### Pattern
```vue
<!-- ✅ GOOD: Accessible -->
<button
  type="button"
  @click="openModal"
  aria-label="Create manual rollover"
  class="focus:ring-2 focus:ring-blue-500"
>
  <PlusIcon class="h-5 w-5" aria-hidden="true" />
  <span>Create Rollover</span>
</button>

<!-- ❌ BAD: Not accessible -->
<div @click="openModal" class="cursor-pointer">
  <PlusIcon />
</div>
```

---

## Performance Principles

### Database
- Index foreign keys and frequently queried columns
- Eager load relationships (avoid N+1)
- Use database transactions for consistency
- Chunk large queries

### Queues
- Queue long-running jobs (> 1 second)
- Use Horizon for monitoring
- Implement job retries with exponential backoff

### Caching
- Cache static data (funding streams, quarters)
- Use cache tags for group invalidation
- Cache computed values (funding utilization)

### Frontend
- Lazy load images
- Virtualize long lists
- Optimize re-renders (Vue reactivity)

---

## Testing Strategy

### What to Test
1. **Unit Tests:** Actions, calculations, business logic
2. **Feature Tests:** API endpoints, form submissions, workflows
3. **Integration Tests:** Jobs, event sourcing, external APIs
4. **E2E Tests:** Critical user flows

### Coverage Target
- **> 90% for business logic (actions, models)**
- **> 80% overall**

### Pattern
```php
// Unit test
class CalculateFundingRolloverActionTest extends TestCase
{
    /** @test */
    public function it_applies_minimum_rollover_of_1000()
    {
        $action = new CalculateFundingRolloverAction();

        $result = $action->execute(
            funding: Funding::factory()->make(),
            sourceQuarter: Quarter::factory()->make(),
            unusedAmount: 2000
        );

        $this->assertEquals(1000, $result['rollover_amount']);
        $this->assertTrue($result['is_minimum_applied']);
    }
}

// Feature test
class CreateRolloverTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function care_coordinator_can_create_manual_rollover()
    {
        $user = User::factory()->careCoordinator()->create();
        $package = Package::factory()->create();
        $funding = Funding::factory()->for($package)->create();

        $response = $this->actingAs($user)
            ->postJson(route('rollovers.store'), [
                'package_id' => $package->id,
                'source_funding_id' => $funding->id,
                'rollover_amount' => 1500,
                'notes' => 'Participant was hospitalized',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('funding_rollovers', [
            'package_id' => $package->id,
            'rollover_amount' => 1500,
            'trigger_type' => 'manual',
        ]);
    }
}
```

---

## Documentation Principles

### Code Comments
- Comment "why," not "what"
- Add comments for non-obvious business rules
- Use PHPDoc for method signatures

### User Documentation
- User guides for care coordinators
- Admin guides for configuration
- API documentation (OpenAPI/Swagger)
- FAQ for common questions

### Technical Documentation
- Architecture diagrams (when helpful)
- Sequence diagrams for complex flows
- Database schema documentation
- Decision records (ADRs) for major decisions

---

## Gradual Rollout Strategy

### Always Use Feature Flags for:
- New features with business impact
- Changes to critical workflows
- Features that affect many users

### Rollout Stages
1. **Dev/Staging:** Full testing
2. **Beta (10%):** Selected users, daily monitoring
3. **Staged (50%):** Broader group, continue monitoring
4. **Full (100%):** All users, monitor for one release cycle

### Rollback Plan
- Feature flag can disable instantly
- Database migrations reversible
- Clear rollback criteria defined

---

## Error Handling

### Principles
- Fail loudly in dev, gracefully in prod
- Log errors with context
- User-friendly error messages
- Provide recovery options

### Pattern
```php
try {
    $rollover = $this->applyRolloverAction->execute($rollover);
} catch (TargetFundingNotFoundException $e) {
    Log::error('Rollover application failed: target funding not found', [
        'rollover_uuid' => $rollover->uuid,
        'target_quarter_id' => $rollover->target_quarter_id,
        'exception' => $e,
    ]);

    return back()->with('error',
        'Cannot apply rollover: funding for the next quarter has not been created yet. ' .
        'Please sync funding from Services Australia first.'
    );
}
```

---

## Security Principles

### Authorization
- Use policies for model-level authorization
- Use gates for feature-level authorization
- Never trust user input

### Input Validation
- Always validate with Laravel Data or Form Requests
- Sanitize outputs (XSS prevention)
- Use prepared statements (Eloquent does this)

### Pattern
```php
// Policy
class FundingRolloverPolicy
{
    public function create(User $user, Package $package): bool
    {
        return $user->can('manage-package', $package)
            && $user->hasRole(['care_coordinator', 'admin']);
    }

    public function cancel(User $user, FundingRollover $rollover): bool
    {
        return $rollover->isPending()
            && $user->hasRole('admin');
    }
}

// Controller
public function cancel(FundingRollover $rollover)
{
    $this->authorize('cancel', $rollover);

    $rollover->update(['status' => 'cancelled']);

    return redirect()->back()->with('success', 'Rollover cancelled.');
}
```

---

## Monitoring and Observability

### What to Monitor
- Job success/failure rates
- API response times
- Database query performance
- Business metrics (rollover amounts, success rates)

### Tools
- Laravel Log (daily rotation)
- Sentry (error tracking)
- Laravel Horizon (queue monitoring)
- Custom metrics dashboard

### Pattern
```php
// Log with context
Log::info('Rollover applied', [
    'rollover_uuid' => $rollover->uuid,
    'package_id' => $rollover->package_id,
    'rollover_amount' => $rollover->rollover_amount,
    'applied_at' => $rollover->applied_at,
]);

// Custom metric
Metrics::increment('funding_rollovers_applied', [
    'trigger_type' => $rollover->trigger_type,
    'amount_category' => $this->categorizeAmount($rollover->rollover_amount),
]);
```

---

## Summary Checklist

When planning a new feature, ensure:

- [ ] Fits within the majestic monolith (no microservices)
- [ ] Follows Laravel conventions
- [ ] Uses Laravel Data for DTOs
- [ ] Event sourcing for audit-critical logic
- [ ] Action classes for business logic
- [ ] Accessible UI (WCAG 2.1 AA)
- [ ] Performance optimized (indexes, eager loading, queues)
- [ ] Comprehensive tests (>90% coverage for logic)
- [ ] User documentation planned
- [ ] Feature flag for gradual rollout
- [ ] Authorization via policies/gates
- [ ] Error handling with helpful messages
- [ ] Monitoring and logging in place

---

These principles should guide every feature decision in the TC Portal.
