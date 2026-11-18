package com.selectyourdestiny.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Client for the Toucan Payments hosted checkout (PSP / payment aggregator).
 *
 * <p>Flow (see docs/PAYMENTS_TOUCAN.md):
 * <ol>
 *   <li>{@link #createSession} — form-POST to {@code getpaymentsession}; Toucan answers 302 and the
 *       hosted checkout URL is in the {@code Location} header. The browser is redirected there.</li>
 *   <li>Toucan POSTs a server-to-server callback (unsigned) and returns the customer to our return URL.</li>
 *   <li>{@link #checkStatus} — because the callback carries no signature, every result is confirmed with the
 *       Check Status API ({@code actionCode == "00"} and matching amount) before a booking is confirmed.</li>
 * </ol>
 *
 * <p>All credentials come from environment variables; nothing secret lives in source control.
 */
@Slf4j
@Component
public class ToucanClient {

    private static final DateTimeFormatter ORDER_TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private final SecureRandom random = new SecureRandom();
    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER) // we need the 302 Location header ourselves
            .connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper om;

    @Value("${toucan.enabled:false}") private boolean enabled;
    @Value("${toucan.checkout-url:https://pay.testtoucanpay.in/api/auth/getpaymentsession}") private String checkoutUrl;
    @Value("${toucan.status-url:https://pay.toucanpay.in/api/pay/v1/checkStatus}") private String statusUrl;
    @Value("${toucan.terminal-id:}") private String terminalId;
    @Value("${toucan.merchant-number:}") private String merchantNumber;
    @Value("${toucan.mac:}") private String mac;
    @Value("${toucan.murl:https://merchant.testtoucanpay.in/}") private String murl;
    @Value("${toucan.status-token:}") private String statusToken;
    @Value("${toucan.currency:INR}") private String currency;

    public ToucanClient(ObjectMapper om) { this.om = om; }

    /**
     * Normalises credentials (stray spaces / line breaks from copy-paste break the token) and logs a
     * safe summary of the configuration — never the secret values themselves.
     */
    @jakarta.annotation.PostConstruct
    void init() {
        terminalId = terminalId.trim();
        merchantNumber = merchantNumber.trim();
        String rawMac = mac;
        mac = mac.replaceAll("\\s+", "").replaceAll("^\"|\"$", "");
        statusToken = statusToken.replaceAll("\\s+", "").replaceFirst("(?i)^Bearer", "");
        String[] parts = mac.split("\\.");
        log.info("Toucan config: enabled={} terminalId={} macParts={} macSignatureLength={} (RS256 expects 342) "
                        + "macHadWhitespaceOrQuotes={} statusTokenSet={} checkoutUrl={}",
                isEnabled(), terminalId, parts.length, parts.length == 3 ? parts[2].length() : -1,
                !rawMac.equals(mac), !statusToken.isBlank(), checkoutUrl);
    }

    /** True when Toucan is switched on and has the minimum credentials. */
    public boolean isEnabled() { return enabled && !terminalId.isBlank() && !mac.isBlank(); }

    public String terminalId() { return terminalId; }

    /** Unique order / invoice number: 14-digit timestamp + 3 random digits = 17 digits (spec: min 15). */
    public String newOrderNo() {
        return LocalDateTime.now().format(ORDER_TS) + String.format("%03d", random.nextInt(1000));
    }

    /** Amount as sent in {@code ta}; the hash is computed over exactly this string. */
    public static String formatAmount(double amount) {
        return BigDecimal.valueOf(amount).setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    /**
     * SHA-512 (lower-case hex, UTF-8) of the transaction amount string — the {@code ha} field.
     * Verified against the spec sample: sha512("23") = 6ff334e1…40022225.
     */
    public static String hashAmount(String amount) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-512").digest(amount.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : h) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-512 unavailable", e);
        }
    }

    /**
     * Creates a hosted checkout session and returns the URL the customer must be redirected to.
     *
     * @throws ToucanException when Toucan answers 200 without a URL, 404 (merchant token not authorised),
     *                         or redirects to its failure page.
     */
    public String createSession(String orderNo, double amount, String name, String phone, String email) {
        String ta = formatAmount(amount);
        Map<String, String> form = new LinkedHashMap<>();
        form.put("t", terminalId);
        form.put("o", orderNo);
        form.put("ta", ta);
        form.put("c", currency);
        form.put("mac", mac);
        form.put("murl", murl);
        form.put("name", name == null ? "" : name);
        form.put("phone", phone == null ? "" : phone);
        form.put("emailId", email == null ? "" : email);
        form.put("ha", hashAmount(ta));
        String body = form.entrySet().stream()
                .map(e -> enc(e.getKey()) + "=" + enc(e.getValue())).collect(Collectors.joining("&"));
        try {
            HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(checkoutUrl))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
            String location = res.headers().firstValue("Location").orElse(null);
            log.info("Toucan session order={} status={} hasLocation={}", orderNo, res.statusCode(), location != null);
            if (res.statusCode() == 404) throw new ToucanException("Merchant token (mac) not authorised by Toucan");
            if (location == null || location.isBlank()) throw new ToucanException("Toucan returned no checkout URL (HTTP " + res.statusCode() + ")");
            if (!location.contains("checkoutpage")) throw new ToucanException("Toucan rejected the request (failure URL returned)");
            return location;
        } catch (ToucanException e) {
            throw e;
        } catch (Exception e) {
            throw new ToucanException("Could not reach Toucan: " + e.getMessage());
        }
    }

    /** Result of the Check Status API. */
    public record StatusResult(boolean success, String actionCode, BigDecimal amount, String rrn,
                               String approvalCode, String raw) {
        public boolean approved() { return success && "00".equals(actionCode); }
    }

    /** Queries Toucan for the authoritative status of an order. */
    public StatusResult checkStatus(String orderNo) {
        try {
            Map<String, Object> obj = new LinkedHashMap<>();
            obj.put("invoiceNumber", orderNo);
            obj.put("terminalNumber", terminalId);
            obj.put("merchantNumber", merchantNumber);
            Map<String, Object> req = new LinkedHashMap<>();
            req.put("messageID", "/api/pay/v1/checkStatus");
            req.put("requestType", "text");
            req.put("object", obj);
            HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(statusUrl))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + statusToken)
                    .POST(HttpRequest.BodyPublishers.ofString(om.writeValueAsString(req))).build(),
                    HttpResponse.BodyHandlers.ofString());
            JsonNode root = om.readTree(res.body() == null || res.body().isBlank() ? "{}" : res.body());
            JsonNode o = root.path("object");
            BigDecimal amt = o.path("transactionAmount").has("value")
                    ? new BigDecimal(o.path("transactionAmount").path("value").asText("0")) : null;
            StatusResult r = new StatusResult(root.path("success").asBoolean(false), o.path("actionCode").asText(null),
                    amt, o.path("rrn").asText(null), o.path("approvalCode").asText(null), res.body());
            log.info("Toucan status order={} http={} success={} actionCode={}", orderNo, res.statusCode(), r.success(), r.actionCode());
            return r;
        } catch (Exception e) {
            throw new ToucanException("Toucan status check failed: " + e.getMessage());
        }
    }

    /**
     * Extracts our order number from a callback. {@code pspRefNo} = terminalNumber + invoiceNumber;
     * {@code custRefNo} is used as a fallback.
     */
    public String orderNoFromCallback(String pspRefNo, String custRefNo) {
        if (pspRefNo != null && !terminalId.isBlank() && pspRefNo.startsWith(terminalId))
            return pspRefNo.substring(terminalId.length());
        return custRefNo;
    }

    private static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }

    /** Raised for any Toucan integration error. */
    public static class ToucanException extends RuntimeException {
        public ToucanException(String m) { super(m); }
    }
}
