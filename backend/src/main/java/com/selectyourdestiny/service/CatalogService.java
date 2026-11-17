package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.exception.ApiException;
import com.selectyourdestiny.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Stream;

/** Public catalog: cities, popular routes, trip search, seat layouts, offers. */
@Service
@RequiredArgsConstructor
public class CatalogService {
    private final CityRepository cityRepo;
    private final RouteRepository routeRepo;
    private final TripRepository tripRepo;
    private final SeatRepository seatRepo;
    private final TripSeatRepository tripSeatRepo;
    private final CouponRepository couponRepo;
    private final TripSeatInitializer initializer;
    private final FareService fareService;
    private final Mapper mapper;

    public List<CityDto> cities() {
        return cityRepo.findAll().stream().sorted(Comparator.comparing(City::getName)).map(mapper::city).toList();
    }

    public List<PopularRoute> popularRoutes() {
        return routeRepo.findAll().stream().limit(10)
                .map(r -> new PopularRoute(r.getFromCity().getName(), r.getToCity().getName(), r.getBaseFare())).toList();
    }

    private City resolveCity(String v) {
        if (v == null || v.isBlank()) throw ApiException.badRequest("from and to are required");
        if (v.chars().allMatch(Character::isDigit)) return cityRepo.findById(Long.valueOf(v)).orElseThrow(() -> ApiException.notFound("City"));
        return cityRepo.findFirstByNameIgnoreCase(v.trim()).orElseThrow(() -> ApiException.notFound("City '" + v + "'"));
    }

    @Transactional(readOnly = true)
    public List<TripDto> search(String from, String to, String date, String busType, Boolean ac, Boolean sleeper,
                                String departure, String operator, String amenities, String sort) {
        City f = resolveCity(from), t = resolveCity(to);
        LocalDate d = date == null || date.isBlank() ? LocalDate.now() : LocalDate.parse(date);
        Stream<Trip> s = tripRepo.findByRouteFromCityIdAndRouteToCityIdAndJourneyDate(f.getId(), t.getId(), d).stream()
                .filter(tr -> tr.getBus().isActive());
        if (busType != null && !busType.isBlank()) {
            Set<String> types = Set.of(busType.toUpperCase().split(","));
            s = s.filter(tr -> types.contains(tr.getBus().getBusType().name()));
        }
        if (ac != null) s = s.filter(tr -> tr.getBus().isAc() == ac);
        if (sleeper != null) s = s.filter(tr -> tr.getBus().isHasUpperDeck() == sleeper || tr.getBus().getBusType().name().contains("SLEEPER") == sleeper);
        if (departure != null && !departure.isBlank()) {
            String dep = departure.toUpperCase();
            s = s.filter(tr -> bucket(tr.getDepartureTime().getHour()).equals(dep));
        }
        if (operator != null && !operator.isBlank()) {
            String op = operator.toLowerCase();
            s = s.filter(tr -> tr.getBus().getOperator().getName().toLowerCase().contains(op));
        }
        if (amenities != null && !amenities.isBlank()) {
            Set<Amenity> need = new HashSet<>();
            for (String a : amenities.split(",")) need.add(Amenity.valueOf(a.trim().toUpperCase()));
            s = s.filter(tr -> tr.getBus().getAmenities().containsAll(need));
        }
        List<TripDto> list = new ArrayList<>(s.map(mapper::trip).toList());
        Comparator<TripDto> cmp = switch (sort == null ? "DEPARTURE" : sort.toUpperCase()) {
            case "PRICE_ASC" -> Comparator.comparingDouble(TripDto::fare);
            case "PRICE_DESC" -> Comparator.comparingDouble(TripDto::fare).reversed();
            case "RATING_DESC" -> Comparator.comparingDouble(TripDto::rating).reversed();
            case "ARRIVAL" -> Comparator.comparing(TripDto::arrivalTime);
            default -> Comparator.comparing(TripDto::departureTime);
        };
        list.sort(cmp);
        return list;
    }

    static String bucket(int hour) {
        if (hour >= 5 && hour < 12) return "MORNING";
        if (hour >= 12 && hour < 17) return "AFTERNOON";
        if (hour >= 17 && hour < 21) return "EVENING";
        return "NIGHT";
    }

    public Trip tripEntity(Long id) { return tripRepo.findById(id).orElseThrow(() -> ApiException.notFound("Trip")); }

    @Transactional(readOnly = true)
    public TripDto trip(Long id) { return mapper.trip(tripEntity(id)); }

    /** Seat layout with live status. Seats locked by the caller are reported as SELECTED. */
    @Transactional
    public SeatLayout seatLayout(Long tripId, Long viewerId) {
        Trip trip = tripEntity(tripId);
        initializer.ensure(tripId);
        Instant now = Instant.now();
        Bus bus = trip.getBus();
        List<SeatDto> seats = tripSeatRepo.findByTripId(tripId).stream()
                .sorted(Comparator.comparing((TripSeat ts) -> ts.getSeat().getDeck()).thenComparing(ts -> ts.getSeat().getRowNum()).thenComparing(ts -> ts.getSeat().getColNum()))
                .map(ts -> {
                    Seat seat = ts.getSeat();
                    SeatStatus st = ts.getStatus();
                    if (st == SeatStatus.LOCKED) {
                        if (ts.getLockExpiresAt() == null || ts.getLockExpiresAt().isBefore(now)) st = SeatStatus.AVAILABLE;
                        else if (viewerId != null && viewerId.equals(ts.getLockedBy())) st = SeatStatus.SELECTED;
                    }
                    return new SeatDto(seat.getId(), seat.getSeatNumber(), seat.getKind(), seat.getDeck(), seat.getRowNum(), seat.getColNum(),
                            seat.isWindowSeat(), seat.isLadies(), fareService.seatPrice(trip, seat), st);
                }).toList();
        return new SeatLayout(tripId, seats, bus.getLayoutRows(), bus.getLayoutCols(), bus.isHasUpperDeck());
    }

    public List<Coupon> offers() {
        return couponRepo.findByActiveTrue().stream()
                .filter(c -> c.getValidTill() == null || !c.getValidTill().isBefore(LocalDate.now())).toList();
    }
}
