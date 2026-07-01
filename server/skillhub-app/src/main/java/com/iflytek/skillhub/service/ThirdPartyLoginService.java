package com.iflytek.skillhub.service;

import com.iflytek.skillhub.auth.exception.AuthFlowException;
import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.auth.rbac.PlatformRoleDefaults;
import com.iflytek.skillhub.auth.repository.UserRoleBindingRepository;
import com.iflytek.skillhub.config.ThirdPartyLoginProperties;
import com.iflytek.skillhub.domain.namespace.GlobalNamespaceMembershipService;
import com.iflytek.skillhub.domain.user.UserAccount;
import com.iflytek.skillhub.domain.user.UserAccountRepository;
import com.iflytek.skillhub.domain.user.UserStatus;
import com.iflytek.skillhub.dto.ThirdPartyLoginPlatform;
import com.iflytek.skillhub.dto.ThirdPartyLoginRequest;
import com.iflytek.skillhub.service.thirdparty.ThirdPartyAesUtil;
import com.iflytek.skillhub.service.thirdparty.ThirdPartyPlatformAuthenticator;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ThirdPartyLoginService {

    private static final Duration AUTH_TOKEN_TTL = Duration.ofMinutes(5);
    private static final int SECRETLENGTH = 8;

    private final ThirdPartyLoginProperties properties;
    private final Map<ThirdPartyLoginPlatform, ThirdPartyPlatformAuthenticator> authenticators;
    private final UserAccountRepository userAccountRepository;
    private final UserRoleBindingRepository userRoleBindingRepository;
    private final GlobalNamespaceMembershipService globalNamespaceMembershipService;
    private final Clock clock;

    public ThirdPartyLoginService(ThirdPartyLoginProperties properties,
                                  List<ThirdPartyPlatformAuthenticator> authenticators,
                                  UserAccountRepository userAccountRepository,
                                  UserRoleBindingRepository userRoleBindingRepository,
                                  GlobalNamespaceMembershipService globalNamespaceMembershipService,
                                  Clock clock) {
        this.properties = properties;
        this.authenticators = authenticators.stream()
                .collect(Collectors.toUnmodifiableMap(ThirdPartyPlatformAuthenticator::platform, Function.identity()));
        this.userAccountRepository = userAccountRepository;
        this.userRoleBindingRepository = userRoleBindingRepository;
        this.globalNamespaceMembershipService = globalNamespaceMembershipService;
        this.clock = clock;
    }

    @Transactional
    public PlatformPrincipal authenticate(ThirdPartyLoginRequest request, HttpServletRequest httpRequest) {
        ThirdPartyIdentity identity = switch (request.loginMethod()) {
            case TOKEN -> authenticateToken(request.platform(), request.token());
            case AUTH -> authenticateAuth(request.platform(), request.token());
        };
        return resolvePrincipal(request.platform(), identity);
    }

    private ThirdPartyIdentity authenticateToken(ThirdPartyLoginPlatform platform, String token) {
        ThirdPartyPlatformAuthenticator authenticator = authenticators.get(platform);
        if (authenticator == null) {
            throw new AuthFlowException(HttpStatus.BAD_REQUEST, "error.auth.thirdParty.platformUnsupported", platform.name());
        }
        String email = normalizeEmail(authenticator.verifyToken(token));
        String displayName = email.substring(0, email.indexOf('@'));
        return new ThirdPartyIdentity(email, displayName);
    }

    private ThirdPartyIdentity authenticateAuth(ThirdPartyLoginPlatform platform, String token) {
        // 获取密钥：根据平台类型从配置中获取对应的认证密钥
        String secret = properties.getRequiredPlatform(platform).getAuthSecret();
        // 密钥校验：检查密钥是否存在且长度符合要求
        if (!StringUtils.hasText(secret) || secret.length() != SECRETLENGTH) {
            throw new AuthFlowException(HttpStatus.BAD_REQUEST, "error.auth.thirdParty.authSecretInvalid");
        }
        // 生成解密密钥：使用当前日期拼接密钥生成AES解密密钥
        String key = LocalDate.now(clock).format(DateTimeFormatter.BASIC_ISO_DATE) + secret;
        // 解密token：使用AES算法解密token得到明文
        String plainText = ThirdPartyAesUtil.decrypt(token, key);
        // 格式校验：将明文按#分割，验证分割后是否为2部分且第一部分非空
        String[] parts = plainText.split("#", -1);
        if (parts.length != 2 || !StringUtils.hasText(parts[0])) {
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
        }

        // 时间戳解析：将第二部分解析为毫秒级时间戳，解析失败则抛出异常
        Instant issuedAt;
        try {
            issuedAt = Instant.ofEpochMilli(Long.parseLong(parts[1]));
        } catch (NumberFormatException ex) {
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
        }
        // 时效校验：检查时间戳是否在有效期内（不能是未来时间且不能超过TTL）
        Instant now = Instant.now(clock);
        if (issuedAt.isAfter(now) || issuedAt.plus(AUTH_TOKEN_TTL).isBefore(now)) {
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenExpired");
        }

        // 返回身份：将第一部分作为oa标识，构造并返回ThirdPartyIdentity对象
        String oa = parts[0].trim();
        return new ThirdPartyIdentity(normalizeEmail(buildEmail(oa)), oa);
    }

    private PlatformPrincipal resolvePrincipal(ThirdPartyLoginPlatform platform, ThirdPartyIdentity identity) {
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(identity.email()).orElse(null);
        if (user == null) {
            user = new UserAccount("usr_" + UUID.randomUUID(), identity.displayName(), identity.email(), null);
            user.setStatus(UserStatus.ACTIVE);
            user = userAccountRepository.save(user);
            globalNamespaceMembershipService.ensureMember(user.getId());
        }
        ensureUserCanLogin(user);

        Set<String> roles = userRoleBindingRepository.findByUserId(user.getId()).stream()
                .map(binding -> binding.getRole().getCode())
                .collect(Collectors.toSet());
        roles = PlatformRoleDefaults.withDefaultUserRole(roles);

        return new PlatformPrincipal(
                user.getId(),
                user.getDisplayName(),
                user.getEmail(),
                user.getAvatarUrl(),
                platform.name().toLowerCase(Locale.ROOT),
                roles
        );
    }

    private void ensureUserCanLogin(UserAccount user) {
        if (user.getStatus() == UserStatus.DISABLED) {
            throw new AuthFlowException(HttpStatus.FORBIDDEN, "error.auth.local.accountDisabled");
        }
        if (user.getStatus() == UserStatus.PENDING) {
            throw new AuthFlowException(HttpStatus.FORBIDDEN, "error.auth.local.accountPending");
        }
        if (user.getStatus() == UserStatus.MERGED) {
            throw new AuthFlowException(HttpStatus.FORBIDDEN, "error.auth.local.accountMerged");
        }
    }

    private String normalizeEmail(String email) {
        if (!StringUtils.hasText(email) || !email.contains("@")) {
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.emailInvalid");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String buildEmail(String oa) {
        if (oa.contains("@")) {
            return oa;
        }
        String suffix = "bankcomm.com";
        if (oa.contains(".")) {
            String[] parts = oa.split("\\.");
            if ("sdc".equals(parts[parts.length - 1])) {
                suffix = "sdc.com";
            }
        }
        return oa + "@" + suffix;
    }

    private record ThirdPartyIdentity(String email, String displayName) {
    }
}