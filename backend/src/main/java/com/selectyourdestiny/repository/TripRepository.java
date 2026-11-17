package com.selectyourdestiny.repository;

import com.selectyourdestiny.entity.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.*;
import java.util.*;

/** Spring Data repository for {@link Trip}. */
public interface TripRepository extends JpaRepository<Trip, Long> {
    List<Trip> findByRouteFromCityIdAndRouteToCityIdAndJourneyDate(Long fromId, Long toId, LocalDate date);
    List<Trip> findByBusIdAndJourneyDate(Long busId, LocalDate date);
}
