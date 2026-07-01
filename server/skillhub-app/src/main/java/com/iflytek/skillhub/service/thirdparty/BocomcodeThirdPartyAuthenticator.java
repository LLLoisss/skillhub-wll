package com.iflytek.skillhub.service.thirdparty;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.skillhub.auth.exception.AuthFlowException;
import com.iflytek.skillhub.config.ThirdPartyLoginProperties;
import com.iflytek.skillhub.dto.ThirdPartyLoginPlatform;
import com.iflytek.skillhub.exception.BadRequestException;
import com.iflytek.skillhub.service.BoComCodeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class BocomcodeThirdPartyAuthenticator extends AbstractThirdPartyTokenAuthenticator {
    private static final Logger log = LoggerFactory.getLogger(BocomcodeThirdPartyAuthenticator.class);
    private final ThirdPartyLoginProperties properties;
    private static final ThirdPartyLoginPlatform PLATFORM = ThirdPartyLoginPlatform.BOCOMCODE;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public BocomcodeThirdPartyAuthenticator(ThirdPartyLoginProperties properties, ObjectMapper objectMapper) {
        super(properties, PLATFORM);
        this.properties = properties;
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
    }

    @Override
    public String verifyToken(String token) {
        String url = properties.getRequiredPlatform(PLATFORM).getTokenVerifyUrl();
        if (!StringUtils.hasText(url)) {
            throw new AuthFlowException(HttpStatus.BAD_REQUEST, "error.auth.thirdParty.verifyUrlMissing", PLATFORM.name());
        }
        try {
            String boComCodeUrl = url + "?token=" + token;
            ResponseEntity<String> response = restTemplate.getForEntity(
                    boComCodeUrl,
                    String.class
            );
            if (response.getBody() == null) {
                throw new BadRequestException("error.auth.boComCodeToken.invalidResponse");
            }
            String email = objectMapper.readTree(response.getBody()).get("data").get("userName").asText();
            if (!StringUtils.hasText(email)) {
                throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.emailMissing");
            }
            return email;
        } catch (AuthFlowException e) {
            log.info("Bocomcode token 请求验证失败："+e);
            throw e;
        } catch (RestClientException e) {
            log.info("Bocomcode token 请求验证失败："+e);
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
        } catch (JsonMappingException e) {
            log.info("Bocomcode token 请求验证失败："+e);
            throw new RuntimeException(e);
        } catch (Exception e) {
            log.info("Bocomcode token 请求验证失败："+e);
            throw new BadRequestException("error.auth.boComCodeToken.invalidResponse");
        }
    }
}