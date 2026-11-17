package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.exception.ApiException;
import com.selectyourdestiny.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/** Profile, saved passengers, saved (masked) cards, wallet and support tickets. */
@Service
@RequiredArgsConstructor
public class ProfileService {
    private final UserRepository userRepo;
    private final SavedPassengerRepository passengerRepo;
    private final SavedCardRepository cardRepo;
    private final BookingRepository bookingRepo;
    private final SupportTicketRepository ticketRepo;
    private final Mapper mapper;

    private User user(Long id) { return userRepo.findById(id).orElseThrow(() -> ApiException.notFound("User")); }

    public UserDto me(Long id) { return mapper.user(user(id)); }

    @Transactional
    public UserDto update(Long id, UpdateProfileRequest r) {
        User u = user(id);
        if (r.name() != null && !r.name().isBlank()) u.setName(r.name());
        if (r.mobile() != null && !r.mobile().isBlank()) u.setMobile(r.mobile());
        if (r.avatarUrl() != null) u.setAvatarUrl(r.avatarUrl());
        return mapper.user(u);
    }

    public List<SavedPassengerDto> passengers(Long userId) {
        return passengerRepo.findByUserId(userId).stream().map(p -> new SavedPassengerDto(p.getId(), p.getName(), p.getAge(), p.getGender())).toList();
    }

    public SavedPassengerDto addPassenger(Long userId, SavedPassengerDto d) {
        SavedPassenger p = passengerRepo.save(SavedPassenger.builder().userId(userId).name(d.name()).age(d.age()).gender(d.gender()).build());
        return new SavedPassengerDto(p.getId(), p.getName(), p.getAge(), p.getGender());
    }

    public void deletePassenger(Long userId, Long id) {
        SavedPassenger p = passengerRepo.findById(id).filter(x -> x.getUserId().equals(userId)).orElseThrow(() -> ApiException.notFound("Passenger"));
        passengerRepo.delete(p);
    }

    public List<SavedCardDto> cards(Long userId) {
        return cardRepo.findByUserId(userId).stream().map(this::card).toList();
    }

    /** Stores only the masked number (last 4 digits) and brand; the full PAN is discarded. */
    public SavedCardDto addCard(Long userId, SaveCardRequest r) {
        String digits = r.cardNumber().replaceAll("\\D", "");
        if (digits.length() < 12) throw ApiException.badRequest("Invalid card number");
        String brand = digits.startsWith("4") ? "VISA" : digits.startsWith("5") ? "MASTERCARD" : digits.startsWith("6") ? "RUPAY" : digits.startsWith("3") ? "AMEX" : "CARD";
        SavedCard c = cardRepo.save(SavedCard.builder().userId(userId).maskedNumber("XXXX XXXX XXXX " + digits.substring(digits.length() - 4))
                .holderName(r.holderName()).brand(brand).expiry(r.expiry()).build());
        return card(c);
    }

    public void deleteCard(Long userId, Long id) {
        SavedCard c = cardRepo.findById(id).filter(x -> x.getUserId().equals(userId)).orElseThrow(() -> ApiException.notFound("Card"));
        cardRepo.delete(c);
    }

    private SavedCardDto card(SavedCard c) { return new SavedCardDto(c.getId(), c.getMaskedNumber(), c.getHolderName(), c.getBrand(), c.getExpiry()); }

    /** Wallet balance plus derived transaction history (refunds of cancelled bookings). */
    @Transactional(readOnly = true)
    public WalletDto wallet(Long userId) {
        User u = user(userId);
        List<WalletTxn> txns = new ArrayList<>();
        bookingRepo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(b -> b.getPaymentStatus() == PaymentStatus.REFUNDED)
                .forEach(b -> txns.add(new WalletTxn("Refund for " + b.getBookingRef(), b.getGrandTotal(), b.getCreatedAt().toString())));
        return new WalletDto(Mapper.round(u.getWalletBalance()), txns);
    }

    public List<TicketDto> tickets(Long userId) {
        return ticketRepo.findByUserIdOrderByCreatedAtDesc(userId).stream().map(ProfileService::ticket).toList();
    }

    public TicketDto createTicket(Long userId, TicketRequest r) {
        return ticket(ticketRepo.save(SupportTicket.builder().userId(userId).subject(r.subject()).description(r.description()).status(TicketStatus.OPEN).build()));
    }

    static TicketDto ticket(SupportTicket t) {
        return new TicketDto(t.getId(), t.getSubject(), t.getDescription(), t.getStatus(), t.getCreatedAt().toString());
    }

    public static final List<Faq> FAQS = List.of(
            new Faq("How do I cancel my ticket?", "Go to My Bookings, open the trip and tap Cancel. Refunds are credited to your Destiny wallet instantly."),
            new Faq("How long are seats held?", "Selected seats are held for 10 minutes while you complete payment."),
            new Faq("Can I reschedule my journey?", "Yes, confirmed bookings can be moved to another trip from the booking details page."),
            new Faq("What are ladies seats?", "Seats marked pink are reserved for female passengers only."),
            new Faq("How do I track my bus?", "Open an upcoming booking and tap Track Bus to see live location and ETA."),
            new Faq("Which payment methods are supported?", "UPI, Google Pay, PhonePe, Paytm, cards, net banking, wallet, LazyPay and EMI."),
            new Faq("How do coupons work?", "Apply a coupon code at checkout. Cashback coupons are credited to your wallet after payment.")
    );
}
