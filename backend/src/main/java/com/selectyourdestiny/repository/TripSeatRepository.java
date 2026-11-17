package com.selectyourdestiny.repository;

import com.selectyourdestiny.entity.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.*;
import java.util.*;

/** Spring Data repository for {@link TripSeat}. */
public interface TripSeatRepository extends JpaRepository<TripSeat, Long> {
    List<TripSeat> findByTripId(Long tripId);
    boolean existsByTripId(Long tripId);
    List<TripSeat> findByBookingId(Long bookingId);

    /** Row-level pessimistic lock on the requested seats of a trip. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ts from TripSeat ts where ts.trip.id = :tripId and ts.seatNumber in :nums")
    List<TripSeat> findForUpdate(@Param("tripId") Long tripId, @Param("nums") Collection<String> nums);

    @Query("select count(ts) from TripSeat ts where ts.trip.id = :tripId and (ts.status = com.selectyourdestiny.entity.SeatStatus.BOOKED or (ts.status = com.selectyourdestiny.entity.SeatStatus.LOCKED and ts.lockExpiresAt > :now))")
    long countUnavailable(@Param("tripId") Long tripId, @Param("now") Instant now);

    /** Bulk-release expired locks (bumps version so concurrent optimistic writers fail). */
    @Modifying
    @Query("update TripSeat ts set ts.status = com.selectyourdestiny.entity.SeatStatus.AVAILABLE, ts.lockedBy = null, ts.lockId = null, ts.lockExpiresAt = null, ts.version = ts.version + 1 where ts.status = com.selectyourdestiny.entity.SeatStatus.LOCKED and ts.lockExpiresAt < :now")
    int releaseExpired(@Param("now") Instant now);
}
