package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Seat template of a bus (layout position, kind, ladies flag, extra fare). */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "seats")
public class Seat {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) private Bus bus;
    private String seatNumber;
    @Enumerated(EnumType.STRING) private SeatKind kind;
    @Enumerated(EnumType.STRING) private Deck deck;
    @Column(name = "row_num") private int rowNum;
    @Column(name = "col_num") private int colNum;
    private boolean windowSeat;
    private boolean ladies;
    private double extraFare;
}
