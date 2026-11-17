package com.selectyourdestiny.payment;

/**
 * Abstraction over a payment provider. {@link MockPaymentGateway} is active by default;
 * {@link RazorpayGateway} and {@link PhonePeGateway} are integration points for production.
 */
public interface PaymentGateway {
    /** Gateway name, e.g. MOCK, RAZORPAY, PHONEPE. */
    String name();

    /** Creates an order at the provider; returns the provider order id. */
    String createOrder(Long paymentId, double amount, String currency);

    /** Optional redirect URL for hosted checkout (null if SDK / in-app). */
    String redirectUrl(String orderId);

    /** Verifies the callback signature from the provider. */
    boolean verify(String orderId, String gatewayPaymentId, String signature);

    /** Issues a refund; returns refund reference. */
    String refund(String gatewayPaymentId, double amount);
}
