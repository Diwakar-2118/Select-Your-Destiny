package com.selectyourdestiny.repository;

import com.selectyourdestiny.entity.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.*;
import java.util.*;

/** Spring Data repository for {@link Driver}. */
public interface DriverRepository extends JpaRepository<Driver, Long> {
    Optional<Driver> findFirstByBusId(Long busId);
}
