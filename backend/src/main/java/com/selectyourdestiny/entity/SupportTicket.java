package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Customer support ticket. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "support_tickets")
public class SupportTicket {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long userId;
    private String subject;
    @Column(length = 2000) private String description;
    @Enumerated(EnumType.STRING) private TicketStatus status;
    @Builder.Default private Instant createdAt = Instant.now();
}
