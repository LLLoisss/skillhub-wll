package com.iflytek.skillhub.service.thirdparty;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.skillhub.auth.exception.AuthFlowException;
import com.iflytek.skillhub.config.ThirdPartyLoginProperties;
import com.iflytek.skillhub.dto.ThirdPartyLoginPlatform;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;

public abstract class AbstractGuwpThirdPartyAuthenticator extends AbstractThirdPartyTokenAuthenticator {

    private static final Logger log = LoggerFactory.getLogger(AbstractGuwpThirdPartyAuthenticator.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ThirdPartyLoginProperties properties;
    private final ThirdPartyLoginPlatform platform;

    protected AbstractGuwpThirdPartyAuthenticator(ThirdPartyLoginProperties properties, ThirdPartyLoginPlatform platform) {
        super(properties, platform);
        this.properties = properties;
        this.platform = platform;
    }

    @Override
    public String verifyToken(String token) {
        String url = properties.getRequiredPlatform(platform).getTokenVerifyUrl();
        if (!StringUtils.hasText(url)) {
            throw new AuthFlowException(HttpStatus.BAD_REQUEST, "error.auth.thirdParty.verifyUrlMissing", platform.name());
        }
        try {
            // 上游接口返回的 Content-Type 为 */*，RestClient 无法自动匹配 JSON 转换器，
            // 因此先取原始字符串，再手动用 ObjectMapper 解析为 Map
            String body = restClient.get()
                    .uri(url)
                    .header("guwp-token", token)
                    .retrieve()
                    .body(String.class);
            Map<String, Object> response = parseResponse(body);
            String loginName = extractLoginName(response);
            if (!StringUtils.hasText(loginName)) {
                throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.emailMissing");
            }
            return ThirdPartyEmailUtil.buildEmail(loginName.trim());
        } catch (AuthFlowException e) {
            throw e;
        } catch (RestClientException e) {
            log.warn("Guwp token 请求验证失败: {}", e.getMessage(), e);
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
        } catch (Exception e) {
            log.warn("Guwp token 响应解析失败: {}", e.getMessage(), e);
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
        }
    }

    private Map<String, Object> parseResponse(String body) throws Exception {
        if (!StringUtils.hasText(body)) {
            return null;
        }
        return OBJECT_MAPPER.readValue(body, new TypeReference<Map<String, Object>>() {
        });
    }

    @SuppressWarnings("unchecked")
    private String extractLoginName(Map<String, Object> response) {
        if (response == null) {
            return null;
        }
        // RSP_BODY.result 为登录用户信息，取出其中的 loginName 即可
        Object rspBody = response.get("RSP_BODY");
        if (!(rspBody instanceof Map<?, ?> rspBodyMap)) {
            return null;
        }
        Object result = ((Map<String, Object>) rspBodyMap).get("result");
        if (!(result instanceof Map<?, ?> resultMap)) {
            return null;
        }
        Object loginName = ((Map<String, Object>) resultMap).get("loginName");
        return loginName instanceof String value ? value : null;
    }
}
