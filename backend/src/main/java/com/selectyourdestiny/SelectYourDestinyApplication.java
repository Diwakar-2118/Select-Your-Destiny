package com.selectyourdestiny;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Select Your Destiny - "Book Smart. Travel Comfortably." Bus booking REST API entry point. */
@SpringBootApplication
@EnableScheduling
public class SelectYourDestinyApplication {
    public static void main(String[] args) {
        SpringApplication.run(SelectYourDestinyApplication.class, args);
    }
}
