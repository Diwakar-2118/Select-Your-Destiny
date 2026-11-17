package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

import static com.selectyourdestiny.service.Mapper.round;

/**
 * Fare rules (contract): baseFare = sum of seat prices; gst 5%; platformFee 15 flat; convenienceFee 2%;
 * discount = trip discountPercent of base; couponDiscount from coupon; grandTotal = sum - discounts (2dp).
 */
@Service
@RequiredArgsConstructor
public class FareService {
    public static final double GST_RATE = 0.05;
    public static final double PLATFORM_FEE = 15.0;
    public static final double CONVENIENCE_RATE = 0.02;

    private final CouponRepository couponRepo;
    private final SeatRepository seatRepo;

    /** Price of a single seat on a trip = trip fare + seat extra (e.g. sleeper premium). */
    public double seatPrice(Trip trip, Seat seat) { return round(trip.getFare() + seat.getExtraFare()); }

    public FareBreakdown calculate(Trip trip, List<String> seatNumbers, String couponCode) {
        List<Seat> seats = seatRepo.findByBusIdOrderByDeckAscRowNumAscColNumAsc(trip.getBus().getId()).stream()
                .filter(s -> seatNumbers.contains(s.getSeatNumber())).toList();
        if (seats.size() != seatNumbers.size()) throw com.selectyourdestiny.exception.ApiException.badRequest("Unknown seat number(s) for this bus");
        double base = round(seats.stream().mapToDouble(s -> seatPrice(trip, s)).sum());
        double gst = round(base * GST_RATE);
        double conv = round(base * CONVENIENCE_RATE);
        double discount = round(base * trip.getDiscountPercent() / 100.0);
        double couponDiscount = 0;
        if (couponCode != null && !couponCode.isBlank()) {
            CouponValidateResponse v = validate(couponCode, base);
            if (!v.valid()) throw com.selectyourdestiny.exception.ApiException.badRequest(v.message());
            Coupon c = couponRepo.findFirstByCodeIgnoreCase(couponCode).orElseThrow();
            // Cashback is credited to wallet after payment, so it doesn't reduce the payable amount.
            couponDiscount = c.getType() == CouponType.CASHBACK ? 0 : v.discount();
        }
        double total = round(Math.max(0, base + gst + PLATFORM_FEE + conv - discount - couponDiscount));
        return new FareBreakdown(base, gst, PLATFORM_FEE, conv, discount, couponDiscount, total);
    }

    /** Validates a coupon against an amount and computes the discount (or cashback) value. */
    public CouponValidateResponse validate(String code, double amount) {
        Coupon c = couponRepo.findFirstByCodeIgnoreCase(code).orElse(null);
        if (c == null) return new CouponValidateResponse(false, 0, "Invalid coupon code");
        if (!c.isActive()) return new CouponValidateResponse(false, 0, "Coupon is no longer active");
        if (c.getValidTill() != null && c.getValidTill().isBefore(LocalDate.now())) return new CouponValidateResponse(false, 0, "Coupon expired");
        if (amount < c.getMinAmount()) return new CouponValidateResponse(false, 0, "Minimum booking amount is " + c.getMinAmount());
        double d = switch (c.getType()) {
            case FLAT -> c.getValue();
            case PERCENT, CASHBACK -> amount * c.getValue() / 100.0;
        };
        if (c.getMaxDiscount() > 0) d = Math.min(d, c.getMaxDiscount());
        d = round(Math.min(d, amount));
        String msg = c.getType() == CouponType.CASHBACK
                ? "Cashback of " + d + " will be credited to your wallet after payment"
                : "Coupon applied! You save " + d;
        return new CouponValidateResponse(true, d, msg);
    }
}
