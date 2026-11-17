package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** A booking of one or more seats on a trip. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "bookings")
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(unique = true) private String bookingRef;
    private String pnr;
    @ManyToOne(fetch = FetchType.LAZY) private User user;
    @ManyToOne(fetch = FetchType.EAGER) private Trip trip;
    @Enumerated(EnumType.STRING) private BookingStatus status;
    private String seatNumbers;
    @ManyToOne(fetch = FetchType.EAGER) private BoardingPoint boardingPoint;
    @ManyToOne(fetch = FetchType.EAGER) private BoardingPoint droppingPoint;
    private double baseFare;
    private double gst;
    private double platformFee;
    private double convenienceFee;
    private double discount;
    private double couponDiscount;
    private double grandTotal;
    private String couponCode;
    private String contactMobile;
    private String contactEmail;
    private String emergencyContact;
    private String gstNumber;
    private String gstCompany;
    @Enumerated(EnumType.STRING) private PaymentStatus paymentStatus;
    @Builder.Default private Instant createdAt = Instant.now();
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default private List<Passenger> passengers = new ArrayList<>();

    /** Seat numbers as a list (stored comma separated). */
    public List<String> seatList() {
        return seatNumbers == null || seatNumbers.isBlank() ? new ArrayList<>() : new ArrayList<>(Arrays.asList(seatNumbers.split(",")));
    }
}
