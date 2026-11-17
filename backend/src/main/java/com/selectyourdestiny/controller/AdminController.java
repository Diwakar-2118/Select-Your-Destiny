package com.selectyourdestiny.controller;

import com.selectyourdestiny.dto.ApiResponse;
import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.Coupon;
import com.selectyourdestiny.entity.Operator;
import com.selectyourdestiny.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Admin panel API (ROLE_ADMIN): CRUD, seat templates, bookings, payments, dashboard and reports. */
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {
    private final AdminService admin;

    // operators
    @GetMapping("/operators") public ApiResponse<List<Operator>> operators() { return ApiResponse.ok(admin.operators()); }
    @PostMapping("/operators") public ApiResponse<Operator> createOperator(@RequestBody Operator o) { return ApiResponse.ok(admin.saveOperator(null, o), "Created"); }
    @PutMapping("/operators/{id}") public ApiResponse<Operator> updateOperator(@PathVariable Long id, @RequestBody Operator o) { return ApiResponse.ok(admin.saveOperator(id, o), "Updated"); }
    @DeleteMapping("/operators/{id}") public ApiResponse<Void> deleteOperator(@PathVariable Long id) { admin.deleteOperator(id); return ApiResponse.ok(null, "Deleted"); }

    // routes
    @GetMapping("/routes") public ApiResponse<List<RouteDto>> routes() { return ApiResponse.ok(admin.routes()); }
    @PostMapping("/routes") public ApiResponse<RouteDto> createRoute(@RequestBody RouteDto d) { return ApiResponse.ok(admin.saveRoute(null, d), "Created"); }
    @PutMapping("/routes/{id}") public ApiResponse<RouteDto> updateRoute(@PathVariable Long id, @RequestBody RouteDto d) { return ApiResponse.ok(admin.saveRoute(id, d), "Updated"); }
    @DeleteMapping("/routes/{id}") public ApiResponse<Void> deleteRoute(@PathVariable Long id) { admin.deleteRoute(id); return ApiResponse.ok(null, "Deleted"); }

    // buses
    @GetMapping("/buses") public ApiResponse<List<BusDto>> buses() { return ApiResponse.ok(admin.buses()); }
    @PostMapping("/buses") public ApiResponse<BusDto> createBus(@RequestBody BusDto d) { return ApiResponse.ok(admin.saveBus(null, d), "Created"); }
    @PutMapping("/buses/{id}") public ApiResponse<BusDto> updateBus(@PathVariable Long id, @RequestBody BusDto d) { return ApiResponse.ok(admin.saveBus(id, d), "Updated"); }
    @DeleteMapping("/buses/{id}") public ApiResponse<Void> deleteBus(@PathVariable Long id) { admin.deleteBus(id); return ApiResponse.ok(null, "Deactivated"); }
    @GetMapping("/buses/{id}/seats") public ApiResponse<List<SeatTemplateDto>> busSeats(@PathVariable Long id) { return ApiResponse.ok(admin.busSeats(id)); }
    @PutMapping("/buses/{id}/seats") public ApiResponse<List<SeatTemplateDto>> updateSeats(@PathVariable Long id, @RequestBody List<SeatTemplateDto> seats) { return ApiResponse.ok(admin.updateBusSeats(id, seats), "Seat layout saved"); }

    // drivers
    @GetMapping("/drivers") public ApiResponse<List<DriverDto>> drivers() { return ApiResponse.ok(admin.drivers()); }
    @PostMapping("/drivers") public ApiResponse<DriverDto> createDriver(@RequestBody DriverDto d) { return ApiResponse.ok(admin.saveDriver(null, d), "Created"); }
    @PutMapping("/drivers/{id}") public ApiResponse<DriverDto> updateDriver(@PathVariable Long id, @RequestBody DriverDto d) { return ApiResponse.ok(admin.saveDriver(id, d), "Updated"); }
    @DeleteMapping("/drivers/{id}") public ApiResponse<Void> deleteDriver(@PathVariable Long id) { admin.deleteDriver(id); return ApiResponse.ok(null, "Deleted"); }

    // coupons
    @GetMapping("/coupons") public ApiResponse<List<Coupon>> coupons() { return ApiResponse.ok(admin.coupons()); }
    @PostMapping("/coupons") public ApiResponse<Coupon> createCoupon(@RequestBody Coupon c) { return ApiResponse.ok(admin.saveCoupon(null, c), "Created"); }
    @PutMapping("/coupons/{id}") public ApiResponse<Coupon> updateCoupon(@PathVariable Long id, @RequestBody Coupon c) { return ApiResponse.ok(admin.saveCoupon(id, c), "Updated"); }
    @DeleteMapping("/coupons/{id}") public ApiResponse<Void> deleteCoupon(@PathVariable Long id) { admin.deleteCoupon(id); return ApiResponse.ok(null, "Deleted"); }

    // bookings & payments
    @GetMapping("/bookings") public ApiResponse<List<BookingDto>> bookings() { return ApiResponse.ok(admin.bookings()); }
    @GetMapping("/payments") public ApiResponse<List<PaymentDto>> payments() { return ApiResponse.ok(admin.payments()); }

    // analytics
    @GetMapping("/dashboard") public ApiResponse<Dashboard> dashboard() { return ApiResponse.ok(admin.dashboard(null, null)); }

    @GetMapping("/reports")
    public ApiResponse<Dashboard> reports(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(admin.dashboard(from, to));
    }
}
