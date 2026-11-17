package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.Role;
import com.selectyourdestiny.entity.User;
import com.selectyourdestiny.exception.ApiException;
import com.selectyourdestiny.repository.UserRepository;
import com.selectyourdestiny.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authentication: email/password, OTP (dev code always accepted), social (dev: trusts token), registration.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final Mapper mapper;
    private final Map<String, String> otps = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    @Value("${app.otp.dev-code:123456}")
    private String devOtp;

    public SentResponse sendOtp(String mobile) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        otps.put(mobile, otp);
        log.info("OTP for {} is {} (dev code {} also accepted)", mobile, otp, devOtp);
        return new SentResponse(true);
    }

    @Transactional
    public AuthResponse verifyOtp(String mobile, String otp) {
        if (!devOtp.equals(otp) && !otp.equals(otps.get(mobile))) throw ApiException.unauthorized("Invalid OTP");
        otps.remove(mobile);
        User u = userRepo.findFirstByMobile(mobile).orElseGet(() -> userRepo.save(User.builder()
                .name("Traveller").mobile(mobile).email(mobile + "@mobile.destiny.com")
                .password(encoder.encode(UUID.randomUUID().toString())).role(Role.USER).build()));
        return auth(u);
    }

    public AuthResponse login(LoginRequest r) {
        User u = userRepo.findByEmailIgnoreCase(r.email()).orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        if (!encoder.matches(r.password(), u.getPassword())) throw ApiException.unauthorized("Invalid email or password");
        return auth(u);
    }

    @Transactional
    public AuthResponse register(RegisterRequest r) {
        if (userRepo.findByEmailIgnoreCase(r.email()).isPresent()) throw ApiException.conflict("Email already registered");
        User u = userRepo.save(User.builder().name(r.name()).email(r.email().toLowerCase()).mobile(r.mobile())
                .password(encoder.encode(r.password())).role(Role.USER).walletBalance(100).build());
        return auth(u);
    }

    /** Dev: trusts the id token. If it looks like an email it is used as the account email. */
    @Transactional
    public AuthResponse social(SocialRequest r) {
        String email = r.idToken().contains("@") ? r.idToken().toLowerCase()
                : r.provider().toLowerCase() + "_" + Integer.toHexString(r.idToken().hashCode()) + "@social.destiny.com";
        User u = userRepo.findByEmailIgnoreCase(email).orElseGet(() -> userRepo.save(User.builder()
                .name(r.provider().charAt(0) + r.provider().substring(1).toLowerCase() + " User").email(email).mobile("")
                .password(encoder.encode(UUID.randomUUID().toString())).role(Role.USER).build()));
        return auth(u);
    }

    public SentResponse forgotPassword(String email) {
        log.info("Password reset link requested for {} (would be emailed in prod)", email);
        return new SentResponse(true);
    }

    public UserDto me(Long userId) {
        return mapper.user(userRepo.findById(userId).orElseThrow(() -> ApiException.notFound("User")));
    }

    private AuthResponse auth(User u) { return new AuthResponse(jwt.generate(u), mapper.user(u)); }
}
