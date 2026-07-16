import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { APP_SHELL_PAGE_CLASS_NAME } from '@/app/page-shell-style'
import { Button } from '@/shared/ui/button'
import { MySkillsPage } from './dashboard/my-skills'
import { MySuitesPage } from './dashboard/my-suites'

/**
 * My assets hub: lets the user switch between their skills and expert suites.
 */
export function MyAssetsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('skills')

  const handlePublishClick = () => {
    if (activeTab === 'suites') {
      navigate({ to: '/dashboard/publish', search: { tab: 'suite' } })
      return
    }
    navigate({ to: '/dashboard/publish' })
  }

  return (
    <div className={APP_SHELL_PAGE_CLASS_NAME}>
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">{t('myAssets.title')}</h1>
        <p className="text-muted-foreground text-lg">{t('myAssets.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="skills">{t('myAssets.tabs.skills')}</TabsTrigger>
            <TabsTrigger value="suites">{t('myAssets.tabs.suites')}</TabsTrigger>
          </TabsList>
          <Button size="lg" className="w-full sm:w-auto" onClick={handlePublishClick}>
            {activeTab === 'suites' ? t('publish.publishSuite') : t('mySkills.publishNew')}
          </Button>
        </div>
        <TabsContent value="skills" className="pt-4">
          <MySkillsPage />
        </TabsContent>
        <TabsContent value="suites" className="pt-4">
          <MySuitesPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}