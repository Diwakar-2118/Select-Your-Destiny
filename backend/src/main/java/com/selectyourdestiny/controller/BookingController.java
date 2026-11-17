package com.selectyourdestiny.controller;

import com.selectyourdestiny.dto.ApiResponse;
import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.Booking;
import com.selectyourdestiny.security.CurrentUser;
import com.selectyourdestiny.service.BookingService;
import com.selectyourdestiny.service.SeatLockService;
import com.selectyourdestiny.service.TicketPdfService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Seat holds, bookings, ticket PDF, sharing and live tracking (authenticated users). */
@RestController
@RequiredArgsConstructor
public class BookingController {
    private final SeatLockService seatLockService;
    private final BookingService bookingService;
    private final TicketPdfService pdfService;

    @PostMapping("/seats/lock")
    public ApiResponse<SeatLockResponse> lock(@Valid @RequestBody SeatLockRequest r) {
        return ApiResponse.ok(seatLockService.lock(CurrentUser.id(), r.tripId(), r.seatNumbers()), "Seats held for 10 minutes");
    }

    @PostMapping("/seats/release")
    public ApiResponse<Void> release(@Valid @RequestBody SeatLockRequest r) {
        seatLockService.release(CurrentUser.id(), r.tripId(), r.seatNumbers());
        return ApiResponse.ok(null, "Seats released");
    }

    @PostMapping("/bookings/quote")
    public ApiResponse<FareBreakdown> quote(@RequestBody BookingRequest r) { return ApiResponse.ok(bookingService.quote(r)); }

    @PostMapping("/bookings")
    public ApiResponse<BookingDto> create(@Valid @RequestBody BookingRequest r) {
        return ApiResponse.ok(bookingService.create(CurrentUser.id(), r), "Booking created, complete payment to confirm");
    }

    @GetMapping("/bookings")
    public ApiResponse<List<BookingDto>> list(@RequestParam(required = false) String status) {
        return ApiResponse.ok(bookingService.list(CurrentUser.id(), status));
    }

    @GetMapping("/bookings/{id}")
    public ApiResponse<BookingDto> get(@PathVariable Long id) { return ApiResponse.ok(bookingService.get(CurrentUser.id(), id)); }

    @PostMapping("/bookings/{id}/cancel")
    public ApiResponse<BookingDto> cancel(@PathVariable Long id) { return ApiResponse.ok(bookingService.cancel(CurrentUser.id(), id), "Booking cancelled, refund credited to wallet"); }

    @PostMapping("/bookings/{id}/reschedule")
    public ApiResponse<BookingDto> reschedule(@PathVariable Long id, @Valid @RequestBody RescheduleRequest r) {
        return ApiResponse.ok(bookingService.reschedule(CurrentUser.id(), id, r), "Booking rescheduled");
    }

    @GetMapping(value = "/bookings/{id}/ticket.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> ticket(@PathVariable Long id) {
        Booking b = bookingService.owned(CurrentUser.id(), id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + b.getBookingRef() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfService.render(b));
    }

    @PostMapping("/bookings/{id}/share")
    public ApiResponse<SentResponse> share(@PathVariable Long id, @RequestBody(required = false) ShareRequest r) {
        return ApiResponse.ok(bookingService.share(CurrentUser.id(), id, r == null ? null : r.channel()), "Ticket shared");
    }

    @GetMapping("/bookings/{id}/tracking")
    public ApiResponse<TrackingInfo> tracking(@PathVariable Long id) { return ApiResponse.ok(bookingService.tracking(CurrentUser.id(), id)); }
}
