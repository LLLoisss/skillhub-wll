package com.iflytek.skillhub.service.thirdparty;

import com.iflytek.skillhub.auth.exception.AuthFlowException;
import java.nio.charset.StandardCharsets;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;

public final class ThirdPartyAesUtil {

    private static final String TRANSFORMATION = "AES/ECB/PKCS5Padding";
    private static final String ALGORITHM = "AES";

    private ThirdPartyAesUtil() {
    }

    public static String decrypt(String cipherText, String key) {

        if (key == null || key.getBytes(StandardCharsets.UTF_8).length != 16) {
            throw new AuthFlowException(HttpStatus.BAD_REQUEST, "error.auth.thirdParty.authSecretInvalid");
        }
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), ALGORITHM));
            return new String(cipher.doFinal(decodeCipherText(cipherText)), StandardCharsets.UTF_8);
        } catch (AuthFlowException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
        }
    }

    private static byte[] decodeCipherText(String cipherText) {
        return decodeHex(cipherText);
    }

    private static byte[] decodeHex(String cipherText) {
        String normalized = cipherText == null ? "" : cipherText.trim();
        if ((normalized.length() & 1) != 0) {
            throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
        }
        byte[] result = new byte[normalized.length() / 2];
        for (int i = 0; i < normalized.length(); i += 2) {
            int high = Character.digit(normalized.charAt(i), 16);
            int low = Character.digit(normalized.charAt(i + 1), 16);
            if (high < 0 || low < 0) {
                throw new AuthFlowException(HttpStatus.UNAUTHORIZED, "error.auth.thirdParty.tokenInvalid");
            }
            result[i / 2] = (byte) ((high << 4) + low);
        }
        return result;
    }
}