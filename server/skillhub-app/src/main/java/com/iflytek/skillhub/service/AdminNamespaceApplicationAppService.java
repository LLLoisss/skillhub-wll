package com.iflytek.skillhub.service;

import com.iflytek.skillhub.domain.namespace.NamespaceApplication;
import com.iflytek.skillhub.domain.namespace.NamespaceApplicationService;
import com.iflytek.skillhub.domain.namespace.NamespaceApplicationStatus;
import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.domain.user.UserAccount;
import com.iflytek.skillhub.domain.user.UserAccountRepository;
import com.iflytek.skillhub.dto.NamespaceApplicationResponse;
import com.iflytek.skillhub.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Application service bridging the admin controller and domain layer
 * for namespace application reviews.
 */
@Service
public class AdminNamespaceApplicationAppService {

    private final NamespaceApplicationService applicationService;
    private final UserAccountRepository userAccountRepository;

    public AdminNamespaceApplicationAppService(NamespaceApplicationService applicationService,
                                               UserAccountRepository userAccountRepository) {
        this.applicationService = applicationService;
        this.userAccountRepository = userAccountRepository;
    }

    /** List namespace applications by status with user info resolution. */
    @Transactional(readOnly = true)
    public PageResponse<NamespaceApplicationResponse> list(String status, int page, int size,
                                                           String sortDirection) {
        var resolvedStatus = parseStatus(status);
        Page<NamespaceApplication> applicationPage = applicationService.listByStatus(
                resolvedStatus,
                PageRequest.of(page, size),
                sortDirection
        );
        var items = toResponses(applicationPage.getContent());
        return new PageResponse<>(items, applicationPage.getTotalElements(),
                applicationPage.getNumber(), applicationPage.getSize());
    }

    /** Approve a PENDING namespace application. */
    @Transactional
    public NamespaceApplicationResponse approve(Long id, String reviewerId) {
        NamespaceApplication application = applicationService.approve(id, reviewerId);
        return toSingleResponse(application);
    }

    /** Reject a PENDING namespace application with a mandatory comment. */
    @Transactional
    public NamespaceApplicationResponse reject(Long id, String reviewerId, String comment) {
        NamespaceApplication application = applicationService.reject(id, reviewerId, comment);
        return toSingleResponse(application);
    }

    // -------------------------------------------------------------------------

    private NamespaceApplicationStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return NamespaceApplicationStatus.PENDING;
        }
        try {
            return NamespaceApplicationStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new DomainBadRequestException("error.namespaceApplication.status.invalid", status);
        }
    }

    private List<NamespaceApplicationResponse> toResponses(List<NamespaceApplication> applications) {
        if (applications.isEmpty()) {
            return List.of();
        }
        var allUserIds = applications.stream()
                .flatMap(a -> Stream.of(a.getApplicantId(), a.getReviewerId()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<String, UserAccount> usersById = userAccountRepository.findByIdIn(allUserIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, Function.identity()));

        return applications.stream()
                .map(a -> NamespaceApplicationResponse.from(
                        a,
                        displayName(usersById, a.getApplicantId()),
                        displayName(usersById, a.getReviewerId())))
                .toList();
    }

    private NamespaceApplicationResponse toSingleResponse(NamespaceApplication application) {
        var ids = Stream.of(application.getApplicantId(), application.getReviewerId())
                .filter(Objects::nonNull).distinct().toList();
        Map<String, UserAccount> usersById = userAccountRepository.findByIdIn(ids).stream()
                .collect(Collectors.toMap(UserAccount::getId, Function.identity()));
        return NamespaceApplicationResponse.from(
                application,
                displayName(usersById, application.getApplicantId()),
                displayName(usersById, application.getReviewerId()));
    }

    private String displayName(Map<String, UserAccount> usersById, String userId) {
        if (userId == null) return null;
        UserAccount user = usersById.get(userId);
        return user != null ? user.getDisplayName() : userId;
    }
}
