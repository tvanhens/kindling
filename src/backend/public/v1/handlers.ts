/**
 * The public API's implementation: the auth middleware, and the handlers.
 *
 * Both are adapters. The middleware turns a presented API key into a user id;
 * the handlers turn that id plus a decoded payload into a call on the *same*
 * `Projects` service the RPC transport uses, then map the result onto the
 * public DTOs. No SQL, no Better Auth, no logic — if a handler here ever needs
 * something a service does not have, the answer is a new service method (that
 * is why `Projects.get` exists), not a query in this file.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { Auth } from "../../auth.ts";
import { Projects } from "../../projects.ts";
import { ApiKeyAuth, CurrentActor, PublicApi } from "./api.ts";
import { fromProject, NotFound, Unauthorized } from "./schemas.ts";

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

/** `Authorization: Bearer sk_…` and `Authorization: sk_…` both work. */
const stripBearer = (value: string): string =>
  /^bearer\s+/i.test(value) ? value.slice(value.indexOf(" ") + 1).trim() : value.trim();

/**
 * Seconds to wait if this verification failure is a spent quota, `null` if it
 * is anything else.
 *
 * `verifyApiKey` does not throw on rate limiting: it catches the plugin's own
 * `APIError("TOO_MANY_REQUESTS", { code: "RATE_LIMITED", details: { tryAgainIn } })`
 * and folds it into the returned `{ valid: false, error }`. `tryAgainIn` is
 * milliseconds; the fallback is a conservative minute.
 */
const rateLimitRetryAfter = (
  error: { code?: string | undefined } | null | undefined,
): number | null => {
  if (error?.code !== "RATE_LIMITED") return null;
  const details = (error as { details?: unknown }).details;
  const tryAgainIn =
    typeof details === "object" && details !== null
      ? (details as { tryAgainIn?: unknown }).tryAgainIn
      : undefined;
  return typeof tryAgainIn === "number" ? Math.max(1, Math.ceil(tryAgainIn / 1000)) : 60;
};

/**
 * Implementation of the {@link ApiKeyAuth} tag.
 *
 * `auth.api.verifyApiKey` does the security-relevant work — it hashes the
 * presented key, looks it up, and checks `enabled`, expiry and rate limits — so
 * a revoked or expired key is indistinguishable from a fabricated one here:
 * all of them are a flat 401 with no detail. The key's `referenceId` is the
 * owning user id, and it is the *only* source of the actor. Nothing downstream
 * reads an owner from the request.
 */
export const ApiKeyAuthLayer: Layer.Layer<ApiKeyAuth, never, Auth> = Layer.effect(
  ApiKeyAuth,
  Effect.gen(function* () {
    const auth = yield* Auth;

    return ApiKeyAuth.of({
      apiKey: Effect.fn("ApiKeyAuth.apiKey")(function* (httpEffect, { credential }) {
        const presented = stripBearer(Redacted.value(credential));
        if (presented === "") {
          return yield* new Unauthorized({ message: "Missing API key" });
        }

        const verified = yield* auth.api.verifyApiKey({ body: { key: presented } }).pipe(
          // A failure to *verify* is not the same as "invalid", but the caller
          // learns the same thing from both: this key does not work.
          Effect.catchTag("BetterAuthApiError", () => Effect.succeed(null)),
        );

        if (verified === null || !verified.valid || verified.key === null) {
          // A spent quota is NOT a bad credential. The plugin reports it as
          // `valid: false` with `error.code === "RATE_LIMITED"` — it catches
          // its own `TOO_MANY_REQUESTS` internally rather than throwing — so
          // without this branch a legitimate caller in cooldown is told their
          // key is invalid and goes off to rotate a perfectly good one.
          //
          // The status is still 401 (see the note on `ApiKeyAuth` in ./api.ts);
          // the message is what makes it diagnosable.
          const retryAfterSeconds = rateLimitRetryAfter(verified?.error);
          if (retryAfterSeconds !== null) {
            return yield* new Unauthorized({
              message: `API key rate limit exceeded — retry in ${retryAfterSeconds}s`,
            });
          }
          return yield* new Unauthorized({ message: "Invalid API key" });
        }

        return yield* Effect.provideService(httpEffect, CurrentActor, {
          userId: verified.key.referenceId,
        });
      }),
    });
  }),
);

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** The `projects` group, over the domain service. */
export const ProjectsApiHandlers = HttpApiBuilder.group(
  PublicApi,
  "projects",
  Effect.fn("ProjectsApiHandlers")(function* (handlers) {
    const projects = yield* Projects;

    return handlers
      .handle(
        "list",
        Effect.fn("v1.projects.list")(function* () {
          const actor = yield* CurrentActor;
          const rows = yield* projects.list(actor.userId);
          return rows.map(fromProject);
        }),
      )
      .handle(
        "create",
        Effect.fn("v1.projects.create")(function* ({ payload }) {
          const actor = yield* CurrentActor;
          const project = yield* projects.create(actor.userId, {
            name: payload.name,
            description: payload.description ?? null,
          });
          return fromProject(project);
        }),
      )
      .handle(
        "get",
        Effect.fn("v1.projects.get")(function* ({ params }) {
          const actor = yield* CurrentActor;
          const project = yield* projects.get(actor.userId, params.id).pipe(
            // The domain error is internal; the public contract says 404 and
            // nothing about our tags. Mapping it here is deliberate.
            Effect.catchTag(
              "ProjectNotFound",
              () => new NotFound({ message: `No project with id ${params.id}` }),
            ),
          );
          return fromProject(project);
        }),
      )
      .handle(
        "delete",
        Effect.fn("v1.projects.delete")(function* ({ params }) {
          const actor = yield* CurrentActor;
          yield* projects
            .remove(actor.userId, params.id)
            .pipe(
              Effect.catchTag(
                "ProjectNotFound",
                () => new NotFound({ message: `No project with id ${params.id}` }),
              ),
            );
        }),
      );
  }),
);
