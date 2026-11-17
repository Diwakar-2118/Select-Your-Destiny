package com.selectyourdestiny.security;

import com.selectyourdestiny.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Helper to read the authenticated user's id from the security context. */
public final class CurrentUser {
    private CurrentUser() {}

    public static Long id() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !(a.getPrincipal() instanceof Long id)) throw ApiException.unauthorized("Login required");
        return id;
    }
}
