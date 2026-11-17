package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** A route between two cities. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "routes")
public class Route {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.EAGER) private City fromCity;
    @ManyToOne(fetch = FetchType.EAGER) private City toCity;
    private int distanceKm;
    private int durationMins;
    private double baseFare;
}
