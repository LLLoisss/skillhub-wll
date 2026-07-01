package com.iflytek.skillhub.service.thirdparty;

import com.iflytek.skillhub.auth.exception.AuthFlowException;
import com.iflytek.skillhub.config.ThirdPartyLoginProperties;
import com.iflytek.skillhub.dto.ThirdPartyLoginPlatform;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

public abstract class AbstractThirdPartyTokenAuthenticator implements ThirdPartyPlatformAuthenticator {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_RESPONSE =
            new ParameterizedTypeReference<>() {
            };

    private final ThirdPartyLoginProperties properties;
    private final RestClient restClient;
    private final ThirdPartyLoginPlatform platform;

    protected AbstractThirdPartyTokenAuthenticator(ThirdPartyLoginProperties properties,
                                                   ThirdPartyLoginPlatform platform) {
        this.properties = properties;
        this.platform = platform;
        this.restClient = RestClient.builder().build();
    }

    @Override
    public ThirdPartyLoginPlatform platform() {
        return platform;
    }

    @Override
    public String verifyToken(String token) {
        String url = properties.getRequiredPlatform(platform).getTokenVerifyUrl();
        if (!StringUtils.hasText(url)) {
            throw new AuthFlowException(HttpStatus.BAD_REQUEST, "error.auth.thirdParty.verifyUrlMissing", platform.name());
        }
        try {
            Map<String, Object> response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("token", token))
                    .retrieve()
                    .body(MAP_RESPONSE);
            String email = extractEmail(response);
            if (!StringUtils.hasText(email)) {
                throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.emailMissing");
            }
            return email;
        } catch (AuthFlowException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
        }
    }

    @SuppressWarnings("unchecked")
    private String extractEmail(Map<String, Object> response) {
        if (response == null || response.isEmpty()) {
            return null;
        }
        Object email = response.get("email");
        if (email instanceof String value) {
            return value;
        }
        Object data = response.get("data");
        if (data instanceof Map<?, ?> nested) {
            return extractEmail((Map<String, Object>) nested);
        }
        Object user = response.get("user");
        if (user instanceof Map<?, ?> nested) {
            return extractEmail((Map<String, Object>) nested);
        }
        return null;
    }
}
