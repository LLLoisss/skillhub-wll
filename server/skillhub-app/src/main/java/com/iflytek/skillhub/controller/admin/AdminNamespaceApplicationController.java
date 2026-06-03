package com.iflytek.skillhub.controller.admin;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.controller.BaseApiController;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.dto.NamespaceApplicationApproveRequest;
import com.iflytek.skillhub.dto.NamespaceApplicationRejectRequest;
import com.iflytek.skillhub.dto.NamespaceApplicationResponse;
import com.iflytek.skillhub.dto.PageResponse;
import com.iflytek.skillhub.service.AdminNamespaceApplicationAppService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Admin REST controller for reviewing namespace creation applications.
 *
 * <p>All endpoints require SKILL_ADMIN or SUPER_ADMIN role.
 */
@RestController
@RequestMapping("/api/v1/admin/namespace-applications")
public class AdminNamespaceApplicationController extends BaseApiController {

    private final AdminNamespaceApplicationAppService appService;

    public AdminNamespaceApplicationController(ApiResponseFactory responseFactory,
                                               AdminNamespaceApplicationAppService appService) {
        super(responseFactory);
        this.appService = appService;
    }

    /** List namespace applications filtered by status (default: PENDING). */
    @GetMapping
    @PreAuthorize("hasAnyRole('SKILL_ADMIN', 'SUPER_ADMIN')")
    public ApiResponse<PageResponse<NamespaceApplicationResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        return ok("response.success", appService.list(status, page, size, sortDirection));
    }

    /** Approve a PENDING namespace application and create the namespace. */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SKILL_ADMIN', 'SUPER_ADMIN')")
    public ApiResponse<NamespaceApplicationResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) @Valid NamespaceApplicationApproveRequest request,
            @AuthenticationPrincipal PlatformPrincipal principal) {
        return ok("response.success.updated", appService.approve(id, principal.userId()));
    }

    /** Reject a PENDING namespace application with a mandatory comment. */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SKILL_ADMIN', 'SUPER_ADMIN')")
    public ApiResponse<NamespaceApplicationResponse> reject(
            @PathVariable Long id,
            @Valid @RequestBody NamespaceApplicationRejectRequest request,
            @AuthenticationPrincipal PlatformPrincipal principal) {
        return ok("response.success.updated", appService.reject(id, principal.userId(), request.comment()));
    }
}
