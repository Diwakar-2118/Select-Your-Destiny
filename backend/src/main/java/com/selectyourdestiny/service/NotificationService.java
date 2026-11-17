package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.NotificationDto;
import com.selectyourdestiny.entity.Notification;
import com.selectyourdestiny.entity.NotificationType;
import com.selectyourdestiny.exception.ApiException;
import com.selectyourdestiny.notification.PushSender;
import com.selectyourdestiny.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Stores in-app notifications and forwards them to the push channel. */
@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository repo;
    private final PushSender pushSender;
    private final Mapper mapper;

    public Notification notify(Long userId, NotificationType type, String title, String body) {
        Notification n = repo.save(Notification.builder().userId(userId).type(type).title(title).body(body).build());
        pushSender.send(userId, title, body);
        return n;
    }

    public List<NotificationDto> list(Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId).stream().map(mapper::notification).toList();
    }

    @Transactional
    public NotificationDto markRead(Long userId, Long id) {
        Notification n = repo.findById(id).filter(x -> x.getUserId().equals(userId)).orElseThrow(() -> ApiException.notFound("Notification"));
        n.setRead(true);
        return mapper.notification(n);
    }
}
