package com.selectyourdestiny.repository;

import com.selectyourdestiny.entity.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.*;
import java.util.*;

/** Spring Data repository for {@link City}. */
public interface CityRepository extends JpaRepository<City, Long> {
    Optional<City> findFirstByNameIgnoreCase(String name);
}
