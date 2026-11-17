package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Saved card - only a masked number is stored (never PAN/CVV). */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "saved_cards")
public class SavedCard {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long userId;
    private String maskedNumber;
    private String holderName;
    private String brand;
    private String expiry;
}
