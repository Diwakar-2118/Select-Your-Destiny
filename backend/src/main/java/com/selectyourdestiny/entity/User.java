package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Application user (customer or admin). */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String name;
    @Column(unique = true) private String email;
    private String mobile;
    private String password;
    @Enumerated(EnumType.STRING) private Role role;
    private String avatarUrl;
    @Builder.Default private double walletBalance = 0;
    @Builder.Default private Instant createdAt = Instant.now();
}
