# K-Lab Padel Dashboard

## Admin role & user access

Signed-in users are stored in Firestore at `customers/{email}`. A first sign-in
creates `{ active: false }`, i.e. "pending". Admins approve people from the
**Users** tab, which only appears for accounts with `role: "admin"`.

The role is enforced by `firestore.rules` on the server, not by hiding the tab,
so these steps are required:

1. **Enable Firebase Auth.** Firebase Console → Authentication → Sign-in method →
   enable **Google**. If the Google OAuth client (`VITE_GOOGLE_CLIENT_ID`) belongs
   to a different Google Cloud project, add its client ID under
   *Safelist client IDs from external projects*.
2. **Make the first admin.** In Firestore, open `customers/<your email>` and set
   `active: true` and `role: "admin"` (string). After that, admins can
   promote others from the Users tab.
3. **Deploy the rules.** Paste all of `firestore.rules` into Console → Firestore →
   Rules → Publish (or `firebase deploy --only firestore:rules`). It covers
   `customers`, `loginEvents` and `uploads`. Only approved, unexpired users
   can read or upload sheet data.

| Field       | Meaning                                                     |
|-------------|-------------------------------------------------------------|
| `active`    | `true` = may use the dashboard                              |
| `expiresAt` | optional Timestamp; access ends after this date             |
| `role`      | `"admin"` or `"user"` (missing = user)                      |
| `updatedBy` | email of the admin who last changed the record              |

Admins cannot revoke, demote or delete themselves, so an admin can't
accidentally lock themselves out.

## Sign-in history

Each sign-in appends a document to `loginEvents`
(`{ email, at, result, userAgent }`, where `result` is `ok`, `pending`,
`inactive` or `expired`). The user's customer record also gets `lastLoginAt`,
`loginCount`, and `lastSeenAt`, which refreshes every few minutes while the
dashboard is open. Admins see this on the **Users** tab: a "last active" time
on each user, an **Active today** count, and a **Recent sign-ins** feed. Click
the clock icon on a user to see only their history.

A page reload in the same browser tab is not logged as a new sign-in. Users
can only append their own entries, and only admins can read them. All of this
is enforced in `firestore.rules`, so redeploy the rules after updating.

`result` is reported by the user's browser. It is fine for an activity log,
but don't rely on it as an audit trail. The `at` timestamp is enforced as
server time.
