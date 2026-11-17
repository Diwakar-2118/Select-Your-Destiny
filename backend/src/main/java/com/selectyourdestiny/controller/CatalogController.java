package com.selectyourdestiny.controller;

import com.selectyourdestiny.dto.ApiResponse;
import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.Coupon;
import com.selectyourdestiny.service.CatalogService;
import com.selectyourdestiny.service.FareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Public catalog: cities, popular routes, trip search & seat layout, offers, coupon validation. */
@RestController
@RequiredArgsConstructor
public class CatalogController {
    private final CatalogService catalog;
    private final FareService fareService;

    @GetMapping("/health")
    public ApiResponse<Map<String, String>> health() { return ApiResponse.ok(Map.of("status", "UP")); }

    @GetMapping("/cities")
    public ApiResponse<List<CityDto>> cities() { return ApiResponse.ok(catalog.cities()); }

    @GetMapping("/routes/popular")
    public ApiResponse<List<PopularRoute>> popular() { return ApiResponse.ok(catalog.popularRoutes()); }

    @GetMapping("/trips/search")
    public ApiResponse<List<TripDto>> search(@RequestParam String from, @RequestParam String to, @RequestParam(required = false) String date,
                                             @RequestParam(required = false) String busType, @RequestParam(required = false) Boolean ac,
                                             @RequestParam(required = false) Boolean sleeper, @RequestParam(required = false) String departure,
                                             @RequestParam(required = false) String operator, @RequestParam(required = false) String amenities,
                                             @RequestParam(required = false) String sort) {
        return ApiResponse.ok(catalog.search(from, to, date, busType, ac, sleeper, departure, operator, amenities, sort));
    }

    @GetMapping("/trips/{id}")
    public ApiResponse<TripDto> trip(@PathVariable Long id) { return ApiResponse.ok(catalog.trip(id)); }

    @GetMapping("/trips/{id}/seats")
    public ApiResponse<SeatLayout> seats(@PathVariable Long id) {
        Object p = SecurityContextHolder.getContext().getAuthentication() == null ? null : SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ApiResponse.ok(catalog.seatLayout(id, p instanceof Long uid ? uid : null));
    }

    @GetMapping("/offers")
    public ApiResponse<List<Coupon>> offers() { return ApiResponse.ok(catalog.offers()); }

    @PostMapping("/coupons/validate")
    public ApiResponse<CouponValidateResponse> validate(@Valid @RequestBody CouponValidateRequest r) {
        CouponValidateResponse v = fareService.validate(r.code(), r.amount());
        return ApiResponse.ok(v, v.message());
    }
}
