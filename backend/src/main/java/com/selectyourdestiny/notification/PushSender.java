package com.selectyourdestiny.notification;

/**
 * Push notification transport. Production integration point for Firebase Cloud Messaging
 * (implement with firebase-admin {@code FirebaseMessaging.getInstance().send(...)}).
 */
public interface PushSender {
    void send(Long userId, String title, String body);
}
