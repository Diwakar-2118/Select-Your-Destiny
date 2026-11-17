package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** Converts entities to contract DTOs. */
@Component
@RequiredArgsConstructor
public class Mapper {
    public static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    private final BoardingPointRepository pointRepo;
    private final TripSeatRepository tripSeatRepo;
    private final SeatRepository seatRepo;

    public UserDto user(User u) {
        return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getMobile(), u.getRole(), u.getAvatarUrl(), round(u.getWalletBalance()));
    }

    public CityDto city(City c) { return new CityDto(c.getId(), c.getName(), c.getState()); }

    public PointDto point(BoardingPoint p, Trip trip) {
        if (p == null) return null;
        LocalTime t = trip.getDepartureTime().plusMinutes(p.getOffsetMins());
        return new PointDto(p.getId(), p.getName(), p.getAddress(), t.format(HHMM));
    }

    public TripDto trip(Trip t) {
        Bus b = t.getBus();
        Route r = t.getRoute();
        List<PointDto> boarding = pointRepo.findByRouteIdAndTypeOrderByOffsetMins(r.getId(), PointType.BOARDING).stream().map(p -> point(p, t)).toList();
        List<PointDto> dropping = pointRepo.findByRouteIdAndTypeOrderByOffsetMins(r.getId(), PointType.DROPPING).stream().map(p -> point(p, t)).toList();
        int total = b.getTotalSeats();
        int unavailable = (int) tripSeatRepo.countUnavailable(t.getId(), Instant.now());
        int available = Math.max(0, total - unavailable);
        int windowSeats = (int) seatRepo.findByBusIdOrderByDeckAscRowNumAscColNumAsc(b.getId()).stream().filter(Seat::isWindowSeat).count();
        return new TripDto(t.getId(), b.getId(), b.getName(), b.getOperator() != null ? b.getOperator().getName() : null, b.getBusNumber(),
                b.getBusType(), b.isAc(), b.getRating(), b.getReviews(),
                r.getFromCity().getName(), r.getToCity().getName(), t.getJourneyDate().toString(),
                t.getDepartureTime().format(HHMM), t.getArrivalTime().format(HHMM), t.getDurationMins(),
                boarding, dropping, available, windowSeats, total, b.getAmenities(), t.getFare(), t.getDiscountPercent(), t.getCouponCode());
    }

    public FareBreakdown fare(Booking b) {
        return new FareBreakdown(b.getBaseFare(), b.getGst(), b.getPlatformFee(), b.getConvenienceFee(), b.getDiscount(), b.getCouponDiscount(), b.getGrandTotal());
    }

    public BookingDto booking(Booking b) {
        List<PassengerInput> ps = b.getPassengers().stream().map(p -> new PassengerInput(p.getName(), p.getAge(), p.getGender(), p.getSeatNumber())).toList();
        return new BookingDto(b.getId(), b.getBookingRef(), b.getPnr(), b.getStatus(), trip(b.getTrip()), b.seatList(), ps,
                point(b.getBoardingPoint(), b.getTrip()), point(b.getDroppingPoint(), b.getTrip()), fare(b),
                b.getContactMobile(), b.getContactEmail(), b.getCreatedAt().toString(), b.getPaymentStatus());
    }

    public PaymentDto payment(Payment p) {
        return new PaymentDto(p.getId(), p.getBooking().getId(), p.getBooking().getBookingRef(), p.getUserId(), p.getMethod(), p.getAmount(),
                p.getStatus(), p.getGateway(), p.getGatewayOrderId(), p.getGatewayPaymentId(), p.getCreatedAt().toString());
    }

    public NotificationDto notification(Notification n) {
        return new NotificationDto(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.isRead(), n.getCreatedAt().toString());
    }

    public RouteDto route(Route r) {
        return new RouteDto(r.getId(), r.getFromCity().getId(), r.getFromCity().getName(), r.getToCity().getId(), r.getToCity().getName(),
                r.getDistanceKm(), r.getDurationMins(), r.getBaseFare());
    }

    public BusDto bus(Bus b) {
        return new BusDto(b.getId(), b.getName(), b.getBusNumber(), b.getBusType(), b.isAc(),
                b.getOperator() != null ? b.getOperator().getId() : null, b.getOperator() != null ? b.getOperator().getName() : null,
                b.getAmenities(), b.getRating(), b.getReviews(), b.getTotalSeats(), b.isActive());
    }

    public DriverDto driver(Driver d) {
        return new DriverDto(d.getId(), d.getName(), d.getPhone(), d.getLicenseNumber(),
                d.getBus() != null ? d.getBus().getId() : null, d.getBus() != null ? d.getBus().getBusNumber() : null);
    }

    public SeatTemplateDto seatTemplate(Seat s) {
        return new SeatTemplateDto(s.getId(), s.getSeatNumber(), s.getKind(), s.getDeck(), s.getRowNum(), s.getColNum(), s.isWindowSeat(), s.isLadies(), s.getExtraFare());
    }

    public static double round(double v) { return Math.round(v * 100.0) / 100.0; }
}
