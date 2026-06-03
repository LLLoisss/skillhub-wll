package com.iflytek.skillhub.dto;

import jakarta.validation.constraints.Size;

/**
 * Optional comment provided by the admin when approving a namespace application.
 *
 * @param comment optional approval note (max 500 chars)
 */
public record NamespaceApplicationApproveRequest(
        @Size(max = 500, message = "error.namespaceApplication.commentTooLong")
        String comment
) {}
