package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Per-trip seat state with lock owner/expiry (10-min hold). Guarded by pessimistic row locks and optimistic @Version. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "trip_seats", uniqueConstraints = @UniqueConstraint(columnNames = {"trip_id", "seat_id"}))
public class TripSeat {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "trip_id") private Trip trip;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "seat_id") private Seat seat;
    private String seatNumber;
    @Enumerated(EnumType.STRING) private SeatStatus status;
    private Long lockedBy;
    private String lockId;
    private Instant lockExpiresAt;
    private Long bookingId;
    @Version private Long version;
}
