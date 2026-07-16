import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/use-auth'
import { UploadZone } from '@/features/publish/upload-zone'
import { SuiteCreateForm } from '@/features/suite/suite-create-form'
import {
  extractPrecheckWarnings,
  isFrontmatterFailureMessage,
  isPrecheckConfirmationMessage,
  isPrecheckFailureMessage,
  isVersionExistsMessage,
} from '@/features/publish/publish-error-utils'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  normalizeSelectValue,
  SELECT_TRIGGER_CLASS_NAME,
} from '@/shared/ui/select'
import { Label } from '@/shared/ui/label'
import { Card } from '@/shared/ui/card'
import { usePublishSkill } from '@/shared/hooks/use-skill-queries'
import { useAllDepartments, useUserProfileByEmail } from '@/shared/hooks/use-department-queries'
import { useVisibleLabels } from '@/shared/hooks/use-label-queries'
import { useMyActiveNamespaces } from '@/shared/hooks/use-namespace-queries'
import { Input } from '@/shared/ui/input'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { DashboardPageHeader } from '@/shared/components/dashboard-page-header'
import { toast } from '@/shared/lib/toast'
import { ApiError } from '@/api/client'
import type { Department, LabelItem } from '@/api/types'
import { ChevronDown, Check, X } from 'lucide-react'

interface DeptOption {
  label: string
  primary: string
  secondary: string
}

function flattenDepts(depts: Department[]): DeptOption[] {
  const result: DeptOption[] = []
  for (const parent of depts) {
    if (parent.children && parent.children.length > 0) {
      for (const child of parent.children) {
        result.push({ label: `${parent.name}-${child.name}`, primary: parent.name, secondary: child.name })
      }
    }
  }
  return result
}

const EMPTY_NAMESPACE_VALUE = '__select_namespace__'
const MAX_SELECTED_LABELS = 10

type PublishTab = 'skill' | 'suite'

function sortLabels(left: LabelItem, right: LabelItem) {
  return left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' })
    || left.slug.localeCompare(right.slug, undefined, { sensitivity: 'base' })
}

export function PublishPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as { tab?: string }
  const { user } = useAuth()
  const initialPublishTab: PublishTab = searchParams.tab === 'suite' ? 'suite' : 'skill'
  const [activePublishTab, setActivePublishTab] = useState<PublishTab>(initialPublishTab)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [namespaceSlug, setNamespaceSlug] = useState<string>('')
  const [selectedDept, setSelectedDept] = useState<DeptOption | null>(null)
  const [publisherName, setPublisherName] = useState<string>('')
  const [visibility, setVisibility] = useState<string>('PUBLIC')
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [precheckWarnings, setPrecheckWarnings] = useState<string[]>([])
  const [departmentOpen, setDepartmentOpen] = useState(false)
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [labelOpen, setLabelOpen] = useState(false)
  const [labelSearch, setLabelSearch] = useState('')
  const [selectedLabelSlugs, setSelectedLabelSlugs] = useState<string[]>([])
  const departmentRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)

  const { data: namespaces, isLoading: isLoadingNamespaces } = useMyActiveNamespaces()
  const { data: allDepartments, isLoading: isLoadingAllDepartments } = useAllDepartments()
  const { data: userProfile } = useUserProfileByEmail(user?.email)
  const { data: visibleLabels, isLoading: isLoadingLabels } = useVisibleLabels()
  const publishMutation = usePublishSkill()
  const isSuperAdmin = user?.platformRoles?.includes('SUPER_ADMIN') === true

  useEffect(() => {
    if (userProfile?.name) {
      setPublisherName(userProfile.name)
    }
  }, [userProfile])

  const userDeptOptions = flattenDepts(userProfile?.departments ?? [])
  const allDeptOptions = flattenDepts(allDepartments ?? [])
  const userLabels = new Set(userDeptOptions.map((d) => d.label))
  const extraDeptOptions = allDeptOptions.filter((d) => !userLabels.has(d.label))
  const searchLower = departmentSearch.toLowerCase()
  const filteredUserOptions = userDeptOptions.filter((d) => d.label.toLowerCase().includes(searchLower))
  const filteredExtraOptions = extraDeptOptions.filter((d) => d.label.toLowerCase().includes(searchLower))
  const labelSearchLower = labelSearch.toLowerCase()
  const selectableLabels = (visibleLabels ?? [])
    .filter((label) => isSuperAdmin || label.type !== 'PRIVILEGED')
    .slice()
    .sort(sortLabels)
  const selectedLabels = selectedLabelSlugs
    .map((slug) => selectableLabels.find((label) => label.slug === slug))
    .filter((label): label is LabelItem => Boolean(label))
  const filteredLabels = selectableLabels.filter((label) =>
    label.displayName.toLowerCase().includes(labelSearchLower)
    || label.slug.toLowerCase().includes(labelSearchLower)
  )
  const maxLabelsReached = selectedLabelSlugs.length >= MAX_SELECTED_LABELS

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (departmentRef.current && !departmentRef.current.contains(event.target as Node)) {
        setDepartmentOpen(false)
        setDepartmentSearch('')
      }
      if (labelRef.current && !labelRef.current.contains(event.target as Node)) {
        setLabelOpen(false)
        setLabelSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const selectedNamespace = namespaces?.find((ns) => ns.slug === namespaceSlug)
  const namespaceOnlyLabel = selectedNamespace?.type === 'GLOBAL'
    ? t('publish.visibilityOptions.loggedInUsersOnly')
    : t('publish.visibilityOptions.namespaceOnly')

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null)
    setPrecheckWarnings([])
    setWarningDialogOpen(false)
  }

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file)
    setPrecheckWarnings([])
    setWarningDialogOpen(false)
  }

  const toggleLabel = (labelSlug: string) => {
    if (selectedLabelSlugs.includes(labelSlug)) {
      setSelectedLabelSlugs((current) => current.filter((slug) => slug !== labelSlug))
      return
    }
    if (maxLabelsReached) {
      toast.error(t('publish.maxLabelsReached'))
      return
    }
    setSelectedLabelSlugs((current) => [...current, labelSlug])
  }

  const removeLabel = (labelSlug: string) => {
    setSelectedLabelSlugs((current) => current.filter((slug) => slug !== labelSlug))
  }

  const publishSkill = async (confirmWarnings = false) => {
    if (!selectedFile || !namespaceSlug || !selectedDept || !publisherName || selectedLabelSlugs.length === 0) {
      toast.error(t('publish.selectRequired'))
      return
    }

    try {
      const result = await publishMutation.mutateAsync({
        namespace: namespaceSlug,
        file: selectedFile,
        visibility,
        confirmWarnings,
        primaryDepartment: selectedDept?.primary,
        secondaryDepartment: selectedDept?.secondary,
        publisherName: publisherName || undefined,
        labelSlugs: selectedLabelSlugs,
      })
      setPrecheckWarnings([])
      setWarningDialogOpen(false)
      const skillLabel = `${result.namespace}/${result.slug}@${result.version}`
      if (result.status === 'PUBLISHED') {
        toast.success(
          t('publish.publishedTitle'),
          t('publish.publishedDescription', { skill: skillLabel })
        )
      } else {
        toast.success(
          t('publish.pendingReviewTitle'),
          t('publish.pendingReviewDescription', { skill: skillLabel })
        )
      }
      navigate({ to: '/dashboard/skills' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 408) {
        toast.error(t('publish.timeoutTitle'), t('publish.timeoutDescription'))
        return
      }

      if (error instanceof ApiError && isVersionExistsMessage(error.serverMessage || error.message)) {
        toast.error(
          t('publish.versionExistsTitle'),
          t('publish.versionExistsDescription'),
        )
        return
      }

      if (error instanceof ApiError && isPrecheckConfirmationMessage(error.serverMessage || error.message)) {
        setPrecheckWarnings(extractPrecheckWarnings(error.serverMessage || error.message))
        setWarningDialogOpen(true)
        return
      }

      if (error instanceof ApiError && isPrecheckFailureMessage(error.serverMessage || error.message)) {
        toast.error(
          t('publish.precheckFailedTitle'),
          error.serverMessage || t('publish.precheckFailedDescription'),
        )
        return
      }

      if (error instanceof ApiError && isFrontmatterFailureMessage(error.serverMessage || error.message)) {
        toast.error(
          t('publish.frontmatterFailedTitle'),
          error.serverMessage || t('publish.frontmatterFailedDescription'),
        )
        return
      }

      toast.error(t('publish.error'), error instanceof Error ? error.message : '')
    }
  }

  const handlePublish = async () => {
    await publishSkill(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-up">
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-1">
          <Button
            type="button"
            variant={activePublishTab === 'skill' ? 'default' : 'ghost'}
            className="min-w-32"
            onClick={() => setActivePublishTab('skill')}
          >
            {t('publish.title')}
          </Button>
          <Button
            type="button"
            variant={activePublishTab === 'suite' ? 'default' : 'ghost'}
            className="min-w-32"
            onClick={() => setActivePublishTab('suite')}
          >
            {t('publish.publishSuite')}
          </Button>
        </div>
      </div>

      <div className={activePublishTab === 'skill' ? 'space-y-8' : 'hidden'}>
        <DashboardPageHeader title={t('publish.title')} subtitle={t('publish.subtitle')} />

      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-1">{t('publish.reviewNotice.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('publish.reviewNotice.description')}</p>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-8">
        <div className="space-y-3">
          <Label htmlFor="namespace" className="text-sm font-semibold font-heading">{t('publish.namespace')}</Label>
          {isLoadingNamespaces ? (
            <div className="h-11 animate-shimmer rounded-lg" />
          ) : (
            <Select
              value={normalizeSelectValue(namespaceSlug) ?? EMPTY_NAMESPACE_VALUE}
              onValueChange={(value) => {
                setNamespaceSlug(value === EMPTY_NAMESPACE_VALUE ? '' : value)
              }}
            >
              <SelectTrigger id="namespace">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_NAMESPACE_VALUE}>{t('publish.selectNamespace')}</SelectItem>
                {namespaces?.map((ns) => (
                  <SelectItem key={ns.id} value={ns.slug}>
                    {ns.displayName} (@{ns.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="publisherName" className="text-sm font-semibold font-heading">{t('publish.publisherName')}</Label>
          <Input
            id="publisherName"
            type="text"
            value={publisherName}
            onChange={(e) => setPublisherName(e.target.value)}
            placeholder={t('publish.publisherNamePlaceholder')}
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="department" className="text-sm font-semibold font-heading">{t('publish.department')}</Label>
          {isLoadingAllDepartments ? (
            <div className="h-11 animate-shimmer rounded-lg" />
          ) : (
            <div ref={departmentRef} className="relative">
              {departmentOpen ? (
                <div className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-primary/50 bg-secondary/50 px-4 py-2 text-sm ring-2 ring-primary/40 ring-offset-background transition-all duration-200">
                  <input
                    autoFocus
                    value={departmentSearch}
                    onChange={(e) => setDepartmentSearch(e.target.value)}
                    placeholder={t('publish.searchDepartment')}
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              ) : (
                <button
                  type="button"
                  id="department"
                  onClick={() => {
                    setDepartmentOpen(true)
                    setDepartmentSearch('')
                  }}
                  className={SELECT_TRIGGER_CLASS_NAME}
                  aria-expanded={false}
                >
                  <span className={selectedDept ? 'text-foreground line-clamp-1' : 'text-muted-foreground line-clamp-1'}>
                    {selectedDept?.label || t('publish.selectDepartment')}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
              )}
              {departmentOpen && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
                  <div className="max-h-60 overflow-y-auto p-1">
                    {filteredUserOptions.map((opt) => (
                      <button
                        key={`user-${opt.label}`}
                        type="button"
                        onClick={() => {
                          setSelectedDept(opt)
                          setDepartmentOpen(false)
                          setDepartmentSearch('')
                        }}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-4 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      >
                        {selectedDept?.label === opt.label && <Check className="absolute left-2 h-4 w-4" />}
                        {opt.label}
                      </button>
                    ))}
                    {filteredExtraOptions.map((opt) => (
                      <button
                        key={`all-${opt.label}`}
                        type="button"
                        onClick={() => {
                          setSelectedDept(opt)
                          setDepartmentOpen(false)
                          setDepartmentSearch('')
                        }}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-4 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      >
                        {selectedDept?.label === opt.label && <Check className="absolute left-2 h-4 w-4" />}
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDept({ label: "其他部门", primary: "其他部门", secondary: "其他部门" })
                        setDepartmentOpen(false)
                        setDepartmentSearch('')
                      }}
                      className="relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-4 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    >
                      {selectedDept?.label === "其他部门" && <Check className="absolute left-2 h-4 w-4" />}
                      {"其他部门"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="labels" className="text-sm font-semibold font-heading">{t('publish.labels')}</Label>
          {isLoadingLabels ? (
            <div className="h-11 animate-shimmer rounded-lg" />
          ) : (
            <div ref={labelRef} className="relative">
              <div
                className={[
                  'flex min-h-11 w-full items-center gap-2 rounded-lg border bg-secondary/50 px-3 py-2 text-sm transition-all duration-200',
                  labelOpen ? 'border-primary/50 ring-2 ring-primary/40 ring-offset-background' : 'border-input hover:border-primary/50',
                ].join(' ')}
                onClick={() => {
                  setLabelOpen(true)
                  labelInputRef.current?.focus()
                }}
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {selectedLabels.map((label) => (
                    <span
                      key={label.slug}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      <span className="max-w-36 truncate">{label.displayName}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          removeLabel(label.slug)
                        }}
                        className="rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        aria-label={t('publish.removeLabel', { label: label.displayName })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={labelInputRef}
                    id="labels"
                    value={labelSearch}
                    onChange={(e) => setLabelSearch(e.target.value)}
                    onFocus={() => setLabelOpen(true)}
                    placeholder={labelOpen ? t('publish.searchLabels') : selectedLabels.length === 0 ? t('publish.selectLabels') : ''}
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>

              {labelOpen && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
                  <div className="max-h-60 overflow-y-auto p-1">
                    {maxLabelsReached && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {t('publish.maxLabelsReached')}
                      </div>
                    )}
                    {filteredLabels.length > 0 ? filteredLabels.map((label) => {
                      const selected = selectedLabelSlugs.includes(label.slug)
                      const disabled = maxLabelsReached && !selected
                      return (
                        <button
                          key={label.slug}
                          type="button"
                          onClick={() => toggleLabel(label.slug)}
                          disabled={disabled}
                          title={disabled ? t('publish.maxLabelsReached') : undefined}
                          className={[
                            'relative flex w-full select-none items-center rounded-md py-2 pl-8 pr-4 text-left text-sm outline-none',
                            disabled
                              ? 'cursor-not-allowed text-muted-foreground opacity-50'
                              : 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
                          ].join(' ')}
                        >
                          {selected && <Check className="absolute left-2 h-4 w-4" />}
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate">{label.displayName}</span>
                            <span className="shrink-0 truncate text-xs text-muted-foreground">(@{label.slug})</span>
                          </span>
                        </button>
                      )
                    }) : (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        {t('publish.noLabelsFound')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="visibility" className="text-sm font-semibold font-heading">{t('publish.visibility')}</Label>
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger id="visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">{t('publish.visibilityOptions.public')}</SelectItem>
              <SelectItem value="NAMESPACE_ONLY">{namespaceOnlyLabel}</SelectItem>
              <SelectItem value="PRIVATE">{t('publish.visibilityOptions.private')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold font-heading">{t('publish.file')}</Label>
          <UploadZone
            key={selectedFile ? `${selectedFile.name}-${selectedFile.lastModified}` : 'empty'}
            onFileSelect={handleFileSelect}
            disabled={publishMutation.isPending}
          />
          {selectedFile && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
              <div className="min-w-0 text-sm text-muted-foreground flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="truncate">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveSelectedFile}
                disabled={publishMutation.isPending}
              >
                {t('publish.removeSelectedFile')}
              </Button>
            </div>
          )}
        </div>

        <Button
          className="w-full text-primary-foreground disabled:text-primary-foreground"
          size="lg"
          onClick={handlePublish}
          disabled={!selectedFile || !namespaceSlug || !selectedDept || !publisherName || selectedLabelSlugs.length === 0 || publishMutation.isPending}
        >
          {publishMutation.isPending ? t('publish.publishing') : t('publish.confirm')}
        </Button>
      </Card>
      </div>

      <div className={activePublishTab === 'suite' ? 'space-y-8' : 'hidden'}>
        <DashboardPageHeader
          title={t('publish.publishSuite')}
          subtitle={t('suites.createSuiteDescription')}
        />
        <Card className="p-8">
          <SuiteCreateForm actionsClassName="block" fullWidthSubmit />
        </Card>
      </div>

      <ConfirmDialog
        open={warningDialogOpen}
        onOpenChange={setWarningDialogOpen}
        title={t('publish.warningConfirmTitle')}
        description={(
          <div className="space-y-3 text-left">
            <p>{t('publish.warningConfirmDescription')}</p>
            {precheckWarnings.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {precheckWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        confirmText={t('publish.warningConfirmContinue')}
        cancelText={t('publish.warningConfirmCancel')}
        onConfirm={() => publishSkill(true)}
      />
    </div>
  )
}