import type { NotificationItem } from '@/api/types'

export type NotificationDisplay = {
  title: string
  description: string
}

type NotificationBody = {
  skillName?: string
  version?: string
  displayName?: string
  slug?: string
  reviewComment?: string
}

function parseBody(bodyJson?: string): NotificationBody {
  if (!bodyJson) {
    return {}
  }
  try {
    const parsed = JSON.parse(bodyJson)
    return typeof parsed === 'object' && parsed !== null ? parsed as NotificationBody : {}
  } catch {
    return {}
  }
}

function isChinese(language: string) {
  return language.toLowerCase().startsWith('zh')
}

export function resolveNotificationDisplay(item: NotificationItem, language: string): NotificationDisplay {
  const zh = isChinese(language)
  const body = parseBody(item.bodyJson)
  const skillName = body.skillName ?? ''
  const version = body.version ?? ''
  const versionSuffix = version ? (zh ? `（${version}）` : ` (${version})`) : ''

  switch (item.eventType) {
    case 'REVIEW_SUBMITTED':
      return {
        title: zh ? '技能审核提交' : 'Review submitted',
        description: skillName ? (zh ? `${skillName}${versionSuffix} 已提交审核。` : `${skillName}${versionSuffix} was submitted for review.`) : '',
      }
    case 'REVIEW_APPROVED':
      return {
        title: zh ? '技能审核通过' : 'Review approved',
        description: skillName ? (zh ? `${skillName}${versionSuffix} 已审核通过。` : `${skillName}${versionSuffix} was approved.`) : '',
      }
    case 'REVIEW_REJECTED':
      return {
        title: zh ? '技能审核驳回' : 'Review rejected',
        description: skillName ? (zh ? `${skillName}${versionSuffix} 审核未通过。` : `${skillName}${versionSuffix} was rejected.`) : '',
      }
    case 'PROMOTION_SUBMITTED':
      return {
        title: zh ? '技能推广提交' : 'Promotion submitted',
        description: skillName ? (zh ? `${skillName}${versionSuffix} 已提交推广。` : `${skillName}${versionSuffix} was submitted for promotion.`) : '',
      }
    case 'PROMOTION_APPROVED':
      return {
        title: zh ? '技能推广通过' : 'Promotion approved',
        description: skillName ? (zh ? `${skillName}${versionSuffix} 推广已通过。` : `${skillName}${versionSuffix} promotion was approved.`) : '',
      }
    case 'PROMOTION_REJECTED':
      return {
        title: zh ? '技能推广驳回' : 'Promotion rejected',
        description: skillName ? (zh ? `${skillName}${versionSuffix} 推广未通过。` : `${skillName}${versionSuffix} promotion was rejected.`) : '',
      }
    case 'REPORT_SUBMITTED':
      return {
        title: zh ? '技能举报提交' : 'Report submitted',
        description: skillName ? (zh ? `${skillName} 收到新的举报。` : `${skillName} received a new report.`) : '',
      }
    case 'REPORT_RESOLVED':
      return {
        title: zh ? '技能举报已处理' : 'Report resolved',
        description: skillName ? (zh ? `${skillName} 的举报已处理。` : `${skillName} report has been resolved.`) : '',
      }
    case 'SKILL_PUBLISHED':
      return {
        title: zh ? '技能发布成功' : 'Skill published',
        description: skillName ? (zh ? `${skillName}${versionSuffix} 已发布。` : `${skillName}${versionSuffix} was published.`) : '',
      }
    case 'NAMESPACE_APPLICATION_SUBMITTED': {
      const nsName = body.displayName ?? body.slug ?? ''
      return {
        title: zh ? '命名空间审核提交' : 'Namespace review submitted',
        description: nsName ? (zh ? `${nsName} 已提交审核。` : `${nsName} was submitted for review.`) : '',
      }
    }
    case 'NAMESPACE_APPLICATION_PENDING_REVIEW': {
      const nsName = body.displayName ?? body.slug ?? ''
      return {
        title: zh ? '新的命名空间申请' : 'New namespace application',
        description: nsName ? (zh ? `命名空间 ${nsName} 有新的申请，请审核。` : `A new application for namespace ${nsName} is pending review.`) : '',
      }
    }
    case 'NAMESPACE_APPLICATION_APPROVED': {
      const nsName = body.displayName ?? body.slug ?? ''
      return {
        title: zh ? '命名空间申请通过' : 'Namespace application approved',
        description: nsName ? (zh ? `您申请的命名空间 ${nsName} 已通过审核。` : `Your application for namespace ${nsName} has been approved.`) : '',
      }
    }
    case 'NAMESPACE_APPLICATION_REJECTED': {
      const nsName = body.displayName ?? body.slug ?? ''
      const comment = body.reviewComment ?? ''
      return {
        title: zh ? '命名空间申请被拒绝' : 'Namespace application rejected',
        description: nsName
          ? (zh
            ? `您申请的命名空间 ${nsName} 未通过审核。${comment ? `原因：${comment}` : ''}`
            : `Your application for namespace ${nsName} was rejected.${comment ? ` Reason: ${comment}` : ''}`)
          : '',
      }
    }
    default:
      return {
        title: item.title,
        description: '',
      }
  }
}
