package com.selectyourdestiny.payment;

import org.springframework.stereotype.Component;

/**
 * Integration point for Razorpay.
 * <ul>
 *   <li>createOrder: POST https://api.razorpay.com/v1/orders (amount in paise) with key_id/key_secret basic auth.</li>
 *   <li>verify: HMAC_SHA256(orderId + "|" + paymentId, key_secret) == razorpay_signature.</li>
 *   <li>refund: POST /v1/payments/{id}/refund.</li>
 * </ul>
 * Not wired by default ({@link MockPaymentGateway} is {@code @Primary}).
 */
@Component
public class RazorpayGateway implements PaymentGateway {
    @Override public String name() { return "RAZORPAY"; }
    @Override public String createOrder(Long paymentId, double amount, String currency) { throw new UnsupportedOperationException("Razorpay not configured"); }
    @Override public String redirectUrl(String orderId) { return null; }
    @Override public boolean verify(String orderId, String gatewayPaymentId, String signature) { throw new UnsupportedOperationException("Razorpay not configured"); }
    @Override public String refund(String gatewayPaymentId, double amount) { throw new UnsupportedOperationException("Razorpay not configured"); }
}
