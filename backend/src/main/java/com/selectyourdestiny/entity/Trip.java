package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** A bus running a route on a specific date. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "trips", indexes = @Index(columnList = "journeyDate"))
public class Trip {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.EAGER) private Bus bus;
    @ManyToOne(fetch = FetchType.EAGER) private Route route;
    private LocalDate journeyDate;
    private LocalTime departureTime;
    private LocalTime arrivalTime;
    private int durationMins;
    private double fare;
    private double discountPercent;
    private String couponCode;
}
