# Toucan Payments integration (hosted checkout + redirect)

Source: Toucan "Check Out API Specifications" v1.0 and "Status Check Doc - Orchestration".

## Flow
1. Checkout -> `POST /api/payments/initiate` (backend) **or** `POST /api/toucan/session` (Vercel standalone).
2. Server form-POSTs to Toucan `getpaymentsession` with `t, o, ta, c, mac, murl, name, phone, emailId, ha`.
   `ha` = SHA-512 hex of the amount string `ta` (verified: sha512("23") equals the spec sample).
   `o` = 17-digit unique order number (spec: min 15 digits).
3. Toucan replies 302; the hosted checkout URL is in the `Location` header -> browser is redirected there.
4. Toucan POSTs an (unsigned) callback; `pspRefNo` = terminalNumber + orderNo.
5. Because the callback is unsigned, the booking is confirmed ONLY after `checkStatus` returns
   `success=true`, `actionCode="00"` and the amount matches.
6. Customer returns to `/payment/return?order=<orderNo>` which polls status and shows success/failure.

## URLs to register with Toucan
| | Backend deployed | Vercel only (no backend) |
|---|---|---|
| Callback (server-to-server) | `https://<backend>/api/payments/toucan/callback` | `https://<app>.vercel.app/api/toucan/callback` |
| Return / redirect | `https://<backend>/api/payments/toucan/return?order=<orderNo>` | `https://<app>.vercel.app/payment/return?order=<orderNo>` |
| Success page | `https://<app>.vercel.app/success` | same |
| Failure page | `https://<app>.vercel.app/checkout?payment=failed` | same |

## Environment variables
`TOUCAN_ENABLED, TOUCAN_TERMINAL_ID, TOUCAN_MERCHANT_NUMBER, TOUCAN_MAC, TOUCAN_STATUS_TOKEN,
TOUCAN_CHECKOUT_URL, TOUCAN_STATUS_URL, TOUCAN_MURL` (backend also needs `FRONTEND_URL`).
Never commit real values.

## Open questions for Toucan
- How are return and callback URLs registered (not in the spec)? Which params are appended to the return URL?
- Test-environment Check Status URL (spec shows production host) and a valid bearer token (sample expired Oct 2025).
