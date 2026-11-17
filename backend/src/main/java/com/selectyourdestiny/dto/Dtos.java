package com.selectyourdestiny.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.selectyourdestiny.entity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;
import java.util.Set;

/**
 * All request/response DTOs, mirroring the TypeScript types in docs/CONTRACT.md.
 * Grouped as nested records to keep the contract in one place.
 */
public final class Dtos {
    private Dtos() {}

    // ---------- Auth ----------
    public record UserDto(Long id, String name, String email, String mobile, Role role, String avatarUrl, double walletBalance) {}
    public record AuthResponse(String token, UserDto user) {}
    public record OtpSendRequest(@NotBlank String mobile) {}
    public record OtpVerifyRequest(@NotBlank String mobile, @NotBlank String otp) {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record RegisterRequest(@NotBlank String name, @NotBlank @Email String email, @NotBlank String mobile, @NotBlank @Size(min = 6) String password) {}
    public record SocialRequest(@NotBlank String provider, @NotBlank String idToken) {}
    public record ForgotPasswordRequest(@NotBlank @Email String email) {}
    public record SentResponse(boolean sent) {}

    // ---------- Catalog ----------
    public record CityDto(Long id, String name, String state) {}
    public record PopularRoute(String from, String to, double startingFare) {}
    public record PointDto(Long id, String name, String address, String time) {}
    public record TripDto(Long id, Long busId, String busName, String operatorName, String busNumber,
                          BusType busType, boolean ac, double rating, int reviews,
                          String fromCity, String toCity, String journeyDate,
                          String departureTime, String arrivalTime, int durationMins,
                          List<PointDto> boardingPoints, List<PointDto> droppingPoints,
                          int availableSeats, int windowSeats, int totalSeats,
                          Set<Amenity> amenities, double fare, double discountPercent, String couponCode) {}
    public record SeatDto(Long id, String seatNumber, SeatKind kind, Deck deck, int row, int col,
                          @JsonProperty("isWindow") boolean isWindow, @JsonProperty("isLadies") boolean isLadies,
                          double price, SeatStatus status) {}
    public record SeatLayout(Long tripId, List<SeatDto> seats, int rows, int cols, boolean hasUpperDeck) {}
    public record CouponValidateRequest(@NotBlank String code, double amount) {}
    public record CouponValidateResponse(boolean valid, double discount, String message) {}

    // ---------- Booking ----------
    public record SeatLockRequest(@NotNull Long tripId, @NotEmpty List<String> seatNumbers) {}
    public record SeatLockResponse(String lockId, String expiresAt) {}
    public record PassengerInput(@NotBlank String name, @Min(0) int age, @NotNull Gender gender, @NotBlank String seatNumber) {}
    public record BookingRequest(@NotNull Long tripId, @NotEmpty List<String> seatNumbers, @Valid List<PassengerInput> passengers,
                                 String contactMobile, String contactEmail, String emergencyContact,
                                 Long boardingPointId, Long droppingPointId, String gstNumber, String gstCompany, String couponCode) {}
    public record FareBreakdown(double baseFare, double gst, double platformFee, double convenienceFee,
                                double discount, double couponDiscount, double grandTotal) {}
    public record BookingDto(Long id, String bookingRef, String pnr, BookingStatus status, TripDto trip,
                             List<String> seatNumbers, List<PassengerInput> passengers,
                             PointDto boardingPoint, PointDto droppingPoint, FareBreakdown fare,
                             String contactMobile, String contactEmail, String createdAt, PaymentStatus paymentStatus) {}
    public record RescheduleRequest(@NotNull Long newTripId, @NotEmpty List<String> seatNumbers) {}
    public record ShareRequest(String channel) {}
    public record TrackingInfo(Long bookingId, String busNumber, double lat, double lng, int etaMins,
                               String driverName, String driverPhone, double speedKmph, String lastUpdated) {}

    // ---------- Payments ----------
    public record PaymentInitiateRequest(@NotNull Long bookingId, @NotNull PaymentMethod method, String promoCode) {}
    public record PaymentInitiateResponse(Long paymentId, String gatewayOrderId, double amount, String redirectUrl) {}
    public record PaymentVerifyRequest(@NotNull Long paymentId, String gatewayPaymentId, String signature) {}
    public record PaymentDto(Long id, Long bookingId, String bookingRef, Long userId, PaymentMethod method, double amount,
                             PaymentStatus status, String gateway, String gatewayOrderId, String gatewayPaymentId, String createdAt) {}

    // ---------- Profile ----------
    public record UpdateProfileRequest(String name, String mobile, String avatarUrl) {}
    public record SavedPassengerDto(Long id, @NotBlank String name, int age, Gender gender) {}
    public record SaveCardRequest(@NotBlank String cardNumber, String holderName, String expiry) {}
    public record SavedCardDto(Long id, String maskedNumber, String holderName, String brand, String expiry) {}
    public record WalletDto(double balance, List<WalletTxn> transactions) {}
    public record WalletTxn(String description, double amount, String createdAt) {}
    public record NotificationDto(Long id, NotificationType type, String title, String body, boolean read, String createdAt) {}
    public record TicketRequest(@NotBlank String subject, @NotBlank String description) {}
    public record TicketDto(Long id, String subject, String description, TicketStatus status, String createdAt) {}
    public record Faq(String question, String answer) {}

    // ---------- Admin ----------
    public record RouteDto(Long id, Long fromCityId, String fromCity, Long toCityId, String toCity, int distanceKm, int durationMins, double baseFare) {}
    public record BusDto(Long id, String name, String busNumber, BusType busType, boolean ac, Long operatorId, String operatorName,
                         Set<Amenity> amenities, double rating, int reviews, int totalSeats, boolean active) {}
    public record DriverDto(Long id, String name, String phone, String licenseNumber, Long busId, String busNumber) {}
    public record SeatTemplateDto(Long id, String seatNumber, SeatKind kind, Deck deck, int row, int col,
                                  @JsonProperty("isWindow") boolean isWindow, @JsonProperty("isLadies") boolean isLadies, double extraFare) {}
    public record DayStat(String date, long count, double revenue) {}
    public record RouteStat(String route, long bookings) {}
    public record MethodStat(String method, double amount) {}
    public record Dashboard(long totalBookings, double revenue, long activeBuses, long users,
                            List<DayStat> bookingsByDay, List<RouteStat> topRoutes, List<MethodStat> paymentSplit) {}
}
