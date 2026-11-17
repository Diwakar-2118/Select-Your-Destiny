package com.selectyourdestiny.service;

import com.selectyourdestiny.entity.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates default seat templates per contract numbering rules:
 * seater/push-back = D1..Dn in 2+2 (window cols 0 and 3);
 * sleeper = LS1.. lower / US1.. upper in 2+1 (window cols 0 and 2).
 */
public final class SeatTemplateGenerator {
    private SeatTemplateGenerator() {}

    public static boolean isSleeper(BusType t) {
        return t == BusType.AC_SLEEPER || t == BusType.NON_AC_SLEEPER;
    }

    /** Builds seats and sets layout fields (rows/cols/deck/totalSeats) on the bus. */
    public static List<Seat> generate(Bus bus) {
        List<Seat> seats = new ArrayList<>();
        if (isSleeper(bus.getBusType())) {
            int rows = 6;
            int n = 1;
            for (int r = 0; r < rows; r++) for (int c = 0; c < 3; c++, n++)
                seats.add(seat(bus, "LS" + n, SeatKind.LOWER_SLEEPER, Deck.LOWER, r, c, c == 0 || c == 2, 150));
            n = 1;
            for (int r = 0; r < rows; r++) for (int c = 0; c < 3; c++, n++)
                seats.add(seat(bus, "US" + n, SeatKind.UPPER_SLEEPER, Deck.UPPER, r, c, c == 0 || c == 2, 0));
            bus.setLayoutRows(rows);
            bus.setLayoutCols(3);
            bus.setHasUpperDeck(true);
        } else {
            int rows = 10;
            int n = 1;
            for (int r = 0; r < rows; r++) for (int c = 0; c < 4; c++, n++)
                seats.add(seat(bus, "D" + n, SeatKind.PUSH_BACK, Deck.LOWER, r, c, c == 0 || c == 3, r < 2 ? 50 : 0));
            bus.setLayoutRows(rows);
            bus.setLayoutCols(4);
            bus.setHasUpperDeck(false);
        }
        bus.setTotalSeats(seats.size());
        return seats;
    }

    private static Seat seat(Bus bus, String num, SeatKind kind, Deck deck, int r, int c, boolean window, double extra) {
        return Seat.builder().bus(bus).seatNumber(num).kind(kind).deck(deck).rowNum(r).colNum(c).windowSeat(window).extraFare(extra).build();
    }
}
