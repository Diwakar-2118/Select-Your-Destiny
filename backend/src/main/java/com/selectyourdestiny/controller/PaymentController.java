package com.selectyourdestiny.controller;

import com.selectyourdestiny.dto.ApiResponse;
import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.security.CurrentUser;
import com.selectyourdestiny.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Payment initiation and verification. */
@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @PostMapping("/initiate")
    public ApiResponse<PaymentInitiateResponse> initiate(@Valid @RequestBody PaymentInitiateRequest r) {
        return ApiResponse.ok(paymentService.initiate(CurrentUser.id(), r), "Payment initiated");
    }

    @PostMapping("/verify")
    public ApiResponse<BookingDto> verify(@Valid @RequestBody PaymentVerifyRequest r) {
        return ApiResponse.ok(paymentService.verify(CurrentUser.id(), r), "Payment successful, booking confirmed");
    }
}
