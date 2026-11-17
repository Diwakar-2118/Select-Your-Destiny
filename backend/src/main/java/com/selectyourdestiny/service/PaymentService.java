package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.exception.ApiException;
import com.selectyourdestiny.payment.PaymentGateway;
import com.selectyourdestiny.payment.ToucanClient;
import java.math.BigDecimal;
import java.math.RoundingMode;
import com.selectyourdestiny.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.selectyourdestiny.service.Mapper.round;

/** Payment initiation and verification through the configured {@link PaymentGateway}. */
@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository paymentRepo;
    private final BookingRepository bookingRepo;
    private final CouponRepository couponRepo;
    private final PaymentGateway gateway;
    private final BookingService bookingService;
    private final FareService fareService;
    private final NotificationService notificationService;
    private final Mapper mapper;
    private final ToucanClient toucan;

    @Transactional
    public PaymentInitiateResponse initiate(Long userId, PaymentInitiateRequest r) {
        Booking b = bookingService.owned(userId, r.bookingId());
        if (b.getStatus() != BookingStatus.PENDING) throw ApiException.badRequest("Booking is not awaiting payment");
        if (r.promoCode() != null && !r.promoCode().isBlank() && b.getCouponCode() == null) {
            BookingService.applyFare(b, fareService.calculate(b.getTrip(), b.seatList(), r.promoCode()));
            b.setCouponCode(r.promoCode().toUpperCase());
            bookingRepo.save(b);
        }
        if (r.method() == PaymentMethod.WALLET && b.getUser().getWalletBalance() < b.getGrandTotal())
            throw ApiException.badRequest("Insufficient wallet balance");
        // Online methods go through the Toucan hosted checkout (redirect flow) when it is configured.
        if (r.method() != PaymentMethod.WALLET && toucan.isEnabled()) {
            String orderNo = toucan.newOrderNo();
            Payment p = paymentRepo.save(Payment.builder().booking(b).userId(userId).method(r.method())
                    .amount(b.getGrandTotal()).status(PaymentStatus.PENDING).gateway("TOUCAN").gatewayOrderId(orderNo).build());
            try {
                String url = toucan.createSession(orderNo, p.getAmount(), b.getUser().getName(), b.getContactMobile(), b.getContactEmail());
                return new PaymentInitiateResponse(p.getId(), orderNo, p.getAmount(), url);
            } catch (ToucanClient.ToucanException e) {
                p.setStatus(PaymentStatus.FAILED);
                throw new ApiException(HttpStatus.BAD_GATEWAY, e.getMessage());
            }
        }
        Payment p = paymentRepo.save(Payment.builder().booking(b).userId(userId).method(r.method())
                .amount(b.getGrandTotal()).status(PaymentStatus.PENDING).gateway(gateway.name()).build());
        String orderId = gateway.createOrder(p.getId(), p.getAmount(), "INR");
        p.setGatewayOrderId(orderId);
        return new PaymentInitiateResponse(p.getId(), orderId, p.getAmount(), gateway.redirectUrl(orderId));
    }

    @Transactional(noRollbackFor = ApiException.class)
    public BookingDto verify(Long userId, PaymentVerifyRequest r) {
        Payment p = paymentRepo.findById(r.paymentId()).filter(x -> x.getUserId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Payment"));
        Booking b = p.getBooking();
        if (p.getStatus() == PaymentStatus.SUCCESS) return mapper.booking(b);
        if (!gateway.verify(p.getGatewayOrderId(), r.gatewayPaymentId(), r.signature())) {
            p.setStatus(PaymentStatus.FAILED);
            b.setPaymentStatus(PaymentStatus.FAILED);
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "Payment verification failed");
        }
        return complete(p, r.gatewayPaymentId() != null ? r.gatewayPaymentId() : "pay_mock_" + p.getId());
    }

    /**
     * Confirms a Toucan payment by order number. Called from the PSP callback and the customer return URL.
     * The callback is unsigned, so the result is ALWAYS re-checked with Toucan's Check Status API; the
     * booking is confirmed only when actionCode is "00" and the amount matches. Idempotent.
     *
     * @return the payment (status SUCCESS, FAILED or still PENDING if Toucan has no final answer yet)
     */
    @Transactional(noRollbackFor = ApiException.class)
    public Payment confirmToucan(String orderNo) {
        Payment p = paymentRepo.findFirstByGatewayOrderId(orderNo).orElseThrow(() -> ApiException.notFound("Payment"));
        if (p.getStatus() == PaymentStatus.SUCCESS || p.getStatus() == PaymentStatus.FAILED) return p;
        ToucanClient.StatusResult st = toucan.checkStatus(orderNo);
        if (st.approved()) {
            BigDecimal expected = BigDecimal.valueOf(p.getAmount()).setScale(2, RoundingMode.HALF_UP);
            if (st.amount() != null && st.amount().setScale(2, RoundingMode.HALF_UP).compareTo(expected) != 0) {
                p.setStatus(PaymentStatus.FAILED);
                p.getBooking().setPaymentStatus(PaymentStatus.FAILED);
                return p;
            }
            complete(p, st.rrn() != null ? st.rrn() : st.approvalCode());
        } else if (st.success() && st.actionCode() != null) {
            // Toucan returned a final non-approved action code
            p.setStatus(PaymentStatus.FAILED);
            p.getBooking().setPaymentStatus(PaymentStatus.FAILED);
        }
        return p; // otherwise still PENDING — caller may retry
    }

    /** Finds a payment by Toucan order number, restricted to its owner. */
    public Payment owned(Long userId, String orderNo) {
        return paymentRepo.findFirstByGatewayOrderId(orderNo).filter(x -> x.getUserId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Payment"));
    }

    /** Marks a verified payment successful, confirms the booking and sends notifications. */
    private BookingDto complete(Payment p, String gatewayPaymentId) {
        Booking b = p.getBooking();
        Long userId = p.getUserId();
        User u = b.getUser();
        if (p.getMethod() == PaymentMethod.WALLET) {
            if (u.getWalletBalance() < p.getAmount()) throw ApiException.badRequest("Insufficient wallet balance");
        }
        Booking confirmed = bookingService.confirm(b); // throws 409 if seats were lost; payment stays PENDING
        if (p.getMethod() == PaymentMethod.WALLET) u.setWalletBalance(round(u.getWalletBalance() - p.getAmount()));
        p.setStatus(PaymentStatus.SUCCESS);
        p.setGatewayPaymentId(gatewayPaymentId);
        notificationService.notify(userId, NotificationType.PAYMENT_SUCCESS, "Payment successful",
                "Rs " + p.getAmount() + " paid via " + p.getMethod() + " for booking " + b.getBookingRef());
        // Cashback coupons credit the wallet after successful payment
        if (b.getCouponCode() != null) {
            couponRepo.findFirstByCodeIgnoreCase(b.getCouponCode()).filter(c -> c.getType() == CouponType.CASHBACK).ifPresent(c -> {
                double cb = fareService.validate(c.getCode(), b.getBaseFare()).discount();
                u.setWalletBalance(round(u.getWalletBalance() + cb));
                notificationService.notify(userId, NotificationType.COUPON, "Cashback credited", "Rs " + cb + " cashback added to your wallet");
            });
        }
        return mapper.booking(confirmed);
    }
}
