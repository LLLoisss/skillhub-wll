package com.iflytek.skillhub.domain.namespace;

/**
 * Status lifecycle for a namespace application.
 *
 * <ul>
 *   <li>{@code PENDING}  – submitted, awaiting admin review</li>
 *   <li>{@code APPROVED} – admin approved; the namespace has been created</li>
 *   <li>{@code REJECTED} – admin rejected with a comment</li>
 * </ul>
 */
public enum NamespaceApplicationStatus {
    PENDING,
    APPROVED,
    REJECTED
}
