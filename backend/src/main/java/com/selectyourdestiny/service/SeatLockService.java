package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.exception.ApiException;
import com.selectyourdestiny.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Real-time seat availability. Seats are held for a configurable TTL (10 min) using
 * PESSIMISTIC_WRITE row locks inside a transaction, with {@code @Version} as a second guard.
 * Conflicts surface as HTTP 409. A scheduled job releases expired holds.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatLockService {
    private final TripSeatRepository tripSeatRepo;
    private final TripSeatInitializer initializer;

    @Value("${app.seat-lock-minutes:10}")
    private long lockMinutes;

    /** A seat is free for {@code userId} if available, its lock expired, or already locked by the same user. */
    static boolean isFreeFor(TripSeat ts, Long userId, Instant now) {
        return switch (ts.getStatus()) {
            case AVAILABLE, SELECTED -> true;
            case LOCKED -> ts.getLockExpiresAt() == null || ts.getLockExpiresAt().isBefore(now) || Objects.equals(ts.getLockedBy(), userId);
            case BOOKED -> false;
        };
    }

    @Transactional
    public SeatLockResponse lock(Long userId, Long tripId, List<String> seatNumbers) {
        List<TripSeat> seats = lockRows(tripId, seatNumbers);
        Instant now = Instant.now();
        List<String> taken = seats.stream().filter(s -> !isFreeFor(s, userId, now)).map(TripSeat::getSeatNumber).toList();
        if (!taken.isEmpty()) throw ApiException.conflict("Seat(s) not available: " + String.join(", ", taken));
        String lockId = UUID.randomUUID().toString();
        Instant expires = now.plus(lockMinutes, ChronoUnit.MINUTES);
        for (TripSeat s : seats) {
            s.setStatus(SeatStatus.LOCKED);
            s.setLockedBy(userId);
            s.setLockId(lockId);
            s.setLockExpiresAt(expires);
        }
        tripSeatRepo.saveAllAndFlush(seats);
        return new SeatLockResponse(lockId, expires.toString());
    }

    @Transactional
    public void release(Long userId, Long tripId, List<String> seatNumbers) {
        for (TripSeat s : lockRows(tripId, seatNumbers)) {
            if (s.getStatus() == SeatStatus.LOCKED && Objects.equals(s.getLockedBy(), userId) && s.getBookingId() == null) {
                clear(s);
            }
        }
    }

    /** Loads and row-locks the requested seats, validating they all exist. Must be called inside a transaction. */
    public List<TripSeat> lockRows(Long tripId, Collection<String> seatNumbers) {
        if (seatNumbers == null || seatNumbers.isEmpty()) throw ApiException.badRequest("No seats selected");
        initializer.ensure(tripId);
        Set<String> wanted = new HashSet<>(seatNumbers);
        List<TripSeat> seats = tripSeatRepo.findForUpdate(tripId, wanted);
        if (seats.size() != wanted.size()) throw ApiException.badRequest("Unknown seat number(s) for this trip");
        return seats;
    }

    public static void clear(TripSeat s) {
        s.setStatus(SeatStatus.AVAILABLE);
        s.setLockedBy(null);
        s.setLockId(null);
        s.setLockExpiresAt(null);
        s.setBookingId(null);
    }

    /** Releases expired seat holds every 30 seconds. */
    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void releaseExpiredLocks() {
        int n = tripSeatRepo.releaseExpired(Instant.now());
        if (n > 0) log.info("Released {} expired seat lock(s)", n);
    }
}
