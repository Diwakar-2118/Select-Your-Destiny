package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** A physical bus belonging to an operator. Seat template lives in {@link Seat}. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "buses")
public class Bus {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String name;
    private String busNumber;
    @Enumerated(EnumType.STRING) private BusType busType;
    private boolean ac;
    @ManyToOne(fetch = FetchType.EAGER) private Operator operator;
    @ElementCollection(fetch = FetchType.EAGER) @Enumerated(EnumType.STRING)
    @CollectionTable(name = "bus_amenities") @Builder.Default
    private Set<Amenity> amenities = new HashSet<>();
    private double rating;
    private int reviews;
    private int totalSeats;
    private int layoutRows;
    private int layoutCols;
    private boolean hasUpperDeck;
    @Builder.Default private boolean active = true;
}
