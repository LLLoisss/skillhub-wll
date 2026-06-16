package com.iflytek.skillhub.service;

import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.domain.social.SkillStar;
import com.iflytek.skillhub.domain.social.SkillStarRepository;
import com.iflytek.skillhub.dto.SkillExtendedSummaryResponse;
import com.iflytek.skillhub.dto.SkillLabelDto;
import com.iflytek.skillhub.dto.SkillSummaryResponse;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class SkillExtendedSearchAppService {

    private final SkillSearchAppService skillSearchAppService;
    private final SkillStarRepository skillStarRepository;
    private final SkillLabelAppService skillLabelAppService;

    public SkillExtendedSearchAppService(SkillSearchAppService skillSearchAppService,
                                         SkillStarRepository skillStarRepository,
                                         SkillLabelAppService skillLabelAppService) {
        this.skillSearchAppService = skillSearchAppService;
        this.skillStarRepository = skillStarRepository;
        this.skillLabelAppService = skillLabelAppService;
    }

    public record ExtendedSearchResponse(
            List<SkillExtendedSummaryResponse> items,
            long total,
            int page,
            int size
    ) {}

    public ExtendedSearchResponse search(
            String keyword,
            String namespaceSlug,
            String sortBy,
            int page,
            int size,
            List<String> labelSlugs,
            String userId,
            Map<Long, NamespaceRole> userNsRoles) {

        SkillSearchAppService.SearchResponse baseResponse = skillSearchAppService.search(
                keyword,
                namespaceSlug,
                sortBy,
                page,
                size,
                labelSlugs,
                userId,
                userNsRoles
        );

        List<Long> skillIds = baseResponse.items().stream()
                .map(SkillSummaryResponse::id)
                .toList();
		// 查询用户收藏的skills
        Set<Long> starredSkillIds = findStarredSkillIds(userId, skillIds);
		// 查询每个skill的labels
        Map<Long, List<SkillLabelDto>> labelsBySkillId = skillLabelAppService.listSkillLabelsBySkillIds(skillIds);

        List<SkillExtendedSummaryResponse> items = baseResponse.items().stream()
                .map(item -> SkillExtendedSummaryResponse.from(
                        item,
                        starredSkillIds.contains(item.id()),
                        labelsBySkillId.getOrDefault(item.id(), List.of())
                ))
                .toList();

        return new ExtendedSearchResponse(items, baseResponse.total(), baseResponse.page(), baseResponse.size());
    }

    private Set<Long> findStarredSkillIds(String userId, List<Long> skillIds) {
        if (userId == null || userId.isBlank() || skillIds.isEmpty()) {
            return Set.of();
        }
        return skillStarRepository.findByUserIdAndSkillIdIn(userId, skillIds).stream()
                .map(SkillStar::getSkillId)
                .collect(Collectors.toSet());
    }
}
