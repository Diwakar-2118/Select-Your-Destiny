package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Boarding or dropping point on a route; time = trip departure + offsetMins. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "boarding_points")
public class BoardingPoint {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) private Route route;
    @Enumerated(EnumType.STRING) private PointType type;
    private String name;
    private String address;
    private int offsetMins;
}
