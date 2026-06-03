package com.iflytek.skillhub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Rejection comment provided by the admin when rejecting a namespace application.
 *
 * @param comment rejection reason (required, 1–500 chars)
 */
public record NamespaceApplicationRejectRequest(
        @NotBlank(message = "error.namespaceApplication.commentRequired")
        @Size(max = 500, message = "error.namespaceApplication.commentTooLong")
        String comment
) {}
