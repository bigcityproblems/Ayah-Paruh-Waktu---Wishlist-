# Security Specification - Ayah Paruh Waktu Wishlist

## Data Invariants
- A wishlist entry must contain a name, email, phone, and server-generated createdAt timestamp.
- Emails must follow a basic format.
- Strings are bounded in size to prevent resource abuse.

## The "Dirty Dozen" Payloads (Examples)
1. Missing `name`: `{ "email": "test@example.com", "phone": "0812", "createdAt": request.time }` -> DENIED
2. Missing `email`: `{ "name": "Test", "phone": "0812", "createdAt": request.time }` -> DENIED
3. Client-provided `createdAt`: `{ "name": "Test", "email": "test@example.com", "phone": "0812", "createdAt": "2024-01-01T00:00:00Z" }` -> DENIED
4. Extra fields: `{ "name": "Test", "email": "test@example.com", "phone": "0812", "createdAt": request.time, "hacked": true }` -> DENIED
5. Large strings: `{ "name": "A".repeat(201), ... }` -> DENIED
6. Unauthorized read: `GET /wishlist/any-id` -> DENIED
7. Unauthorized list: `LIST /wishlist` -> DENIED
8. Delete attempts: `DELETE /wishlist/any-id` -> DENIED
9. Update attempts: `UPDATE /wishlist/any-id` -> DENIED
10. Malformed email: `{ "email": "invalid-email", ... }` -> DENIED
11. Invalid character in ID: `POST /wishlist/!!!` -> DENIED (Handled by SDK but rules should check if path vars are used)
12. Zero-size strings: `{ "name": "", ... }` -> DENIED

## Red Team Audit Results
- Identity Spoofing: Not applicable (no auth used for creation).
- State Shortcutting: Not applicable (single-state entity).
- Resource Poisoning: Prevented by string size checks and strict key matching.
- PII Exposure: Prevented by explicit deny on all read/list operations.
