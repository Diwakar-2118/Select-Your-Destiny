package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Payment attempt for a booking. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "payments")
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.EAGER) private Booking booking;
    private Long userId;
    @Enumerated(EnumType.STRING) private PaymentMethod method;
    private double amount;
    @Enumerated(EnumType.STRING) private PaymentStatus status;
    private String gateway;
    private String gatewayOrderId;
    private String gatewayPaymentId;
    @Builder.Default private Instant createdAt = Instant.now();
}
