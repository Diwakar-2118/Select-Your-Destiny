package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.exception.ApiException;
import com.selectyourdestiny.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

import static com.selectyourdestiny.service.Mapper.round;

/** Admin CRUD for operators, routes, buses (incl. seat templates), drivers, coupons, plus dashboard/reports. */
@Service
@RequiredArgsConstructor
public class AdminService {
    private final OperatorRepository operatorRepo;
    private final RouteRepository routeRepo;
    private final CityRepository cityRepo;
    private final BusRepository busRepo;
    private final SeatRepository seatRepo;
    private final DriverRepository driverRepo;
    private final CouponRepository couponRepo;
    private final BookingRepository bookingRepo;
    private final PaymentRepository paymentRepo;
    private final UserRepository userRepo;
    private final Mapper mapper;

    // ---- operators ----
    public List<Operator> operators() { return operatorRepo.findAll(); }
    public Operator saveOperator(Long id, Operator o) {
        if (id != null) operatorRepo.findById(id).orElseThrow(() -> ApiException.notFound("Operator"));
        o.setId(id);
        return operatorRepo.save(o);
    }
    public void deleteOperator(Long id) { operatorRepo.deleteById(id); }

    // ---- routes ----
    public List<RouteDto> routes() { return routeRepo.findAll().stream().map(mapper::route).toList(); }
    public RouteDto saveRoute(Long id, RouteDto d) {
        Route r = id == null ? new Route() : routeRepo.findById(id).orElseThrow(() -> ApiException.notFound("Route"));
        r.setFromCity(cityRepo.findById(d.fromCityId()).orElseThrow(() -> ApiException.notFound("From city")));
        r.setToCity(cityRepo.findById(d.toCityId()).orElseThrow(() -> ApiException.notFound("To city")));
        r.setDistanceKm(d.distanceKm());
        r.setDurationMins(d.durationMins());
        r.setBaseFare(d.baseFare());
        return mapper.route(routeRepo.save(r));
    }
    public void deleteRoute(Long id) { routeRepo.deleteById(id); }

    // ---- buses ----
    public List<BusDto> buses() { return busRepo.findAll().stream().map(mapper::bus).toList(); }

    @Transactional
    public BusDto saveBus(Long id, BusDto d) {
        boolean isNew = id == null;
        Bus b = isNew ? new Bus() : busRepo.findById(id).orElseThrow(() -> ApiException.notFound("Bus"));
        b.setName(d.name());
        b.setBusNumber(d.busNumber());
        b.setBusType(d.busType());
        b.setAc(d.ac());
        if (d.operatorId() != null) b.setOperator(operatorRepo.findById(d.operatorId()).orElseThrow(() -> ApiException.notFound("Operator")));
        b.setAmenities(d.amenities() == null ? new HashSet<>() : new HashSet<>(d.amenities()));
        b.setRating(d.rating());
        b.setReviews(d.reviews());
        b.setActive(isNew || d.active());
        if (isNew) {
            List<Seat> seats = SeatTemplateGenerator.generate(b);
            b = busRepo.save(b);
            seatRepo.saveAll(seats);
        } else {
            b = busRepo.save(b);
        }
        return mapper.bus(b);
    }

    /** Soft delete: deactivates the bus so historical trips/bookings remain valid. */
    @Transactional
    public void deleteBus(Long id) {
        Bus b = busRepo.findById(id).orElseThrow(() -> ApiException.notFound("Bus"));
        b.setActive(false);
    }

    public List<SeatTemplateDto> busSeats(Long busId) {
        return seatRepo.findByBusIdOrderByDeckAscRowNumAscColNumAsc(busId).stream().map(mapper::seatTemplate).toList();
    }

    /** Upserts seats by seat number (existing seats are updated in place so trip seat history is kept). */
    @Transactional
    public List<SeatTemplateDto> updateBusSeats(Long busId, List<SeatTemplateDto> input) {
        Bus bus = busRepo.findById(busId).orElseThrow(() -> ApiException.notFound("Bus"));
        Map<String, Seat> existing = seatRepo.findByBusIdOrderByDeckAscRowNumAscColNumAsc(busId).stream()
                .collect(Collectors.toMap(Seat::getSeatNumber, s -> s));
        for (SeatTemplateDto d : input) {
            Seat s = existing.getOrDefault(d.seatNumber(), Seat.builder().bus(bus).seatNumber(d.seatNumber()).build());
            s.setKind(d.kind());
            s.setDeck(d.deck() == null ? Deck.LOWER : d.deck());
            s.setRowNum(d.row());
            s.setColNum(d.col());
            s.setWindowSeat(d.isWindow());
            s.setLadies(d.isLadies());
            s.setExtraFare(d.extraFare());
            seatRepo.save(s);
        }
        List<Seat> all = seatRepo.findByBusIdOrderByDeckAscRowNumAscColNumAsc(busId);
        bus.setTotalSeats(all.size());
        bus.setLayoutRows(all.stream().mapToInt(Seat::getRowNum).max().orElse(-1) + 1);
        bus.setLayoutCols(all.stream().mapToInt(Seat::getColNum).max().orElse(-1) + 1);
        bus.setHasUpperDeck(all.stream().anyMatch(s -> s.getDeck() == Deck.UPPER));
        return all.stream().map(mapper::seatTemplate).toList();
    }

    // ---- drivers ----
    public List<DriverDto> drivers() { return driverRepo.findAll().stream().map(mapper::driver).toList(); }
    public DriverDto saveDriver(Long id, DriverDto d) {
        Driver dr = id == null ? new Driver() : driverRepo.findById(id).orElseThrow(() -> ApiException.notFound("Driver"));
        dr.setName(d.name());
        dr.setPhone(d.phone());
        dr.setLicenseNumber(d.licenseNumber());
        dr.setBus(d.busId() == null ? null : busRepo.findById(d.busId()).orElseThrow(() -> ApiException.notFound("Bus")));
        return mapper.driver(driverRepo.save(dr));
    }
    public void deleteDriver(Long id) { driverRepo.deleteById(id); }

    // ---- coupons ----
    public List<Coupon> coupons() { return couponRepo.findAll(); }
    public Coupon saveCoupon(Long id, Coupon c) {
        if (id != null) couponRepo.findById(id).orElseThrow(() -> ApiException.notFound("Coupon"));
        c.setId(id);
        if (c.getCode() != null) c.setCode(c.getCode().toUpperCase());
        return couponRepo.save(c);
    }
    public void deleteCoupon(Long id) { couponRepo.deleteById(id); }

    // ---- bookings / payments ----
    @Transactional(readOnly = true)
    public List<BookingDto> bookings() { return bookingRepo.findAllByOrderByCreatedAtDesc().stream().map(mapper::booking).toList(); }

    @Transactional(readOnly = true)
    public List<PaymentDto> payments() { return paymentRepo.findAllByOrderByCreatedAtDesc().stream().map(mapper::payment).toList(); }

    // ---- dashboard ----
    @Transactional(readOnly = true)
    public Dashboard dashboard(LocalDate from, LocalDate to) {
        boolean filtered = from != null || to != null;
        LocalDate f = from != null ? from : LocalDate.now().minusDays(6);
        LocalDate t = to != null ? to : LocalDate.now();
        ZoneId z = ZoneId.systemDefault();

        List<Booking> bookings = bookingRepo.findAll().stream()
                .filter(b -> !filtered || inRange(b.getCreatedAt().atZone(z).toLocalDate(), f, t)).toList();
        List<Payment> payments = paymentRepo.findAll().stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .filter(p -> !filtered || inRange(p.getCreatedAt().atZone(z).toLocalDate(), f, t)).toList();
        double revenue = round(payments.stream().mapToDouble(Payment::getAmount).sum());

        List<DayStat> byDay = new ArrayList<>();
        for (LocalDate d = f; !d.isAfter(t); d = d.plusDays(1)) {
            LocalDate day = d;
            List<Booking> dayB = bookings.stream().filter(b -> b.getCreatedAt().atZone(z).toLocalDate().equals(day)).toList();
            double rev = dayB.stream().filter(b -> b.getPaymentStatus() == PaymentStatus.SUCCESS).mapToDouble(Booking::getGrandTotal).sum();
            byDay.add(new DayStat(day.toString(), dayB.size(), round(rev)));
        }
        List<RouteStat> top = bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getTrip().getRoute().getFromCity().getName() + " - " + b.getTrip().getRoute().getToCity().getName(), Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(5)
                .map(e -> new RouteStat(e.getKey(), e.getValue())).toList();
        List<MethodStat> split = payments.stream()
                .collect(Collectors.groupingBy(p -> p.getMethod().name(), Collectors.summingDouble(Payment::getAmount)))
                .entrySet().stream().map(e -> new MethodStat(e.getKey(), round(e.getValue()))).toList();
        return new Dashboard(bookings.size(), revenue, busRepo.countByActiveTrue(), userRepo.count(), byDay, top, split);
    }

    private static boolean inRange(LocalDate d, LocalDate f, LocalDate t) { return !d.isBefore(f) && !d.isAfter(t); }
}
