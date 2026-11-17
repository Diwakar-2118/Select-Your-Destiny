package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Frequently used passenger saved in a user profile. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "saved_passengers")
public class SavedPassenger {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long userId;
    private String name;
    private int age;
    @Enumerated(EnumType.STRING) private Gender gender;
}
