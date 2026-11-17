package com.selectyourdestiny.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.selectyourdestiny.entity.Booking;
import com.selectyourdestiny.entity.Passenger;
import com.selectyourdestiny.entity.Trip;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;

/** Renders an e-ticket PDF (OpenPDF) with booking ref, PNR, journey and passenger details. */
@Service
public class TicketPdfService {
    private static final Color PRIMARY = new Color(0x25, 0x63, 0xEB);

    public byte[] render(Booking b) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 36, 36, 36, 36);
        PdfWriter.getInstance(doc, out);
        doc.open();
        Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, PRIMARY);
        Font h = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        Font n = FontFactory.getFont(FontFactory.HELVETICA, 11);
        Trip t = b.getTrip();

        doc.add(new Paragraph("Select Your Destiny", title));
        doc.add(new Paragraph("Book Smart. Travel Comfortably.", n));
        doc.add(new Paragraph(" "));
        doc.add(new Paragraph("E-TICKET  |  Booking Ref: " + b.getBookingRef() + "   PNR: " + b.getPnr(), h));
        doc.add(new Paragraph("Status: " + b.getStatus() + "   Payment: " + b.getPaymentStatus(), n));
        doc.add(new Paragraph(" "));

        PdfPTable info = new PdfPTable(2);
        info.setWidthPercentage(100);
        row(info, "Route", t.getRoute().getFromCity().getName() + " -> " + t.getRoute().getToCity().getName(), h, n);
        row(info, "Journey date", t.getJourneyDate().toString(), h, n);
        row(info, "Departure / Arrival", t.getDepartureTime().format(Mapper.HHMM) + " / " + t.getArrivalTime().format(Mapper.HHMM), h, n);
        row(info, "Bus", t.getBus().getName() + " (" + t.getBus().getBusNumber() + ") - " + t.getBus().getBusType(), h, n);
        row(info, "Operator", t.getBus().getOperator().getName(), h, n);
        if (b.getBoardingPoint() != null) row(info, "Boarding", b.getBoardingPoint().getName() + ", " + b.getBoardingPoint().getAddress(), h, n);
        if (b.getDroppingPoint() != null) row(info, "Dropping", b.getDroppingPoint().getName() + ", " + b.getDroppingPoint().getAddress(), h, n);
        row(info, "Seats", b.getSeatNumbers(), h, n);
        row(info, "Contact", b.getContactMobile() + " / " + b.getContactEmail(), h, n);
        doc.add(info);
        doc.add(new Paragraph(" "));

        doc.add(new Paragraph("Passengers", h));
        PdfPTable pax = new PdfPTable(4);
        pax.setWidthPercentage(100);
        for (String c : new String[]{"Name", "Age", "Gender", "Seat"}) pax.addCell(new PdfPCell(new Phrase(c, h)));
        for (Passenger p : b.getPassengers()) {
            pax.addCell(new Phrase(p.getName(), n));
            pax.addCell(new Phrase(String.valueOf(p.getAge()), n));
            pax.addCell(new Phrase(String.valueOf(p.getGender()), n));
            pax.addCell(new Phrase(p.getSeatNumber(), n));
        }
        doc.add(pax);
        doc.add(new Paragraph(" "));

        doc.add(new Paragraph("Fare", h));
        PdfPTable fare = new PdfPTable(2);
        fare.setWidthPercentage(60);
        fare.setHorizontalAlignment(Element.ALIGN_LEFT);
        row(fare, "Base fare", money(b.getBaseFare()), n, n);
        row(fare, "GST (5%)", money(b.getGst()), n, n);
        row(fare, "Platform fee", money(b.getPlatformFee()), n, n);
        row(fare, "Convenience fee", money(b.getConvenienceFee()), n, n);
        row(fare, "Discount", "-" + money(b.getDiscount()), n, n);
        row(fare, "Coupon discount", "-" + money(b.getCouponDiscount()), n, n);
        row(fare, "Grand total", money(b.getGrandTotal()), h, h);
        doc.add(fare);
        doc.add(new Paragraph(" "));
        doc.add(new Paragraph("Please carry a valid photo ID. Reach the boarding point 15 minutes before departure.", n));
        doc.close();
        return out.toByteArray();
    }

    private static void row(PdfPTable t, String k, String v, Font kf, Font vf) {
        t.addCell(new PdfPCell(new Phrase(k, kf)));
        t.addCell(new PdfPCell(new Phrase(v == null ? "" : v, vf)));
    }

    private static String money(double v) { return String.format("INR %.2f", v); }
}
