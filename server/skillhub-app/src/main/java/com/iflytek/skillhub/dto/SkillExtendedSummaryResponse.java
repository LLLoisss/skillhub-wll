package com.iflytek.skillhub.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record SkillExtendedSummaryResponse(
        Long id,
        String slug,
        String displayName,
        String summary,
        String status,
        Long downloadCount,
        Integer starCount,
        BigDecimal ratingAvg,
        Integer ratingCount,
        String namespace,
        Instant updatedAt,
        boolean canSubmitPromotion,
        SkillLifecycleVersionResponse headlineVersion,
        SkillLifecycleVersionResponse publishedVersion,
        SkillLifecycleVersionResponse ownerPreviewVersion,
        String resolutionMode,
        boolean star,
        List<SkillLabelDto> labels
) {
    public static SkillExtendedSummaryResponse from(SkillSummaryResponse summary,
                                                    boolean star,
                                                    List<SkillLabelDto> labels) {
        return new SkillExtendedSummaryResponse(
                summary.id(),
                summary.slug(),
                summary.displayName(),
                summary.summary(),
                summary.status(),
                summary.downloadCount(),
                summary.starCount(),
                summary.ratingAvg(),
                summary.ratingCount(),
                summary.namespace(),
                summary.updatedAt(),
                summary.canSubmitPromotion(),
                summary.headlineVersion(),
                summary.publishedVersion(),
                summary.ownerPreviewVersion(),
                summary.resolutionMode(),
                star,
                labels != null ? labels : List.of()
        );
    }
}
