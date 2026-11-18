# Auth

How an account is made and used: email and password, a 6-digit code at sign-up and for a
password reset, and one role, `application_user`. Everything goes through GraphQL at
`/graphql` ([GraphQL](graphql/index.md)); Better Auth's own HTTP routes are not mounted.

## The pieces

| Piece                                                                                                                                       | What it does                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [`packages/db`](../packages/db/src/schema/index.ts)                                                                                          | The tables: Better Auth's `user`, `session`, `account` and `verification`, and `rate_limit`                            |
| [`apps/backend/src/better-auth`](../apps/backend/src/better-auth/index.ts)                                                                  | Better Auth with the Drizzle adapter, `emailAndPassword` and the `bearer` plugin, and the session cache in front of it |
| [`apps/backend/src/use-cases/cases`](../apps/backend/src/use-cases/cases)                                                                   | One use case per operation; each calls `ctx.auth.api.*`                                                                |
| [`apps/backend/src/use-cases/lib`](../apps/backend/src/use-cases/lib)                                                                       | The codes, the rate limits, the client address and the sessions                                                        |
| [`packages/events`](../packages/events/src/lib/catalog.ts)                                                                                      | `signup.code_requested` and `password.reset_requested`, published to the `emails` topic                                |
| [`apps/backend/src/services/worker`](../apps/backend/src/services/worker/index.ts) and [`packages/emails`](../packages/emails/src/index.ts) | The worker renders each event's email and sends it through Mailgun                                                     |

## The flows

| Operation              | Needs                                       | Does                                                                                             |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `requestSignUpCode`    | an email                                    | Emails a code to an address with no account. For an address with one it sends nothing            |
| `signUp`               | email, code, name, password                 | Checks the code, creates the account through Better Auth, then burns the code. Returns a session |
| `signIn`               | email, password                             | Returns a session                                                                                |
| `me`                   | a session                                   | The signed-in user, or `null`                                                                    |
| `signOut`              | a session                                   | Ends that session                                                                                |
| `requestPasswordReset` | an email                                    | Emails a code to an address with an account. For an address without one it sends nothing         |
| `resetPassword`        | email, code, new password                   | Checks the code, sets the password, burns the code and ends every session of the account         |
| `changePassword`       | a session, the current and the new password | Sets the password, ends every session, this one too, and returns a new session                   |

A session is a token. The client sends it as `Authorization: Bearer <token>` on every request
after `signUp`, `signIn` or `changePassword`, which all return `{ user, token }`.

`requestSignUpCode` and `requestPasswordReset` always answer `{ sent: true }`, and a wrong
email or a wrong password are the same error, so no answer's content says whether an address
has an account. How long an answer takes still can: only the branch that sends an email
writes a code and publishes, so it is slower by a database write and a Pub/Sub publish.

## Codes

- **Six digits, 15 minutes.** A new request replaces the earlier code for the same address
  and flow.
- **Stored hashed.** The `verification` table holds the code's HMAC-SHA256 under
  `BETTER_AUTH_SECRET` and an attempt count, under `sign-up:<email>` or
  `password-reset:<email>`. Six digits are a million guesses, so a plain hash would not hide
  them; without the secret the HMAC does.
- **Five wrong guesses delete it.** A missing, expired or deleted code is refused with the same
  message as a wrong one.
- **Burned after the work.** Sign-up deletes the code only once Better Auth created the
  account, so a failed sign-up, such as a short password, can be retried with the same code.
- **`111111` locally only.** A local API (`APP_ENV=local`) accepts `111111` beside the
  stored code, so a sign-up works without an email. A deployed one never does, key or not:
  there it would let anyone reset anyone's password with `requestPasswordReset`. Without
  `MAILGUN_API_KEY` no email is sent, so stg can sign no one up until it has the key; prd
  refuses to start without it.
- **Pruned.** The worker deletes the expired codes, and the ended `rate_limit` windows,
  every hour, and `migrate` each time it runs.

The code is in `apps/backend/src/use-cases/lib/codes.ts`.

## Rate limits

Every request that names an address counts against two limits, in 15-minute windows, and so
does `changePassword`, under the signed-in account's address, since it checks a password:

| Key               | Limit |
| ----------------- | ----- |
| `ip:<address>`    | 50    |
| `address:<email>` | 10    |

The client's address is counted first, so a client past its limit leaves no row behind for
each new email it sends.

Every operation that names an address draws on the same `address:<email>` count. Ten requests
from anywhere, such as ten wrong passwords, therefore lock that address out of sign-in, codes
and resets until the window ends. That is the trade-off for one count per address: whoever
guesses at an account gets ten tries in 15 minutes across every flow, not ten in each.

The counts live in the `rate_limit` table, updated in one statement, so every instance shares
them and concurrent requests cannot both read an old count. Past a limit the API answers
`TOO_MANY_REQUESTS` with `retryAfterSeconds`, the seconds until the window ends.

The client's address is the `X-Forwarded-For` entry just before the last `TRUSTED_PROXIES`
(default 1, the load balancer). Earlier entries came from the client and could be forged. A
request without enough entries, such as one to localhost, is counted per email only.

Better Auth's own rate limiter is off: it guards only its HTTP routes, which are not mounted.

## Sessions

`apps/backend/src/better-auth/lib/session-cache.ts` keeps each session the API looked up in
an in-process LRU for 30 seconds, keyed by the token's SHA-256, so an authenticated request
does not read the database every time. Sign-out evicts the entry through Better Auth's
`session.delete.after` hook. A password reset or a password change ends sessions in one query
that skips the hook, so the use case reads their tokens before that delete and evicts them
after it: evicted before, a request in between would cache a session again for 30 seconds.
Another instance keeps its copy until the 30 seconds end.

## Errors

The GraphQL layer answers each expected failure with a code in `extensions.code`:

| Code                    | When                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `BAD_USER_INPUT`        | the input is invalid, a code is wrong, or Better Auth refused it (a short password, a taken address, a wrong password) |
| `UNAUTHENTICATED`       | the operation needs a session and the request has none                                                                 |
| `TOO_MANY_REQUESTS`     | a rate limit was reached; `extensions.retryAfterSeconds` says for how long                                             |
| `INTERNAL_SERVER_ERROR` | anything else; the message is generic, and the detail is only in the log                                               |

## Roles

`user.role` is a Better Auth additional field, defaulting to `application_user`, with
`input: false`: a sign-up cannot choose it. The values are the `user_role` enum in
`packages/db`.

## Locally

`yarn local:create` seeds two users, `ana@example.com` and `bruno@example.com`, with the
password in [`packages/seed/src/lib/users.ts`](../packages/seed/src/lib/users.ts). Sign up any
other address with the code `111111`. Without a Mailgun key the worker logs the subject of
each email, with the address redacted, instead of sending it.

## The worker's pushes

The worker sends only what a push it trusts asks for: with `PUBSUB_PUSH_AUDIENCE` and
`PUBSUB_PUSH_SERVICE_ACCOUNT` set, a push must carry a Google-signed OIDC token for that
audience, issued to that service account, as a push subscription set to authenticate sends
it; anything else is answered 401. A failed fetch of Google's certificates is not a refusal:
the push is answered 500, with the error logged, and Pub/Sub delivers it again. A local
worker, whose emulator sends no token, trusts every push. A deployed worker without the two
variables refuses every push, and logs why.
The verifier is in [`apps/backend/src/google-auth`](../apps/backend/src/google-auth/index.ts).

A push whose body is not an email envelope, or whose email Mailgun refuses for good (a 4xx
other than 408 and 429, such as a wrong key), is acknowledged and logged: retrying cannot
help. Any other failure, Mailgun's own, its rate limit or a send past 10 seconds, answers
500, and Pub/Sub delivers the push again.
