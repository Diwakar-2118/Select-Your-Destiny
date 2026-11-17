package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Promotional coupon. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "coupons")
public class Coupon {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(unique = true) private String code;
    private String description;
    @Enumerated(EnumType.STRING) private CouponType type;
    @Column(name = "coupon_value") private double value;
    private double minAmount;
    private double maxDiscount;
    private LocalDate validTill;
    private boolean active;
    @Enumerated(EnumType.STRING) private CouponCategory category;
}
