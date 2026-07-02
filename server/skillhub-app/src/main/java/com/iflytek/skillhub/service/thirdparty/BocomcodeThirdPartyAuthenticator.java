package com.iflytek.skillhub.service.thirdparty;

import com.iflytek.skillhub.auth.exception.AuthFlowException;
import com.iflytek.skillhub.config.ThirdPartyLoginProperties;
import com.iflytek.skillhub.dto.ThirdPartyLoginPlatform;
import com.iflytek.skillhub.exception.BadRequestException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class BocomcodeThirdPartyAuthenticator extends AbstractThirdPartyTokenAuthenticator {
    private static final Logger log = LoggerFactory.getLogger(BocomcodeThirdPartyAuthenticator.class);
    private static final ThirdPartyLoginPlatform PLATFORM = ThirdPartyLoginPlatform.BOCOMCODE;
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_RESPONSE =
            new ParameterizedTypeReference<>() {
            };

    private final ThirdPartyLoginProperties properties;
    private final RestClient restClient;

    public BocomcodeThirdPartyAuthenticator(ThirdPartyLoginProperties properties) {
        super(properties, PLATFORM);
        this.properties = properties;
        this.restClient = RestClient.builder().build();
    }

    @Override
    public String verifyToken(String token) {
        String url = properties.getRequiredPlatform(PLATFORM).getTokenVerifyUrl();
        if (!StringUtils.hasText(url)) {
            throw new AuthFlowException(HttpStatus.BAD_REQUEST, "error.auth.thirdParty.verifyUrlMissing", PLATFORM.name());
        }
        try {
            Map<String, Object> response = restClient.get()
                    .uri(url + "?token=" + token)
                    .retrieve()
                    .body(MAP_RESPONSE);
            String email = extractUserName(response);
            if (!StringUtils.hasText(email)) {
                throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.emailMissing");
            }
            return email;
        } catch (AuthFlowException e) {
            throw e;
        } catch (RestClientException e) {
            log.warn("Bocomcode token 请求验证失败: {}", e.getMessage(), e);
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
        }
    }

    @SuppressWarnings("unchecked")
    private String extractUserName(Map<String, Object> response) {
        if (response == null) {
            throw new BadRequestException("error.auth.boComCodeToken.invalidResponse");
        }
        Object data = response.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            Object userName = ((Map<String, Object>) dataMap).get("userName");
            if (userName instanceof String value) {
                return value;
            }
        }
        return null;
    }
}