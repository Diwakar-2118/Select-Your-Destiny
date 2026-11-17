package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** In-app notification for a user. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "notifications")
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long userId;
    @Enumerated(EnumType.STRING) private NotificationType type;
    private String title;
    @Column(length = 1000) private String body;
    @Column(name = "is_read") private boolean read;
    @Builder.Default private Instant createdAt = Instant.now();
}
