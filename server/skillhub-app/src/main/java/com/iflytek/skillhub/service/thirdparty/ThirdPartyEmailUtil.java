package com.iflytek.skillhub.service.thirdparty;

/**
 * 第三方登录邮箱拼接工具：将第三方平台的登录标识（如 oa/loginName）拼接为邮箱地址。
 */
public final class ThirdPartyEmailUtil {

    private static final String DEFAULT_SUFFIX = "bankcomm.com";
    private static final String SDC_SUFFIX = "sdc.com";

    private ThirdPartyEmailUtil() {
    }

    public static String buildEmail(String oa) {
        if (oa.contains("@")) {
            return oa;
        }
        String suffix = DEFAULT_SUFFIX;
        if (oa.contains(".")) {
            String[] parts = oa.split("\\.");
            if ("sdc".equals(parts[parts.length - 1])) {
                suffix = SDC_SUFFIX;
            }
        }
        return oa + "@" + suffix;
    }
}
