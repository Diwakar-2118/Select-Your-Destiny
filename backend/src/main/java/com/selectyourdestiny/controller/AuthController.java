package com.selectyourdestiny.controller;

import com.selectyourdestiny.dto.ApiResponse;
import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.security.CurrentUser;
import com.selectyourdestiny.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Authentication endpoints: OTP, email/password, social, register, me. */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;

    @PostMapping("/otp/send")
    public ApiResponse<SentResponse> sendOtp(@Valid @RequestBody OtpSendRequest r) { return ApiResponse.ok(auth.sendOtp(r.mobile()), "OTP sent"); }

    @PostMapping("/otp/verify")
    public ApiResponse<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest r) { return ApiResponse.ok(auth.verifyOtp(r.mobile(), r.otp()), "Logged in"); }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest r) { return ApiResponse.ok(auth.login(r), "Logged in"); }

    @PostMapping("/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest r) { return ApiResponse.ok(auth.register(r), "Registered"); }

    @PostMapping("/social")
    public ApiResponse<AuthResponse> social(@Valid @RequestBody SocialRequest r) { return ApiResponse.ok(auth.social(r), "Logged in"); }

    @PostMapping("/forgot-password")
    public ApiResponse<SentResponse> forgot(@Valid @RequestBody ForgotPasswordRequest r) { return ApiResponse.ok(auth.forgotPassword(r.email()), "Reset link sent"); }

    @GetMapping("/me")
    public ApiResponse<UserDto> me() { return ApiResponse.ok(auth.me(CurrentUser.id())); }
}
