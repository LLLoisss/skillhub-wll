package com.iflytek.skillhub.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.domain.audit.AuditLogService;
import com.iflytek.skillhub.ratelimit.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AuthAuditService {

    public static final String LOGIN_SUCCESS = "LOGIN_SUCCESS";
    public static final String LOGIN_FAILURE = "LOGIN_FAILURE";

    private static final Logger logger = LoggerFactory.getLogger(AuthAuditService.class);
    private static final String TARGET_TYPE_AUTH = "AUTH";
    private static final int USER_AGENT_MAX_LENGTH = 512;

    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final ClientIpResolver clientIpResolver;

    public AuthAuditService(AuditLogService auditLogService, ObjectMapper objectMapper, ClientIpResolver clientIpResolver) {
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.clientIpResolver = clientIpResolver;
    }

    public void recordLoginSuccess(PlatformPrincipal principal,
                                   String method,
                                   String provider,
                                   HttpServletRequest request,
                                   Map<String, ?> extraDetails) {
        Map<String, Object> details = baseDetails(method, provider, "SUCCESS");
        mergeDetails(details, extraDetails);
        record(principal == null ? null : principal.userId(), LOGIN_SUCCESS, request, details);
    }

    public void recordLoginFailure(String method,
                                   String provider,
                                   String attemptedIdentifier,
                                   String reason,
                                   HttpServletRequest request,
                                   Map<String, ?> extraDetails) {
        Map<String, Object> details = baseDetails(method, provider, "FAILURE");
        if (StringUtils.hasText(reason)) {
            details.put("reason", reason);
        }
        if (StringUtils.hasText(attemptedIdentifier)) {
            details.put("attemptedIdentifier", attemptedIdentifier.trim());
        }
        mergeDetails(details, extraDetails);
        record(null, LOGIN_FAILURE, request, details);
    }

    private void record(String actorUserId,
                        String action,
                        HttpServletRequest request,
                        Map<String, Object> details) {
        try {
            auditLogService.record(
                    actorUserId,
                    action,
                    TARGET_TYPE_AUTH,
                    null,
                    resolveRequestId(request),
                    request == null ? null : clientIpResolver.resolve(request),
                    truncate(resolveUserAgent(request), USER_AGENT_MAX_LENGTH),
                    toJson(details));
        } catch (RuntimeException ex) {
            logger.warn("Failed to record auth audit event [action={}, requestId={}]", action, resolveRequestId(request), ex);
        }
    }

    private Map<String, Object> baseDetails(String method, String provider, String result) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("method", method);
        if (StringUtils.hasText(provider)) {
            details.put("provider", provider);
        }
        details.put("result", result);
        return details;
    }

    private void mergeDetails(Map<String, Object> details, Map<String, ?> extraDetails) {
        if (extraDetails == null || extraDetails.isEmpty()) {
            return;
        }
        extraDetails.forEach((key, value) -> {
            if (StringUtils.hasText(key) && value != null) {
                details.put(key, value);
            }
        });
    }

    private String toJson(Map<String, Object> details) {
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize auth audit details", ex);
        }
    }

    private String resolveRequestId(HttpServletRequest request) {
        String requestId = MDC.get("requestId");
        if (!StringUtils.hasText(requestId) && request != null) {
            requestId = request.getHeader("X-Request-Id");
        }
        return StringUtils.hasText(requestId) ? requestId.trim() : null;
    }

    private String resolveUserAgent(HttpServletRequest request) {
        return request == null ? null : request.getHeader("User-Agent");
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
