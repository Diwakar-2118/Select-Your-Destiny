package com.selectyourdestiny.service;

import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lazily materialises {@link TripSeat} rows for a trip from the bus seat template.
 * Runs in its own transaction and is synchronized so concurrent first-access does not double insert.
 */
@Service
@RequiredArgsConstructor
public class TripSeatInitializer {
    private final TripSeatRepository tripSeatRepo;
    private final SeatRepository seatRepo;
    private final TripRepository tripRepo;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public synchronized void ensure(Long tripId) {
        if (tripSeatRepo.existsByTripId(tripId)) return;
        Trip trip = tripRepo.getReferenceById(tripId);
        Long busId = tripRepo.findById(tripId).orElseThrow().getBus().getId();
        List<TripSeat> rows = seatRepo.findByBusIdOrderByDeckAscRowNumAscColNumAsc(busId).stream()
                .map(s -> TripSeat.builder().trip(trip).seat(s).seatNumber(s.getSeatNumber()).status(SeatStatus.AVAILABLE).build())
                .toList();
        tripSeatRepo.saveAll(rows);
    }
}
