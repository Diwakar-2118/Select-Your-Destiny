package com.selectyourdestiny.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** Dev implementation of {@link PushSender} (stands in for Firebase FCM) that just logs. */
@Slf4j
@Component
public class LogPushSender implements PushSender {
    @Override
    public void send(Long userId, String title, String body) {
        log.info("[FCM-dev] push to user {}: {} - {}", userId, title, body);
    }
}
