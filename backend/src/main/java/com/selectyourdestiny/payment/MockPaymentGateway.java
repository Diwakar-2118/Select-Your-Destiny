package com.selectyourdestiny.payment;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Dev gateway: signature {@code "mock"} always verifies successfully. */
@Component
@Primary
public class MockPaymentGateway implements PaymentGateway {
    @Override public String name() { return "MOCK"; }
    @Override public String createOrder(Long paymentId, double amount, String currency) { return "order_mock_" + paymentId + "_" + UUID.randomUUID().toString().substring(0, 8); }
    @Override public String redirectUrl(String orderId) { return null; }
    @Override public boolean verify(String orderId, String gatewayPaymentId, String signature) { return "mock".equals(signature); }
    @Override public String refund(String gatewayPaymentId, double amount) { return "rfnd_mock_" + UUID.randomUUID().toString().substring(0, 8); }
}
