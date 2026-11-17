package com.selectyourdestiny.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.util.*;

/** Bus driver, optionally assigned to a bus. */
@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "drivers")
public class Driver {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String name;
    private String phone;
    private String licenseNumber;
    @ManyToOne(fetch = FetchType.EAGER) private Bus bus;
}
