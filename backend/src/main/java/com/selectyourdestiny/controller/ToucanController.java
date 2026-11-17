package com.selectyourdestiny.controller;

import com.selectyourdestiny.dto.ApiResponse;
import com.selectyourdestiny.entity.Payment;
import com.selectyourdestiny.entity.PaymentStatus;
import com.selectyourdestiny.payment.ToucanClient;
import com.selectyourdestiny.security.CurrentUser;
import com.selectyourdestiny.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

/**
 * Toucan PSP endpoints.
 * <ul>
 *   <li>{@code POST /api/payments/toucan/callback} — server-to-server callback from Toucan (public, unsigned,
 *       therefore re-verified with Check Status before anything is confirmed). Answers {@code {"success":true}}.</li>
 *   <li>{@code GET|POST /api/payments/toucan/return?order=} — where Toucan sends the customer's browser back;
 *       verifies and redirects to the web app's success or checkout page.</li>
 *   <li>{@code GET /api/payments/toucan/status/{orderNo}} — authenticated polling for the web/mobile app.</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/payments/toucan")
@RequiredArgsConstructor
public class ToucanController {
    private final PaymentService paymentService;
    private final ToucanClient toucan;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @PostMapping("/callback")
    public Map<String, Object> callback(@RequestBody Map<String, Object> body) {
        String orderNo = toucan.orderNoFromCallback(str(body.get("pspRefNo")), str(body.get("custRefNo")));
        log.info("Toucan callback order={} status={} respCode={}", orderNo, body.get("status"), body.get("payeeRespCode"));
        try {
            if (orderNo != null) paymentService.confirmToucan(orderNo);
        } catch (Exception e) {
            log.warn("Toucan callback processing failed for order {}: {}", orderNo, e.getMessage());
        }
        return Map.of("success", true); // acknowledge receipt as per spec
    }

    @RequestMapping(value = "/return", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Void> customerReturn(@RequestParam(value = "order", required = false) String orderNo,
                                               @RequestParam(value = "pspRefNo", required = false) String pspRefNo,
                                               @RequestParam(value = "custRefNo", required = false) String custRefNo) {
        String order = orderNo != null ? orderNo : toucan.orderNoFromCallback(pspRefNo, custRefNo);
        String target;
        try {
            Payment p = paymentService.confirmToucan(order);
            target = switch (p.getStatus()) {
                // The web return page re-reads the status and loads the confirmed booking itself
                case SUCCESS, PENDING -> frontendUrl + "/payment/return?order=" + order;
                default -> frontendUrl + "/checkout?payment=failed&order=" + order;
            };
        } catch (Exception e) {
            log.warn("Toucan return failed for order {}: {}", order, e.getMessage());
            target = frontendUrl + "/checkout?payment=failed&order=" + order;
        }
        return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, URI.create(target).toString()).build();
    }

    @GetMapping("/status/{orderNo}")
    public ApiResponse<Map<String, Object>> status(@PathVariable String orderNo) {
        Payment p = paymentService.owned(CurrentUser.id(), orderNo);
        if (p.getStatus() == PaymentStatus.PENDING) p = paymentService.confirmToucan(orderNo);
        return ApiResponse.ok(Map.of("orderNo", orderNo, "status", p.getStatus().name(),
                "bookingId", p.getBooking().getId()), "OK");
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }
}
