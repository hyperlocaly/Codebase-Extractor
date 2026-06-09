---
name: Admin OpenAPI endpoints need explicit response body schemas
description: Orval generates Promise<void> for any endpoint whose 200 response lacks a content block, making TData=never in consumers.
---

If an OpenAPI `200` response only has `description:` and no `content:` block, Orval infers the return type as `void`. Consumers then get `TData = Awaited<ReturnType<...>> = void`, and `data.someField` errors with "Property does not exist on type 'never'".

**Why:** Orval relies entirely on the response schema to generate the return type. No content = no type = void.

**How to apply:** Every endpoint that returns a JSON body must have a `content: application/json: schema:` block in the OpenAPI spec — even "simple" admin endpoints. After adding the content block, re-run codegen: `pnpm --filter @workspace/api-spec run codegen`.

Also remember to add the referenced schema to `components/schemas` if it's a new shape (e.g. `AdminReviewItem`, `AdminReportItem`).
