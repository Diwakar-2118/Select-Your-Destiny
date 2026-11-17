package com.selectyourdestiny.controller;

import com.selectyourdestiny.dto.ApiResponse;
import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.security.CurrentUser;
import com.selectyourdestiny.service.NotificationService;
import com.selectyourdestiny.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Profile, saved passengers/cards, wallet, notifications and support. */
@RestController
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileService profile;
    private final NotificationService notifications;

    @GetMapping("/users/me")
    public ApiResponse<UserDto> me() { return ApiResponse.ok(profile.me(CurrentUser.id())); }

    @PutMapping("/users/me")
    public ApiResponse<UserDto> update(@RequestBody UpdateProfileRequest r) { return ApiResponse.ok(profile.update(CurrentUser.id(), r), "Profile updated"); }

    @GetMapping("/users/me/passengers")
    public ApiResponse<List<SavedPassengerDto>> passengers() { return ApiResponse.ok(profile.passengers(CurrentUser.id())); }

    @PostMapping("/users/me/passengers")
    public ApiResponse<SavedPassengerDto> addPassenger(@Valid @RequestBody SavedPassengerDto d) { return ApiResponse.ok(profile.addPassenger(CurrentUser.id(), d), "Passenger saved"); }

    @DeleteMapping("/users/me/passengers/{id}")
    public ApiResponse<Void> deletePassenger(@PathVariable Long id) { profile.deletePassenger(CurrentUser.id(), id); return ApiResponse.ok(null, "Deleted"); }

    @GetMapping("/users/me/cards")
    public ApiResponse<List<SavedCardDto>> cards() { return ApiResponse.ok(profile.cards(CurrentUser.id())); }

    @PostMapping("/users/me/cards")
    public ApiResponse<SavedCardDto> addCard(@Valid @RequestBody SaveCardRequest r) { return ApiResponse.ok(profile.addCard(CurrentUser.id(), r), "Card saved"); }

    @DeleteMapping("/users/me/cards/{id}")
    public ApiResponse<Void> deleteCard(@PathVariable Long id) { profile.deleteCard(CurrentUser.id(), id); return ApiResponse.ok(null, "Deleted"); }

    @GetMapping("/users/me/wallet")
    public ApiResponse<WalletDto> wallet() { return ApiResponse.ok(profile.wallet(CurrentUser.id())); }

    @GetMapping("/notifications")
    public ApiResponse<List<NotificationDto>> notifications() { return ApiResponse.ok(notifications.list(CurrentUser.id())); }

    @PostMapping("/notifications/{id}/read")
    public ApiResponse<NotificationDto> read(@PathVariable Long id) { return ApiResponse.ok(notifications.markRead(CurrentUser.id(), id)); }

    @GetMapping("/support/tickets")
    public ApiResponse<List<TicketDto>> tickets() { return ApiResponse.ok(profile.tickets(CurrentUser.id())); }

    @PostMapping("/support/tickets")
    public ApiResponse<TicketDto> createTicket(@Valid @RequestBody TicketRequest r) { return ApiResponse.ok(profile.createTicket(CurrentUser.id(), r), "Ticket raised"); }

    @GetMapping("/support/faqs")
    public ApiResponse<List<Faq>> faqs() { return ApiResponse.ok(ProfileService.FAQS); }
}
