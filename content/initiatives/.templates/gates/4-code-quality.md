---
title: "Gate 4: Code Quality"
navigation: false
---

# Gate 4: Code Quality Gate

**Status**: :icon{name="circle-dotted" color="gray"} **PENDING**

**Key Question**: "Is it ready to inspect?"

Validates development work is complete and code quality standards are met before QA.

**Generated**: YYYY-MM-DD

---

## Code Quality

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | All tests pass | ⏳ Pending | `php artisan test --compact` |
| 2 | Code coverage >80% | ⏳ Pending | On new code |
| 3 | Linting clean (Pint) | ⏳ Pending | `vendor/bin/pint --test` |
| 4 | No console errors | ⏳ Pending | Browser console clean |
| 5 | No broken API calls | ⏳ Pending | All endpoints work |

## Laravel Best Practices

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | No hardcoded business rules in Vue | ⏳ Pending | Backend-powered |
| 2 | No magic number IDs | ⏳ Pending | Using Model constants |
| 3 | Laravel Data used for validation | ⏳ Pending | No Request in controllers |
| 4 | Model route binding used | ⏳ Pending | No int $id parameters |
| 5 | Common components pure | ⏳ Pending | Zero hardcoded logic |
| 6 | Using Lorisleiva Actions | ⏳ Pending | With AsAction trait |
| 7 | Data classes anemic | ⏳ Pending | Business logic in Actions/Models |
| 8 | Migrations schema-only | ⏳ Pending | No data insert/update/delete |
| 9 | DTO persistence explicit | ⏳ Pending | No ->toArray() into ORM |

## Vue TypeScript Best Practices

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Every component uses TypeScript | ⏳ Pending | `<script setup lang="ts">` |
| 2 | No 'any' types used | ⏳ Pending | |
| 3 | Every function has explicit return type | ⏳ Pending | |
| 4 | defineModel used for v-model | ⏳ Pending | Two-way binding |
| 5 | Separate type for defineProps | ⏳ Pending | Not inline |
| 6 | No prop drilling 3+ levels | ⏳ Pending | Use Pinia for deep state |

## Acceptance Criteria

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | All AC implemented | ⏳ Pending | Compare to spec.md |
| 2 | Edge cases handled | ⏳ Pending | Error/empty states |
| 3 | Design followed | ⏳ Pending | Matches design.md |

## Developer Handover

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | PR description complete | ⏳ Pending | What changed, how to test |
| 2 | Dev notes for QA | ⏳ Pending | Test data, edge cases |
| 3 | Feature flags configured | ⏳ Pending | Pennant flags set |
| 4 | Migrations ready | ⏳ Pending | DB changes work |

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | ⏳ Pending |
| Peer Reviewer | | | ⏳ Pending |

---

## Next Steps

Run `/trilogy-dev-handover` to create PR and validate against this gate.

**Reference**: [.tc-wow/gates/04-code-quality.md](/.tc-wow/gates/04-code-quality.md)
