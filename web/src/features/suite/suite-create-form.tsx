import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import { useAuth } from '@/features/auth/use-auth'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  normalizeSelectValue,
  SELECT_TRIGGER_CLASS_NAME,
} from '@/shared/ui/select'
import { useVisibleLabels } from '@/shared/hooks/use-label-queries'
import { useAllDepartments, useUserProfileByEmail } from '@/shared/hooks/use-department-queries'
import { useMyActiveNamespaces } from '@/shared/hooks/use-namespace-queries'
import { toast } from '@/shared/lib/toast'
import type { Department } from '@/api/types'
import { Check, ChevronDown } from 'lucide-react'
import {
  filterSelectableLabelHierarchy,
  HierarchicalLabelMultiSelect,
} from '@/features/label/hierarchical-label-multi-select'
import { buildHierarchicalBindingSlugs } from '@/features/label/label-hierarchy'
import { useCreateSuite } from './use-suite-queries'
import { SuiteSkillPicker, type SuiteSkillPickerItem } from './suite-skill-picker'

const MAX_LABELS = 9
const MAX_SKILLS = 50

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

interface SuiteCreateFormProps {
  actionsClassName?: string
  cancelAction?: ReactNode
  fullWidthSubmit?: boolean
  onCreated?: () => void
}

export function SuiteCreateForm({ actionsClassName, cancelAction, fullWidthSubmit = false, onCreated }: SuiteCreateFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [namespaceSlug, setNamespaceSlug] = useState('')
  const [selectedDept, setSelectedDept] = useState<DeptOption | null>(null)
  const [publisherName, setPublisherName] = useState('')
  const [departmentOpen, setDepartmentOpen] = useState(false)
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [summary, setSummary] = useState('')
  const [selectedPrimaryLabelSlug, setSelectedPrimaryLabelSlug] = useState('')
  const [selectedLabelSlugs, setSelectedLabelSlugs] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<SuiteSkillPickerItem[]>([])
  const departmentRef = useRef<HTMLDivElement>(null)

  const { data: namespaces } = useMyActiveNamespaces()
  const { data: allDepartments, isLoading: isLoadingAllDepartments } = useAllDepartments()
  const { data: userProfile } = useUserProfileByEmail(user?.email)
  const { data: visibleLabels } = useVisibleLabels()
  const createMutation = useCreateSuite()
  const isSuperAdmin = user?.platformRoles?.includes('SUPER_ADMIN') === true
  const selectableLabels = filterSelectableLabelHierarchy(visibleLabels ?? [], isSuperAdmin)
  const userDeptOptions = flattenDepts(userProfile?.departments ?? [])
  const allDeptOptions = flattenDepts(allDepartments ?? [])
  const userLabels = new Set(userDeptOptions.map((d) => d.label))
  const extraDeptOptions = allDeptOptions.filter((d) => !userLabels.has(d.label))
  const searchLower = departmentSearch.toLowerCase()
  const filteredUserOptions = userDeptOptions.filter((d) => d.label.toLowerCase().includes(searchLower))
  const filteredExtraOptions = extraDeptOptions.filter((d) => d.label.toLowerCase().includes(searchLower))
  const isFormValid = Boolean(
    namespaceSlug
    && selectedDept
    && publisherName
    && displayName.trim().length >= 2
    && summary.trim()
    && selectedSkills.length > 0,
  )

  useEffect(() => {
    if (userProfile?.name) {
      setPublisherName(userProfile.name)
    }
  }, [userProfile])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (departmentRef.current && !departmentRef.current.contains(event.target as Node)) {
        setDepartmentOpen(false)
        setDepartmentSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resetForm = () => {
    setNamespaceSlug('')
    setSelectedDept(null)
    setPublisherName('')
    setDepartmentOpen(false)
    setDepartmentSearch('')
    setDisplayName('')
    setSummary('')
    setSelectedPrimaryLabelSlug('')
    setSelectedLabelSlugs([])
    setSelectedSkills([])
  }

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error(t('suites.createValidationError'))
      return
    }

    const bindingLabelSlugs = buildHierarchicalBindingSlugs(
      selectableLabels,
      selectedPrimaryLabelSlug,
      selectedLabelSlugs,
    )
    if (selectedPrimaryLabelSlug && bindingLabelSlugs.length === 0) {
      toast.error(t('publish.singlePrimaryLabelOnly'))
      return
    }

    try {
      const result = await createMutation.mutateAsync({
        namespace: namespaceSlug,
        primaryDepartment: selectedDept?.primary,
        secondaryDepartment: selectedDept?.secondary,
        publisherName: publisherName || undefined,
        displayName: displayName.trim(),
        summary: summary.trim() || undefined,
        skillIds: selectedSkills.map((item) => item.skillId),
        labelSlugs: bindingLabelSlugs.length > 0 ? bindingLabelSlugs : undefined,
      })
      resetForm()
      onCreated?.()
      toast.success(t('suites.createSuccessTitle'), t('suites.createSuccessDescription', { suite: result.displayName }))
      navigate({
        to: `/suites/${result.namespace}/${encodeURIComponent(result.slug)}`,
        search: { returnTo: '/dashboard/publish?tab=suite' },
      })
    } catch (error) {
      toast.error(
        t('suites.createErrorTitle'),
        error instanceof ApiError ? error.serverMessage || error.message : error instanceof Error ? error.message : undefined,
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-semibold font-heading">{t('suites.namespaceLabel')}</Label>
        <Select
          value={normalizeSelectValue(namespaceSlug)}
          onValueChange={(nextNamespace) => {
            setNamespaceSlug(nextNamespace)
            setSelectedSkills([])
          }}
        >
          <SelectTrigger className={SELECT_TRIGGER_CLASS_NAME}>
            <SelectValue placeholder={t('suites.namespacePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {namespaces?.map((ns) => (
              <SelectItem key={ns.slug} value={ns.slug}>
                {ns.displayName} (@{ns.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="suitePublisherName" className="text-sm font-semibold font-heading">{t('publish.publisherName')}</Label>
        <Input
          id="suitePublisherName"
          type="text"
          value={publisherName}
          onChange={(e) => setPublisherName(e.target.value)}
          placeholder={t('publish.publisherNamePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="suiteDepartment" className="text-sm font-semibold font-heading">{t('publish.department')}</Label>
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
                id="suiteDepartment"
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

      <div className="space-y-2">
        <Label className="text-sm font-semibold font-heading">{t('suites.displayNameLabel')}</Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={200}
          placeholder={t('suites.displayNamePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold font-heading">{t('suites.summaryLabel')}</Label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
          maxLength={500}
          rows={2}
          placeholder={t('suites.summaryPlaceholder')}
          className="min-h-20 bg-white"
        />
      </div>


      <div className="space-y-2">
        <Label className="text-sm font-semibold font-heading">{t('suites.labelsLabel')}</Label>
        <HierarchicalLabelMultiSelect
          id="suiteLabels"
          labels={selectableLabels}
          selectedPrimarySlug={selectedPrimaryLabelSlug}
          selectedSlugs={selectedLabelSlugs}
          onPrimaryChange={setSelectedPrimaryLabelSlug}
          onChange={setSelectedLabelSlugs}
          maxCount={MAX_LABELS}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold font-heading">{t('suites.skillsLabel')}</Label>
        <SuiteSkillPicker selected={selectedSkills} onChange={setSelectedSkills} maxCount={MAX_SKILLS} namespace={namespaceSlug || undefined} />
      </div>

      <div className={actionsClassName ?? 'flex justify-end gap-2'}>
        {cancelAction}
        <Button
          className={fullWidthSubmit ? 'w-full text-primary-foreground disabled:text-primary-foreground' : undefined}
          size={fullWidthSubmit ? 'lg' : 'default'}
          onClick={handleSubmit}
          disabled={!isFormValid || createMutation.isPending}
        >
          {createMutation.isPending ? t('suites.creating') : t('suites.createSubmit')}
        </Button>
      </div>
    </div>
  )
}

