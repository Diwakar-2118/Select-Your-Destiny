package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Passenger travelling on a booking. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "passengers")
public class Passenger {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) private Booking booking;
    private String name;
    private int age;
    @Enumerated(EnumType.STRING) private Gender gender;
    private String seatNumber;
}
