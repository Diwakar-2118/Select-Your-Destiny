package com.selectyourdestiny.payment;

import org.springframework.stereotype.Component;

/**
 * Integration point for PhonePe PG.
 * <ul>
 *   <li>createOrder: POST /pg/v1/pay with base64 payload + X-VERIFY = SHA256(payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex.</li>
 *   <li>redirectUrl: data.instrumentResponse.redirectInfo.url from the pay response.</li>
 *   <li>verify: GET /pg/v1/status/{merchantId}/{transactionId} (server-to-server status check).</li>
 * </ul>
 * Not wired by default ({@link MockPaymentGateway} is {@code @Primary}).
 */
@Component
public class PhonePeGateway implements PaymentGateway {
    @Override public String name() { return "PHONEPE"; }
    @Override public String createOrder(Long paymentId, double amount, String currency) { throw new UnsupportedOperationException("PhonePe not configured"); }
    @Override public String redirectUrl(String orderId) { return null; }
    @Override public boolean verify(String orderId, String gatewayPaymentId, String signature) { throw new UnsupportedOperationException("PhonePe not configured"); }
    @Override public String refund(String gatewayPaymentId, double amount) { throw new UnsupportedOperationException("PhonePe not configured"); }
}
