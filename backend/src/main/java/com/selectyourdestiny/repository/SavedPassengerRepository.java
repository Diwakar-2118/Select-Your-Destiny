package com.selectyourdestiny.repository;

import com.selectyourdestiny.entity.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.*;
import java.util.*;

/** Spring Data repository for {@link SavedPassenger}. */
public interface SavedPassengerRepository extends JpaRepository<SavedPassenger, Long> {
    List<SavedPassenger> findByUserId(Long userId);
}
